import { log, logWarn, Scope } from '../logger'

type CallBack<Args, Return> = (args: Args) => Promise<Return>
type Cancel = () => void

type OneToOneEvent<Args, Return> = {
  dispatch: (args: Args) => Promise<Return>
  handle: (callback: CallBack<Args, Return>) => Cancel
}

// Special event type for bg2cs which requires tabId
type Bg2CsEvent<Args, Return> = {
  dispatch: (argsAndTabId: (Args & { tabId: number }) | [Args, number]) => Promise<Return>
  handle: (callback: CallBack<Args, Return>) => Cancel
}

type MessageFormat<Args, Return> = {
  event: string
  args: Args
  response?: {
    success: boolean
    data?: Return
    error?: {
      message: string
      stack: string
    }
  }
}

// Port-based response format for ep2cs relay
type PortResponseFormat<Return> = {
  msgId: string
  data?: Return
  error?: {
    message: string
    stack: string
  }
}

// Port-based message format for ep2cs relay (request from extension page)
type PortMessageFormat<Args> = {
  msgId: string
  event: string
  args: Args
}

declare global {
  var bg2bgCallBack: Map<string, Map<number, (args: unknown) => Promise<unknown>>>
  var ep2csPorts: Map<string, chrome.runtime.Port[]>
  var ep2csPendingRequests: Map<
    string,
    { resolve: (value: unknown[]) => void; responses: unknown[]; expectedCount: number }
  >
}

let id = 0
const getNextId = () => {
  return ++id
}

/**
 * Background to background event (one-to-one).
 *
 * Internal event bus for background script modules to communicate with each other.
 *
 * @param name - Event name
 * @returns OneToOneEvent
 *
 * @example
 * ```ts
 * const event = bg2bg<string, void>('storage:updated')
 * event.handle(async (arg) => {
 *   log(Scope.BACKGROUND, 'Storage updated:', arg)
 * })
 * await event.dispatch('key changed')
 * ```
 */
export const bg2bg = <Args = void, Return = void>(name: string): OneToOneEvent<Args, Return> => {
  return {
    dispatch: async (args: Args) => {
      const callbackMap = globalThis.bg2bgCallBack.get(name)!
      // Get the first callback since this is one-to-one
      const callbacks = Array.from(callbackMap.values())
      if (callbacks.length === 0) {
        throw new Error(`No handler registered for event: ${name}`)
      }
      const result = await callbacks[0](args)
      return result as Return
    },
    handle: (callback: CallBack<Args, Return>) => {
      if (!globalThis.bg2bgCallBack) {
        globalThis.bg2bgCallBack = new Map()
      }

      if (!globalThis.bg2bgCallBack.has(name)) {
        globalThis.bg2bgCallBack.set(name, new Map())
      }
      const id = getNextId()
      const callbackMap = globalThis.bg2bgCallBack.get(name)!
      callbackMap.set(id, callback as (args: unknown) => Promise<unknown>)

      return () => {
        callbackMap.delete(id)
      }
    },
  }
}

/**
 * Background to content script event (one-to-one).
 *
 * Sends messages to a specific tab's content script.
 *
 * @param name - Event name
 * @returns OneToOneEvent
 *
 * @example
 * ```ts
 * const event = bg2cs<number, void>('refresh')
 * await event.dispatch(tabId, 42)
 *
 * // In content script
 * event.handle(async (arg) => {
 *   console.log('Received:', arg)
 * })
 * ```
 */
export const bg2cs = <Args = void, Return = void>(name: string): Bg2CsEvent<Args, Return> => {
  return {
    dispatch: async (argsAndTabId: (Args & { tabId?: number }) | [Args, number]) => {
      // Handle both tuple syntax [args, tabId] and object syntax { tabId, ...args }
      let args: Args
      let tabId: number

      if (Array.isArray(argsAndTabId) && argsAndTabId.length === 2) {
        ;[args, tabId] = argsAndTabId as [Args, number]
      } else {
        const obj = argsAndTabId as { tabId?: number } & Args
        tabId = obj.tabId!

        const { tabId: _, ...rest } = obj
        args = rest as Args
      }

      if (tabId === undefined) {
        throw new Error('tabId is required for bg2cs')
      }

      const msg: MessageFormat<Args, Return> = {
        event: name,
        args,
      }
      const result = (await chrome.tabs.sendMessage(tabId, msg)) as MessageFormat<
        Args,
        Return
      >['response']

      if (!result?.success) {
        throw new Error(result?.error?.message || 'Unknown error')
      }

      return result.data as Return
    },
    handle: (callback: CallBack<Args, Return>) => {
      const listenCallback = (
        request: MessageFormat<Args, Return>,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: MessageFormat<Args, Return>['response']) => void
      ) => {
        if (request.event !== name) {
          return false
        }

        callback(request.args)
          .then((result) => {
            sendResponse({
              success: true,
              data: result,
            })
          })
          .catch((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            sendResponse({
              success: false,
              error: {
                message: errorMessage,
                stack: error instanceof Error ? error.stack || '' : '',
              },
            })
          })

        return true
      }

      chrome.runtime.onMessage.addListener(listenCallback)

      return () => {
        chrome.runtime.onMessage.removeListener(listenCallback)
      }
    },
  }
}

/**
 * Background to extension page event (one-to-one).
 *
 * Sends messages to extension pages (popup, options, sidepanel).
 *
 * @param name - Event name
 * @returns OneToOneEvent
 *
 * @example
 * ```ts
 * const event = bg2ep<number, void>('badge:update')
 * await event.dispatch(5)
 *
 * // In extension page
 * event.handle(async (arg) => {
 *   console.log('Badge count:', arg)
 * })
 * ```
 */
export const bg2ep = <Args = void, Return = void>(name: string): OneToOneEvent<Args, Return> => {
  return {
    dispatch: async (args: Args) => {
      const msg: MessageFormat<Args, Return> = {
        event: name,
        args,
      }
      const result = (await chrome.runtime.sendMessage(msg)) as MessageFormat<
        Args,
        Return
      >['response']

      if (!result?.success) {
        throw new Error(result?.error?.message || 'Unknown error')
      }

      return result.data as Return
    },
    handle: (callback: CallBack<Args, Return>) => {
      const listenCallback = (
        request: MessageFormat<Args, Return>,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response: MessageFormat<Args, Return>['response']) => void
      ) => {
        // Only respond if sender is from an extension page
        if (!sender.origin?.startsWith('chrome-extension://')) {
          return false
        }

        if (request.event !== name) {
          return false
        }

        callback(request.args)
          .then((result) => {
            sendResponse({
              success: true,
              data: result,
            })
          })
          .catch((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            sendResponse({
              success: false,
              error: {
                message: errorMessage,
                stack: error instanceof Error ? error.stack || '' : '',
              },
            })
          })

        return true
      }

      chrome.runtime.onMessage.addListener(listenCallback)

      return () => {
        chrome.runtime.onMessage.removeListener(listenCallback)
      }
    },
  }
}

/**
 * Relay service for ep2cs (extension page to content script).
 *
 * Manages long-lived port connections between content scripts and background,
 * relaying messages from extension pages to all connected content scripts.
 *
 * This function should be called once when the background script initializes.
 *
 * @example
 * ```ts
 * // In background/index.ts
 * import { relayService } from '@/events/background/background'
 * relayService()
 * ```
 */
export const relayService = () => {
  // Initialize port storage
  if (!globalThis.ep2csPorts) {
    globalThis.ep2csPorts = new Map()
  }
  if (!globalThis.ep2csPendingRequests) {
    globalThis.ep2csPendingRequests = new Map()
  }

  // Listen for incoming connections (from both extension pages and content scripts)
  chrome.runtime.onConnect.addListener((port) => {
    const portName = port.name

    // Validate connection name matches ep2cs:<event name> pattern
    if (!portName.startsWith('ep2cs:')) {
      return
    }

    const eventName = portName.replace('ep2cs:', '')

    log(Scope.BACKGROUND, `[relayService] Port connected for event: ${eventName}`)

    // Determine if this is a content script or extension page by checking sender
    const sender = port.sender
    const isExtensionPage = sender?.url?.startsWith('chrome-extension://')
    const isContentScript = sender?.tab?.id !== undefined && !isExtensionPage

    // Handle extension page dispatch (one-time port for a single request)
    if (isExtensionPage) {
      log(Scope.BACKGROUND, `[relayService] Extension page dispatch for event: ${eventName}`)

      // Listen for the dispatch message from extension page
      port.onMessage.addListener((msg: PortMessageFormat<unknown>) => {
        const { msgId } = msg

        log(
          Scope.BACKGROUND,
          `[relayService] Dispatching msgId: ${msgId} to ${globalThis.ep2csPorts.get(eventName)?.length || 0} content scripts`
        )

        // Get all content script ports for this event
        const csPorts = globalThis.ep2csPorts.get(eventName) || []

        if (csPorts.length === 0) {
          // No content scripts connected, return empty array
          const response: PortResponseFormat<unknown[]> = {
            msgId,
            data: [],
          }
          port.postMessage(response)
          return
        }

        // Store pending request
        globalThis.ep2csPendingRequests.set(msgId, {
          resolve: (responses) => {
            const response: PortResponseFormat<unknown[]> = {
              msgId,
              data: responses as unknown[],
            }
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

      // Clean up when extension page disconnects
      port.onDisconnect.addListener(() => {
        log(Scope.BACKGROUND, `[relayService] Extension page disconnected for event: ${eventName}`)
      })

      return
    }

    // Handle content script handler (long-lived connection for receiving messages)
    if (isContentScript) {
      log(Scope.BACKGROUND, `[relayService] Content script connected for event: ${eventName}`)

      // Add port to the event group
      if (!globalThis.ep2csPorts.has(eventName)) {
        globalThis.ep2csPorts.set(eventName, [])
      }
      const ports = globalThis.ep2csPorts.get(eventName)!
      ports.push(port)

      // Handle messages from content scripts (responses)
      port.onMessage.addListener((msg: PortResponseFormat<unknown>) => {
        const { msgId, data, error } = msg

        log(Scope.BACKGROUND, `[relayService] Received response for msgId: ${msgId}`)

        const pending = globalThis.ep2csPendingRequests.get(msgId)
        if (!pending) {
          logWarn(Scope.BACKGROUND, `[relayService] No pending request for msgId: ${msgId}`)
          return
        }

        if (error) {
          pending.responses.push({ error })
        } else {
          pending.responses.push({ data })
        }

        // Check if all responses have been received
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
  })

  log(Scope.BACKGROUND, '[relayService] Service started')
}
