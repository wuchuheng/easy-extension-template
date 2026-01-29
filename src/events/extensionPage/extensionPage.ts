import { log, logWarn, Scope } from '../logger'

type CallBack<Args, Return> = (args: Args) => Promise<Return>
type Cancel = () => void

type OneToOneEvent<Args, Return> = {
  dispatch: (args: Args) => Promise<Return>
  handle: (callback: CallBack<Args, Return>) => Cancel
}

type OneToManyEvent<Args, Return> = {
  dispatch: (args: Args) => Promise<Return[]>
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

// Port-based message types for ep2cs
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
 * Extension page to background event (one-to-one).
 *
 * Sends messages from extension pages (popup, options, sidepanel) to background script.
 *
 * @param name - Event name
 * @returns OneToOneEvent
 *
 * @example
 * ```ts
 * // In extension page
 * const event = ep2bg<void, string>('fetch:data')
 * const result = await event.dispatch()
 * console.log(result) // string
 *
 * // In background script
 * event.handle(async () => {
 *   return 'data from background'
 * })
 * ```
 */
export const ep2bg = <Args = void, Return = void>(name: string): OneToOneEvent<Args, Return> => {
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
 * Generate a unique message ID for ep2cs.
 */
const generateMsgId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Extension page to content script event (one-to-many).
 *
 * Sends messages from extension pages to ALL content scripts across all tabs.
 * This is the ONLY event pattern that returns an array (one result per tab with a handler).
 *
 * The background relay service handles routing the message to all connected content scripts.
 *
 * @param name - Event name
 * @returns OneToManyEvent
 *
 * @example
 * ```ts
 * // In extension page
 * const event = ep2cs<string, number>('count-tabs')
 * const results = await event.dispatch('count')
 * console.log(results) // number[], one element per tab with handler
 *
 * // In content script
 * event.handle(async (arg) => {
 *   console.log('Received:', arg)
 *   return 42
 * })
 * ```
 */
export const ep2cs = <Args = void, Return = void>(name: string): OneToManyEvent<Args, Return> => {
  const connectionName = `ep2cs:${name}`

  return {
    dispatch: async (args: Args): Promise<Return[]> => {
      const msgId = generateMsgId()

      log(Scope.EXTENSION_PAGE, `[ep2cs] Dispatching event '${name}' with msgId: ${msgId}`)

      // Create a new port for this request
      const port = chrome.runtime.connect({ name: connectionName })

      return new Promise<Return[]>((resolve, reject) => {
        const timeout = setTimeout(() => {
          port.disconnect()
          reject(new Error(`ep2cs: Timeout waiting for response for event '${name}'`))
        }, 30000) // 30 second timeout

        // Collect all responses from all content scripts
        const responses: Return[] = []

        port.onMessage.addListener((msg: PortResponseFormat<Return>) => {
          if (msg.msgId === msgId) {
            clearTimeout(timeout)

            if (msg.error) {
              reject(new Error(msg.error.message))
              port.disconnect()
              return
            }

            if (msg.data !== undefined) {
              responses.push(msg.data)
            }

            // The background relay aggregates all responses and sends them back as an array
            // If we receive an array, that's the final aggregated result
            if (Array.isArray(msg.data)) {
              resolve(msg.data as unknown as Return[])
              port.disconnect()
            }
          }
        })

        port.onDisconnect.addListener(() => {
          clearTimeout(timeout)
          if (responses.length === 0) {
            logWarn(Scope.EXTENSION_PAGE, `[ep2cs] No content scripts responded to event '${name}'`)
            resolve([])
          }
        })

        // Send the message to background relay
        const portMsg: PortMessageFormat<Args> = {
          msgId,
          event: name,
          args,
        }

        port.postMessage(portMsg)
      })
    },

    handle: (callback: CallBack<Args, Return>) => {
      // For extension pages handling incoming messages from content scripts
      // This is less common but useful for bidirectional communication
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
