import { ExtensionEnv } from './types'

/**
 * Detects the current execution environment
 */
export function getExtensionEnv(): ExtensionEnv {
  // 1. Background Service Worker (Manifest V3)
  // Service Workers run in a 'ServiceWorkerGlobalScope' and have no 'window' object.
  if (typeof window === 'undefined') {
    return ExtensionEnv.Background
  }

  // 2. Content Script
  // Content scripts have access to a very limited subset of chrome APIs.
  // They cannot access 'chrome.tabs', which is available to internal extension pages.
  if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.tabs) {
    return ExtensionEnv.ContentScript
  }

  // 3. Extension Pages (Popup, Options, SidePanel)
  // These run on the 'chrome-extension://' protocol and have a full DOM/window.
  if (window.location.protocol === 'chrome-extension:') {
    return ExtensionEnv.ExtensionPage
  }

  // Fallback for non-extension contexts (e.g., standard web page)
  return ExtensionEnv.ContentScript
}

const EventSymbol = 'event-relay'
export const relayPort = {
  data: { name: EventSymbol },
  checkIsRelayPort: (port: chrome.runtime.Port) => port.name === relayPort.data.name,
}
