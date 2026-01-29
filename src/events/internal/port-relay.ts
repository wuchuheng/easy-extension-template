/**
 * Port relay service for ep2cs (extension page to content script).
 * Manages long-lived port connections and message aggregation.
 */

import type { PortMessageFormat, PortResponseFormat } from '../types'
import { log, logWarn, Scope } from '../logger'
import { getGlobalStorage } from './global-storage'

declare global {
  var ep2csPorts: Map<string, chrome.runtime.Port[]>
  var ep2csPendingRequests: Map<string, PendingRequest>
}

/**
 * Represents a pending request that aggregates responses from multiple content scripts.
 */
export type PendingRequest = {
  /** Resolve function to call when all responses are received */
  resolve: (responses: unknown[]) => void
  /** Accumulated responses from content scripts */
  responses: unknown[]
  /** Expected number of responses (equals number of connected content scripts) */
  expectedCount: number
}

const EP2CS_PORTS_KEY = 'ep2csPorts'
const EP2CS_PENDING_REQUESTS_KEY = 'ep2csPendingRequests'

/**
 * Gets the map of event name to connected content script ports.
 */
function getEp2csPorts(): Map<string, chrome.runtime.Port[]> {
  return getGlobalStorage(EP2CS_PORTS_KEY, () => new Map())
}

/**
 * Gets the map of pending requests waiting for aggregation.
 */
function getEp2csPendingRequests(): Map<string, PendingRequest> {
  return getGlobalStorage(EP2CS_PENDING_REQUESTS_KEY, () => new Map())
}

/**
 * Generates a unique message ID for ep2cs requests.
 */
export function generateMsgId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Extracts event name from port connection name.
 * Port names follow the pattern: "ep2cs:<event name>"
 */
export function extractEventName(portName: string): string | null {
  if (!portName.startsWith('ep2cs:')) {
    return null
  }
  return portName.replace('ep2cs:', '')
}

/**
 * Initializes global storage for ports and pending requests.
 * This function is idempotent and safe to call multiple times.
 */
export function initializeRelayStorage(): void {
  // The getGlobalStorage utility handles initialization
  getEp2csPorts()
  getEp2csPendingRequests()
}

/**
 * Checks if a port sender is from an extension page.
 */
export function isExtensionPage(port: chrome.runtime.Port): boolean {
  return port.sender?.url?.startsWith('chrome-extension://') ?? false
}

/**
 * Checks if a port sender is from a content script.
 */
export function isContentScript(port: chrome.runtime.Port): boolean {
  return port.sender?.tab?.id !== undefined && !isExtensionPage(port)
}

/**
 * Handles extension page connection for ep2cs relay.
 * Extension pages send one-time requests to be relayed to all content scripts.
 *
 * @param port - The port from the extension page
 * @param eventName - The name of the event being relayed
 */
export function handleExtensionPageConnection(port: chrome.runtime.Port, eventName: string): void {
  log(Scope.BACKGROUND, `[relayService] Extension page dispatch for event: ${eventName}`)

  port.onMessage.addListener((msg: PortMessageFormat<unknown>) => {
    const { msgId } = msg

    const ep2csPorts = getEp2csPorts()
    const ep2csPendingRequests = getEp2csPendingRequests()

    log(
      Scope.BACKGROUND,
      `[relayService] Dispatching msgId: ${msgId} to ${ep2csPorts.get(eventName)?.length ?? 0} content scripts`
    )

    const csPorts = ep2csPorts.get(eventName) || []

    // No content scripts connected - return empty array
    if (csPorts.length === 0) {
      const response: PortResponseFormat<unknown[]> = { msgId, data: [] }
      port.postMessage(response)
      return
    }

    // Store pending request for aggregation
    ep2csPendingRequests.set(msgId, {
      resolve: (responses) => {
        const response: PortResponseFormat<unknown[]> = { msgId, data: responses as unknown[] }
        port.postMessage(response)
      },
      responses: [],
      expectedCount: csPorts.length,
    })

    // Relay message to all content scripts
    for (const csPort of csPorts) {
      try {
        csPort.postMessage(msg)
      } catch (err) {
        logWarn(Scope.BACKGROUND, `[relayService] Failed to send to content script: ${err}`)
      }
    }
  })

  port.onDisconnect.addListener(() => {
    log(Scope.BACKGROUND, `[relayService] Extension page disconnected for event: ${eventName}`)
  })
}

/**
 * Handles content script connection for ep2cs relay.
 * Content scripts maintain long-lived connections to receive messages.
 *
 * @param port - The port from the content script
 * @param eventName - The name of the event being listened to
 */
export function handleContentScriptConnection(port: chrome.runtime.Port, eventName: string): void {
  log(Scope.BACKGROUND, `[relayService] Content script connected for event: ${eventName}`)

  const ep2csPorts = getEp2csPorts()
  const ep2csPendingRequests = getEp2csPendingRequests()

  // Add port to event group
  if (!ep2csPorts.has(eventName)) {
    ep2csPorts.set(eventName, [])
  }
  const ports = ep2csPorts.get(eventName)!
  ports.push(port)

  // Handle responses from content script
  port.onMessage.addListener((msg: PortResponseFormat<unknown>) => {
    const { msgId, data, error } = msg

    log(Scope.BACKGROUND, `[relayService] Received response for msgId: ${msgId}`)

    const pending = ep2csPendingRequests.get(msgId)
    if (!pending) {
      logWarn(Scope.BACKGROUND, `[relayService] No pending request for msgId: ${msgId}`)
      return
    }

    pending.responses.push(error ? { error } : { data })

    // Check if all responses received
    if (pending.responses.length === pending.expectedCount) {
      log(Scope.BACKGROUND, `[relayService] All responses received for msgId: ${msgId}`)
      pending.resolve(pending.responses)
      ep2csPendingRequests.delete(msgId)
    }
  })

  // Handle port disconnection
  port.onDisconnect.addListener(() => {
    log(Scope.BACKGROUND, `[relayService] Content script disconnected from event: ${eventName}`)
    const index = ports.indexOf(port)
    if (index !== -1) {
      ports.splice(index, 1)
    }
    if (ports.length === 0) {
      ep2csPorts.delete(eventName)
    }
  })
}
