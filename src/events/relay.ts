/**
 * Event Relay System - Core Implementation
 *
 * Provides a broadcast-style event communication system for Chrome extensions.
 * Messages flow: Client → Relay → Handler → Relay → Client
 *
 * @module events/relay
 */

import {
  Role,
  MessageType,
  type EventEnvelope,
  type EventHandlers,
  type EventProxy,
  type EventRegisterOptions,
  type HandlerReturn,
} from './types'

// Re-export enums for convenience
export { Role, MessageType }

/**
 * Timeout for relayAccessed acknowledgment (milliseconds)
 */
const RELAY_ACK_TIMEOUT_MS = 100

/**
 * Prefix for debug logging
 */
const DEBUG_PREFIX = '[EventRelay]'

/**
 * Per-context handler registry.
 * Maps event names to handler functions.
 */
const localHandlers = new Map<string, (...args: unknown[]) => unknown>()

/**
 * Background-only: pending responses awaiting handler execution.
 * Maps message IDs to Promise resolvers and sender info.
 */
const pendingResponses = new Map<
  string,
  {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
    sender: chrome.runtime.MessageSender
  }
>()

/**
 * Detect if running in background service worker context.
 *
 * @returns true if current context is the background service worker
 */
const isBackground = (): boolean => {
  return typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope
}

/**
 * Generate unique message ID for request/response correlation.
 *
 * @returns Unique message ID
 */
const generateId = (): string => {
  return crypto.randomUUID?.() ?? `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Log debug message if debug mode is enabled.
 *
 * @param enabled - Whether debug mode is active
 * @param args - Arguments to log
 */
const debugLog = (enabled: boolean, ...args: unknown[]): void => {
  if (enabled) {
    console.log(DEBUG_PREFIX, ...args)
  }
}

/**
 * 1. Validate background context
 * 2. Create request envelope
 * 3. Send to relay
 * 4. Wait for relayAccessed acknowledgment
 * 5. Wait for response
 * 6. Resolve/reject Promise
 */
const createEventCaller = <T extends (...args: unknown[]) => unknown>(
  eventName: string,
  debug: boolean
): T => {
  return ((...args: unknown[]) => {
    // 1. Generate unique ID for this request
    const id = generateId()

    // 2. Create request envelope
    const request: EventEnvelope = {
      id,
      event: eventName,
      from: Role.Client,
      to: Role.Relay,
      type: MessageType.request,
      args,
    }

    debugLog(debug, 'Sending request:', request)

    // 3. Create Promise for response
    return new Promise((resolve, reject) => {
      // 4. Store pending response
      pendingResponses.set(id, {
        resolve,
        reject,
        sender: null as unknown as chrome.runtime.MessageSender,
      })

      // 5. Send request to relay
      chrome.runtime.sendMessage(request).catch((error) => {
        // Connection error (relay not available)
        pendingResponses.delete(id)
        reject(
          new Error(
            `Failed to send request to relay: ${error instanceof Error ? error.message : String(error)}`
          )
        )
      })

      // 6. Set up relayAccessed timeout
      const timeoutId = setTimeout(() => {
        if (pendingResponses.has(id)) {
          pendingResponses.delete(id)
          reject(new Error('RELAY_TIMEOUT: Relay did not acknowledge within 100ms'))
        }
      }, RELAY_ACK_TIMEOUT_MS)

      // 7. Override resolve to clear timeout
      const originalResolve = resolve
      resolve = ((value: unknown) => {
        clearTimeout(timeoutId)
        originalResolve(value)
      }) as typeof resolve
    })
  }) as T
}

/**
 * Registers the handler listener in the current context.
 * Listens for broadcast messages from relay and executes matching handlers.
 *
 * @param debug - Whether to enable debug logging
 */
const registerHandlerListener = (debug: boolean): void => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const envelope = message as EventEnvelope

    // Filter: only handle messages destined for handlers
    if (envelope.to !== Role.Handler) {
      return false
    }

    // Filter: check if we have a handler for this event
    const handler = localHandlers.get(envelope.event)
    if (!handler) {
      return false
    }

    debugLog(debug, `Handler executing for event: ${envelope.event}`)

    // Execute handler with error handling
    Promise.resolve()
      .then(() => handler(...(envelope.args ?? [])))
      .then((result) => {
        // Success response
        const response: EventEnvelope = {
          id: envelope.id,
          event: envelope.event,
          from: Role.Handler,
          to: Role.Relay,
          type: MessageType.response,
          response: {
            success: true,
            data: result,
          },
        }
        sendResponse(response)
      })
      .catch((error) => {
        // Error response
        const response: EventEnvelope = {
          id: envelope.id,
          event: envelope.event,
          from: Role.Handler,
          to: Role.Relay,
          type: MessageType.response,
          response: {
            success: false,
            error: {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
          },
        }
        sendResponse(response)
      })

    return true // Async response
  })
}

/**
 * Creates an event register with typed handlers and client proxy.
 *
 * This function sets up the event relay system by:
 * 1. Storing handlers in a local registry
 * 2. Creating a typed event proxy for calling events
 * 3. Returning a relayCenter initializer (for background only)
 * 4. Registering a handler listener (in all contexts)
 *
 * @template Handlers - Event handlers record type
 * @param handlers - Object mapping event names to handler functions
 * @param options - Optional configuration (debug mode)
 * @returns Object with relayCenter initializer and events proxy
 *
 * @example
 * ```ts
 * // Define handlers
 * const { relayCenter, events } = createEventRegister({
 *   greeting: async (name: string): Promise<string> => {
 *     return `Hello, ${name}!`;
 *   },
 *   notify: async (message: string): Promise<void> => {
 *     console.log('[Notification]', message);
 *   },
 * });
 *
 * // In background service worker ONLY
 * relayCenter();
 *
 * // In any context (popup, options, content script, etc.)
 * const result = await events.greeting('Alice'); // "Hello, Alice!"
 * await events.notify('Test message'); // void
 * ```
 */
export function createEventRegister<Handlers extends EventHandlers>(
  handlers: Handlers,
  options?: EventRegisterOptions
): {
  relayCenter: () => void
  events: EventProxy<Handlers>
} {
  const debug = options?.debug ?? false

  debugLog(debug, 'Initializing event register with events:', Object.keys(handlers))

  // 1. Store handlers in local registry
  for (const [eventName, handler] of Object.entries(handlers)) {
    localHandlers.set(eventName, handler)
    debugLog(debug, `Registered handler for event: ${eventName}`)
  }

  // 2. Create event proxy object with typed methods
  const events = {} as EventProxy<Handlers>

  for (const eventName of Object.keys(handlers)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(events as any)[eventName] = createEventCaller(eventName, debug) as HandlerReturn<
      Handlers[typeof eventName]
    >
  }

  // 3. Create relayCenter function (background only)
  const relayCenter = (): void => {
    if (!isBackground()) {
      throw new Error('relayCenter() must be called in background service worker context')
    }

    debugLog(debug, 'Initializing relay center in background')

    // 4. Register chrome.runtime.onMessage listener for routing
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const envelope = message as EventEnvelope

      // Only handle messages destined for relay
      if (envelope.to !== Role.Relay) {
        return false
      }

      debugLog(debug, 'Relay received message:', envelope)

      // Handle request from client
      if (envelope.type === MessageType.request) {
        // 1. Send relayAccessed acknowledgment
        const relayAccessed: EventEnvelope = {
          id: envelope.id,
          event: envelope.event,
          from: Role.Relay,
          to: Role.Client,
          type: MessageType.relayAccessed,
        }

        try {
          sendResponse(relayAccessed)
        } catch (e) {
          // Message channel closed, ignore
          debugLog(debug, 'Failed to send relayAccessed:', e)
          return false
        }

        // 2. Update envelope for broadcast to handlers
        const broadcast: EventEnvelope = {
          id: envelope.id,
          event: envelope.event,
          from: Role.Relay,
          to: Role.Handler,
          type: MessageType.request,
          args: envelope.args,
        }

        // 3. Store pending response (override sender)
        const pending = pendingResponses.get(envelope.id)
        if (pending) {
          pending.sender = sender
        }

        // 4. Broadcast to all contexts
        chrome.runtime.sendMessage(broadcast).catch((e) => {
          debugLog(debug, 'Broadcast failed:', e)
        })

        return false
      }

      // Handle response from handler
      if (envelope.type === MessageType.response) {
        const pending = pendingResponses.get(envelope.id)
        if (!pending) {
          debugLog(debug, `No pending response for ID: ${envelope.id}`)
          return false
        }

        // Route response back to original client
        const response: EventEnvelope = {
          id: envelope.id,
          event: envelope.event,
          from: Role.Relay,
          to: Role.Client,
          type: MessageType.response,
          response: envelope.response,
        }

        try {
          if (pending.sender.tab?.id) {
            // Send to specific tab
            chrome.tabs.sendMessage(pending.sender.tab.id!, response).catch((e) => {
              debugLog(debug, 'Failed to send response to tab:', e)
            })
          } else {
            // Send to extension context
            chrome.runtime.sendMessage(response).catch((e) => {
              debugLog(debug, 'Failed to send response:', e)
            })
          }
        } catch (e) {
          debugLog(debug, 'Failed to route response:', e)
        }

        // Resolve the original promise
        if (response.response?.success) {
          pending.resolve(response.response.data)
        } else {
          pending.reject(new Error(response.response?.error?.message ?? 'Unknown error'))
        }

        pendingResponses.delete(envelope.id)
        return false
      }

      return false
    })
  }

  // 5. Register handler listener in all contexts
  registerHandlerListener(debug)

  return { relayCenter, events }
}
