const OFFSCREEN_PATH = 'src/offscreen/index.html'

const OFFSCREEN_CONFIG = {
  reasons: [chrome.offscreen.Reason.LOCAL_STORAGE, chrome.offscreen.Reason.WORKERS],
  justification: 'Database storage (SQLite) and WASM execution for log management',
}

/**
 * Creates the offscreen document if it doesn't already exist.
 */
async function createOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) {
    return
  }

  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL(OFFSCREEN_PATH),
    ...OFFSCREEN_CONFIG,
  })
}

/**
 * Initializes the offscreen document with error handling and retry logic.
 */
async function initializeOffscreen() {
  try {
    await createOffscreenDocument()
    console.log('[background] Offscreen document initialized.')
  } catch (error) {
    console.error('[background] Failed to initialize offscreen document:', error)

    // Retry logic for development environment where dev server might be warming up
    if (import.meta.env.DEV) {
      console.log('[background] Retrying initialization in 2s...')
      setTimeout(initializeOffscreen, 2000)
    }
  }
}

// Start initialization
if (import.meta.env.DEV) {
  // Add a small delay in dev mode to allow the dev server to start
  console.log('[background] Waiting for dev server...')
  setTimeout(initializeOffscreen, 1000)
} else {
  initializeOffscreen()
}
