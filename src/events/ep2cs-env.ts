/**
 * Ep2cs environment detection utilities.
 *
 * Keeps environment probing isolated and testable by allowing injection.
 */

export type Ep2csEnv = {
  chrome?: { runtime?: unknown; tabs?: unknown }
  window?: { location?: { origin?: string; protocol?: string } }
}

export type Ep2csContextSnapshot = {
  hasChromeRuntime: boolean
  hasChromeTabs: boolean
  hasWindow: boolean
  isExtensionContext: boolean
  isContentScript: boolean
  locationOrigin: string | null
  locationProtocol: string | null
}

export function getEp2csContextSnapshot(env?: Ep2csEnv): Ep2csContextSnapshot {
  const resolved = resolveEnv(env)
  const hasChromeRuntime = !!resolved.chrome?.runtime
  const hasChromeTabs = !!resolved.chrome?.tabs
  const hasWindow = !!resolved.window
  const locationOrigin = resolved.window?.location?.origin ?? null
  const locationProtocol = resolved.window?.location?.protocol ?? null
  const isExtensionContext = isExtensionOrigin(locationOrigin, locationProtocol)
  const isContentScript = hasChromeRuntime && !hasChromeTabs && hasWindow && !isExtensionContext

  return {
    hasChromeRuntime,
    hasChromeTabs,
    hasWindow,
    isExtensionContext,
    isContentScript,
    locationOrigin,
    locationProtocol,
  }
}

export function hasChromeRuntime(env?: Ep2csEnv): boolean {
  return !!resolveEnv(env).chrome?.runtime
}

export function isContentScriptContext(env?: Ep2csEnv): boolean {
  const ctx = getEp2csContextSnapshot(env)
  return ctx.isContentScript
}

function isExtensionOrigin(origin: string | null, protocol: string | null): boolean {
  if (origin && origin.startsWith('chrome-extension://')) return true
  if (protocol && protocol.startsWith('chrome-extension:')) return true
  return false
}

function resolveEnv(env?: Ep2csEnv): Ep2csEnv {
  if (env) return env

  const hasChrome = typeof chrome !== 'undefined'
  const hasWindow = typeof window !== 'undefined'

  return {
    chrome: hasChrome ? chrome : undefined,
    window: hasWindow ? window : undefined,
  }
}
