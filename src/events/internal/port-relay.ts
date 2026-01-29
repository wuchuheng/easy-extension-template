/**
 * Port relay service for ep2cs (extension page to content script).
 * Manages long-lived port connections and message aggregation.
 */

import type { PortMessageFormat, PortResponseFormat } from '../types'
import { log, logWarn, Scope } from '../logger'

declare global {
  var ep2csPorts: Map<string, chrome.runtime.Port[]>
  var ep2csPendingRequests: Map<string, PendingRequest>
}

type PendingRequest = {
  resolve: (responses: unknown[]) => void
  responses: unknown[]
  expectedCount: number
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
 */
export function initializeRelayStorage(): void {
  if (!globalThis.ep2csPorts) {
    globalThis.ep2csPorts = new Map()
  }
  if (!globalThis.ep2csPendingRequests) {
    globalThis.ep2csPendingRequests = new Map()
  }
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
 */
export function handleExtensionPageConnection(port: chrome.runtime.Port, eventName: string): void {
  log(Scope.BACKGROUND, `[relayService] Extension page dispatch for event: ${eventName}`)

  port.onMessage.addListener((msg: PortMessageFormat<unknown>) => {
    const { msgId } = msg

    log(
      Scope.BACKGROUND,
      `[relayService] Dispatching msgId: ${msgId} to ${globalThis.ep2csPorts.get(eventName)?.length ?? 0} content scripts`
    )

    const csPorts = globalThis.ep2csPorts.get(eventName) || []

    // No content scripts connected - return empty array
    if (csPorts.length === 0) {
      const response: PortResponseFormat<unknown[]> = { msgId, data: [] }
      port.postMessage(response)
      return
    }

    // Store pending request for aggregation
    globalThis.ep2csPendingRequests.set(msgId, {
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
 */
export function handleContentScriptConnection(port: chrome.runtime.Port, eventName: string): void {
  log(Scope.BACKGROUND, `[relayService] Content script connected for event: ${eventName}`)

  // Add port to event group
  if (!globalThis.ep2csPorts.has(eventName)) {
    globalThis.ep2csPorts.set(eventName, [])
  }
  const ports = globalThis.ep2csPorts.get(eventName)!
  ports.push(port)

  // Handle responses from content script
  port.onMessage.addListener((msg: PortResponseFormat<unknown>) => {
    const { msgId, data, error } = msg

    log(Scope.BACKGROUND, `[relayService] Received response for msgId: ${msgId}`)

    const pending = globalThis.ep2csPendingRequests.get(msgId)
    if (!pending) {
      logWarn(Scope.BACKGROUND, `[relayService] No pending request for msgId: ${msgId}`)
      return
    }

    pending.responses.push(error ? { error } : { data })

    // Check if all responses received
    if (pending.responses.length === pending.expectedCount) {
      log(Scope.BACKGROUND, `[relayService] All responses received for msgId: ${msgId}`)
      pending.resolve(pending.responses)
      globalThis.ep2csPendingRequests.delete(msgId)
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
      globalThis.ep2csPorts.delete(eventName)
    }
  })
}
