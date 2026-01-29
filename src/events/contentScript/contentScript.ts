type CallBack<Args, Return> = (args: Args) => Promise<Return>
type Cancel = () => void

/**
 * One-to-one event type.
 * Used for most event patterns where a single dispatcher communicates with a single handler.
 *
 * @template Args - The arguments type passed to the handler
 * @template Return - The return type from the handler
 */
type OneToOneEvent<Args, Return> = {
  dispatch: (args: Args) => Promise<Return>
  handle: (callback: CallBack<Args, Return>) => Cancel
}

/**
 * One-to-many event type.
 * Used for patterns like ep2cs where a single dispatcher communicates with multiple handlers.
 *
 * @template Args - The arguments type passed to the handlers
 * @template Return - The return type from the handlers (returned as an array)
 */
type OneToManyEvent<Args, Return> = {
  dispatch: (args: Args) => Promise<Return[]>
  handle: (callback: CallBack<Args, Return>) => Cancel
}

declare global {
  var cs2csCallBack: Map<string, Map<number, (args: unknown) => Promise<unknown>>>
}

let id = 0
const getNextId = () => {
  return ++id
}

/**
 * Content script to content script event (one-to-one).
 *
 * @param name - Event name
 * @returns OneToOneEvent
 *
 * @example
 * ```ts
 * const event = cs2cs<string, number>('my-event')
 *
 * // Handle
 * const cancel = event.handle(async (arg) => {
 *   return arg.length
 * })
 *
 * // Dispatch
 * const result = await event.dispatch('hello')
 * // result is number, not number[]
 * ```
 */
export const cs2cs = <Args = void, Return = void>(name: string): OneToOneEvent<Args, Return> => {
  return {
    dispatch: async (args: Args) => {
      const callbackMap = globalThis.cs2csCallBack.get(name)!
      // Get the first callback since this is one-to-one
      const callbacks = Array.from(callbackMap.values())
      if (callbacks.length === 0) {
        throw new Error(`No handler registered for event: ${name}`)
      }
      const result = await callbacks[0](args)
      return result as Return
    },
    handle: (callback: CallBack<Args, Return>) => {
      if (!globalThis.cs2csCallBack) {
        globalThis.cs2csCallBack = new Map()
      }

      if (!globalThis.cs2csCallBack.has(name)) {
        globalThis.cs2csCallBack.set(name, new Map())
      }
      const id = getNextId()
      const callbackMap = globalThis.cs2csCallBack.get(name)!
      callbackMap.set(id, callback as (args: unknown) => Promise<unknown>)

      return () => {
        callbackMap.delete(id)
      }
    },
  }
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

/**
 * Content script to background event (one-to-one).
 *
 * @param name - Event name
 * @returns OneToOneEvent
 *
 * @example
 * ```ts
 * const event = cs2bg<string, string>('test:cs-to-bg')
 *
 * // Handle (in background script)
 * event.handle(async (arg) => {
 *   return 'bg received: ' + arg
 * })
 *
 * // Dispatch (in content script)
 * const result = await event.dispatch('hello')
 * // result is string, not string[]
 * ```
 */
export const cs2bg = <Args = void, Return = void>(name: string): OneToOneEvent<Args, Return> => {
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
 * Content script to extension page event (one-to-one).
 *
 * Allows content scripts to send messages to extension pages (popup, options, sidepanel).
 * The extension page must have a handler registered to respond.
 *
 * @param name - Event name
 * @returns OneToOneEvent
 *
 * @example
 * ```ts
 * // In content script
 * const event = cs2ep<string, void>('notification:show')
 * await event.dispatch('Hello World')
 *
 * // In extension page (popup/options/sidepanel)
 * event.handle(async (arg) => {
 *   console.log('Received:', arg)
 * })
 * ```
 */
export const cs2ep = <Args = void, Return = void>(name: string): OneToOneEvent<Args, Return> => {
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
        // Only respond if sender is from a content script (not extension page or background)
        if (sender.origin && sender.origin.startsWith('chrome-extension://')) {
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

// Port-based message types for ep2cs (handler side)
type PortMessageFormat<Args> = {
  msgId: string
  event: string
  args: Args
}

type PortResponseFormat<Return> = {
  msgId: string
  data?: Return
  error?: {
    message: string
    stack: string
  }
}

/**
 * Extension page to content script handler (one-to-many).
 *
 * Creates a long-lived connection from content script to background relay service.
 * The connection is automatically established when `.handle()` is called.
 *
 * This is the handler side of ep2cs - use this in content scripts to receive
 * messages from extension pages.
 *
 * @param name - Event name
 * @returns OneToManyEvent
 *
 * @example
 * ```ts
 * // In content script
 * const event = ep2cs<string, number>('action:count')
 * const cancel = event.handle(async (arg) => {
 *   console.log('Received:', arg)
 *   return 42
 * })
 *
 * // Later, to stop handling:
 * // cancel()
 *
 * // In extension page (dispatcher)
 * // const results = await event.dispatch('hello')
 * // results: number[] (one element per tab with handler)
 * ```
 */
export const ep2cs = <Args = void, Return = void>(name: string): OneToManyEvent<Args, Return> => {
  const connectionName = `ep2cs:${name}`
  let port: chrome.runtime.Port | null = null
  let isConnected = false

  return {
    dispatch: async (_args: Args): Promise<Return[]> => {
      // Content scripts typically don't dispatch ep2cs events
      // This is mainly for extension pages
      throw new Error(
        'ep2cs: Content scripts cannot dispatch ep2cs events. Use from extension page.'
      )
    },

    handle: (callback: CallBack<Args, Return>) => {
      // Auto-connect to background relay service
      if (!isConnected) {
        port = chrome.runtime.connect({ name: connectionName })
        isConnected = true

        // Listen for messages from background relay
        port.onMessage.addListener(async (msg: PortMessageFormat<Args>) => {
          const { msgId, event, args } = msg

          // Verify event name matches
          if (event !== name) {
            return
          }

          try {
            const result = await callback(args)

            // Send response back to background relay
            const response: PortResponseFormat<Return> = {
              msgId,
              data: result,
            }
            port?.postMessage(response)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            const response: PortResponseFormat<Return> = {
              msgId,
              error: {
                message: errorMessage,
                stack: error instanceof Error ? error.stack || '' : '',
              },
            }
            port?.postMessage(response)
          }
        })

        // Handle disconnection
        port.onDisconnect.addListener(() => {
          isConnected = false
          port = null
        })
      }

      // Return cancel function
      return () => {
        if (port) {
          port.disconnect()
          isConnected = false
          port = null
        }
      }
    },
  }
}
