/**
 * Factory functions for creating event patterns.
 * Eliminates duplication across event types.
 */

import type {
  CallBack,
  OneToOneEvent,
  OneToManyEvent,
  PortMessageFormat,
  PortResponseFormat,
} from '../types'
import { CallbackMap } from './callback-map'
import {
  sendMessage,
  registerMessageListener,
  errorToPortResponse,
  EP2CS_TIMEOUT_MS,
} from './messaging'
import { generateMsgId } from './port-relay'
import { log, logWarn, Scope } from '../logger'

declare global {
  var cs2csCallbacks: CallbackMap
  var bg2bgCallbacks: CallbackMap
}

// Initialize global storage
if (!globalThis.cs2csCallbacks) {
  globalThis.cs2csCallbacks = new CallbackMap()
}
if (!globalThis.bg2bgCallbacks) {
  globalThis.bg2bgCallbacks = new CallbackMap()
}

/**
 * Creates an in-memory one-to-one event (for cs2cs, bg2bg).
 * Uses globalThis for callback storage.
 */
export function createInMemoryEvent(storageKey: 'cs2csCallbacks' | 'bg2bgCallbacks') {
  return <Args = void, Return = void>(name: string): OneToOneEvent<Args, Return> => ({
    dispatch: async (args: Args) => {
      const callback = globalThis[storageKey].getFirst<Args, Return>(name)
      if (!callback) throw new Error(`No handler registered for event: ${name}`)
      return callback(args)
    },
    handle: (callback: CallBack<Args, Return>) => globalThis[storageKey].register(name, callback),
  })
}

/**
 * Creates a sendMessage-based one-to-one event (for cs2bg, cs2ep, ep2bg, bg2ep).
 */
export function createMessageEvent<Args = void, Return = void>(
  name: string,
  options?: {
    dispatch?: (args: Args) => Promise<Return>
    senderFilter?: (sender: chrome.runtime.MessageSender) => boolean
  }
): OneToOneEvent<Args, Return> {
  const dispatchFn = options?.dispatch ?? ((args: Args) => sendMessage<Args, Return>(name, args))
  return {
    dispatch: dispatchFn,
    handle: (callback) =>
      registerMessageListener<Args, Return>(name, callback, {
        senderFilter: options?.senderFilter,
      }),
  }
}

/**
 * Creates a port-based relay handler (for ep2cs in content scripts).
 * Auto-connects to background relay service on first handle() call.
 */
export function createPortHandler<Args = void, Return = void>(
  name: string
): OneToManyEvent<Args, Return>['handle'] {
  const connectionName = `ep2cs:${name}`
  let port: chrome.runtime.Port | null = null
  let isConnected = false

  return (callback: CallBack<Args, Return>) => {
    if (!isConnected) {
      port = chrome.runtime.connect({ name: connectionName })
      isConnected = true

      port.onMessage.addListener(async (msg: PortMessageFormat<Args>) => {
        const { msgId, event, args } = msg
        if (event !== name) return

        const response: PortResponseFormat<Return> = { msgId }
        try {
          response.data = await callback(args)
        } catch (error) {
          response.error = errorToPortResponse(error)
        }
        port?.postMessage(response)
      })

      port.onDisconnect.addListener(() => {
        isConnected = false
        port = null
      })
    }

    return () => {
      port?.disconnect()
      isConnected = false
      port = null
    }
  }
}

/**
 * Creates a port-based relay dispatcher (for ep2cs in extension pages).
 * Connects to background relay service and aggregates responses.
 */
export function createPortDispatcher<Args = void, Return = void>(
  name: string
): OneToManyEvent<Args, Return>['dispatch'] {
  const connectionName = `ep2cs:${name}`

  return async (args: Args): Promise<Return[]> => {
    const msgId = generateMsgId()
    log(Scope.EXTENSION_PAGE, `[ep2cs] Dispatching event '${name}' with msgId: ${msgId}`)

    const port = chrome.runtime.connect({ name: connectionName })

    return new Promise<Return[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        port.disconnect()
        reject(new Error(`ep2cs: Timeout waiting for response for event '${name}'`))
      }, EP2CS_TIMEOUT_MS)

      const responses: Return[] = []

      port.onMessage.addListener((msg: PortResponseFormat<Return>) => {
        if (msg.msgId !== msgId) return

        clearTimeout(timeout)

        if (msg.error) {
          reject(new Error(msg.error.message))
          port.disconnect()
          return
        }

        if (msg.data !== undefined) {
          responses.push(msg.data)
        }

        if (Array.isArray(msg.data)) {
          resolve(msg.data as unknown as Return[])
          port.disconnect()
        }
      })

      port.onDisconnect.addListener(() => {
        clearTimeout(timeout)
        if (responses.length === 0) {
          logWarn(Scope.EXTENSION_PAGE, `[ep2cs] No content scripts responded to event '${name}'`)
          resolve([])
        }
      })

      const portMsg: PortMessageFormat<Args> = { msgId, event: name, args }
      port.postMessage(portMsg)
    })
  }
}
