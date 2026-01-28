interface Target {
  id: string
  type: string
  title: string
  url: string
  webSocketDebuggerUrl?: string
}

interface Command {
  id: number
  method: string
  params?: Record<string, unknown>
}

const PORT = 9222
const HOST = 'localhost'
const JSON_URL = `http://${HOST}:${PORT}/json`

async function getTargets(): Promise<Target[]> {
  try {
    const res = await fetch(JSON_URL)
    if (!res.ok) throw new Error(`Failed to fetch targets: ${res.statusText}`)
    return (await res.json()) as Target[]
  } catch {
    console.error(`❌ Could not connect to Chromium at ${JSON_URL}`)
    console.error(`   Is Chromium running with --remote-debugging-port=${PORT}?`)
    process.exit(1)
  }
}

async function sendCommand(
  wsUrl: string,
  command: Command,
  expectDisconnect = false
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    let resolved = false

    const safeResolve = (val: unknown) => {
      if (!resolved) {
        resolved = true
        resolve(val)
      }
    }

    ws.onopen = () => {
      ws.send(JSON.stringify(command))
      if (expectDisconnect) {
        // For extension reload, the connection might drop immediately.
        // We wait a bit and assume success if no error occurred immediately.
        setTimeout(() => {
          ws.close()
          safeResolve({ status: 'sent (assumed success)' })
        }, 500)
      }
    }

    ws.onmessage = (event) => {
      if (!expectDisconnect) {
        ws.close()
        safeResolve(JSON.parse(event.data as string))
      }
    }

    ws.onerror = (error) => {
      if (expectDisconnect) {
        // Error is expected if the target dies immediately
        safeResolve({ status: 'error_but_expected' })
      } else {
        if (!resolved) reject(error)
      }
    }

    ws.onclose = () => {
      if (expectDisconnect) {
        safeResolve({ status: 'closed_as_expected' })
      } else {
        safeResolve({ status: 'closed' })
      }
    }
  })
}

async function main() {
  console.log(`🔍 Fetching targets from ${JSON_URL}...`)
  const targets = await getTargets()

  // 1. Reload Extensions
  const extensions = targets.filter(
    (t) => t.url.startsWith('chrome-extension://') && t.webSocketDebuggerUrl
  )

  // Helper for fallback reload
  const fallbackReload = async (exts: Target[]) => {
    if (exts.length === 0) {
      console.log('⚠️ No active extension targets found.')
    } else {
      console.log(`🔄 Fallback: Found ${exts.length} extension target(s). Reloading...`)
      for (const ext of exts) {
        console.log(`   -> Target: ${ext.title} (${ext.url})`)
        try {
          if (ext.webSocketDebuggerUrl) {
            await sendCommand(
              ext.webSocketDebuggerUrl,
              {
                id: 1,
                method: 'Runtime.evaluate',
                params: { expression: 'chrome.runtime.reload()' },
              },
              true
            )
          }
        } catch (e: unknown) {
          console.error(`   ❌ Failed to reload extension ${ext.id}:`, (e as Error).message)
        }
      }
      console.log('✅ Extension reload commands sent.')
    }
  }

  // 1a. Try Reload via chrome://extensions/ (developerPrivate)
  // This is more reliable than chrome.runtime.reload() which might fail in offscreen docs

  // Extract ID from any extension target
  const extensionTarget = extensions.find((t) => t.url.startsWith('chrome-extension://'))
  let extensionId: string | null = null

  if (extensionTarget) {
    const match = extensionTarget.url.match(/chrome-extension:\/\/([^/]+)/)
    if (match) {
      extensionId = match[1]
      console.log(`🆔 Found Extension ID: ${extensionId}`)
    }
  }

  if (extensionId) {
    // Find chrome://extensions/ page
    const extensionsPage = targets.find((t) => t.url === 'chrome://extensions/')

    if (extensionsPage && extensionsPage.webSocketDebuggerUrl) {
      console.log(`🔄 Reloading via chrome://extensions/ page...`)
      try {
        await sendCommand(extensionsPage.webSocketDebuggerUrl, {
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `chrome.developerPrivate.reload("${extensionId}", {failQuietly: true})`,
            awaitPromise: true,
          },
        })
        console.log('✅ Extension reload command sent via developerPrivate.')
      } catch (e: unknown) {
        console.error('   ❌ Failed to reload via developerPrivate:', (e as Error).message)
        await fallbackReload(extensions)
      }
    } else {
      console.log("⚠️ 'chrome://extensions/' page not found. Trying fallback method...")
      await fallbackReload(extensions)
    }
  } else {
    console.log('⚠️ Could not determine Extension ID from targets. Trying fallback method...')
    await fallbackReload(extensions)
  }

  // Wait for extension to re-initialize
  await new Promise((r) => setTimeout(r, 1000))

  // 2. Reload Pages
  // Re-fetch targets because they might have changed/disconnected
  const newTargets = await getTargets()
  const pages = newTargets.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl)

  if (pages.length === 0) {
    console.log('⚠️ No open pages found.')
  } else {
    console.log(`🔄 Found ${pages.length} page(s). Refreshing...`)
    for (const page of pages) {
      // console.log(`   -> Refreshing page: ${page.title}`);
      try {
        if (page.webSocketDebuggerUrl) {
          await sendCommand(page.webSocketDebuggerUrl, {
            id: 2,
            method: 'Page.reload',
            params: { ignoreCache: true },
          })
        }
      } catch (e: unknown) {
        console.error(`   ❌ Failed to refresh page ${page.id}:`, (e as Error).message)
      }
    }
    console.log('✅ All pages refreshed.')
  }
}

main()
