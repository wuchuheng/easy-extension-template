// messaging/core.ts
// Shared file – used in ALL contexts (background, content, offscreen, popup, options, devtools)

/**
 * Internal handler signature
 */
type Handler<Req, Res> = (request: Req, sender: chrome.runtime.MessageSender) => Promise<Res> | Res

/**
 * Wire message format (requests, responses, registration)
 */
interface WireMessage {
  type: 'request' | 'response' | 'register' | 'unregister'
  channel: string
  id?: string
  payload?: unknown
  success?: boolean
  error?: string
}

/**
 * Background-only state
 */
const localHandlers = new Map<string, Handler<unknown, unknown>>()
const handledChannels = new Set<string>()
const canceledChannels = new Set<string>()

/**
 * Environment detection
 * @returns true if running in background/service worker
 */
const isBackground = (): boolean => {
  return typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope
}

if (isBackground()) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const msg = message as WireMessage
    if (msg.type !== 'request' || !localHandlers.has(msg.channel)) {
      return false
    }

    const handler = localHandlers.get(msg.channel)!

    Promise.resolve()
      .then(() => handler(msg.payload, sender))
      .then((result) =>
        sendResponse({
          type: 'response',
          channel: msg.channel,
          id: msg.id,
          success: true,
          payload: result,
        } as WireMessage)
      )
      .catch((err) =>
        sendResponse({
          type: 'response',
          channel: msg.channel,
          id: msg.id,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        } as WireMessage)
      )

    return true
  })
}

export interface ChannelOptions {
  toContent?: boolean
}

/**
 * Creates a typed channel object with `.send()` and `.on()` methods.
 *
 * This utility simplifies Chrome extension messaging by providing a type-safe wrapper
 * around `chrome.runtime.sendMessage` and `chrome.tabs.sendMessage`.
 *
 * @template Req Request payload type
 * @template Res Response payload type
 * @param channelName Unique channel identifier. Must be unique across the extension.
 * @param options Channel configuration
 *
 * @example
 * // 1. Define the channel (e.g., in a shared file like `channels.ts`)
 * import { defineChannel } from './core'
 *
 * // Case A: Standard communication (Popup <-> Background, etc.)
 * export const getProfile = defineChannel<{ id: string }, { name: string }>('get-profile')
 *
 * // Case B: Sending TO Content Scripts (Requires `toContent: true`)
 * export const pingContent = defineChannel<string, string>('ping-content', { toContent: true })
 *
 * @example
 * // 2. Listen for messages (Receiver side)
 * import { getProfile } from './channels'
 *
 * getProfile.on(async (req) => {
 *   console.log('Requested profile:', req.id)
 *   return { name: 'Alice' } // Return value is sent back as response
 * })
 *
 * @example
 * // 3. Send messages (Sender side)
 * import { getProfile, pingContent } from './channels'
 *
 * // Send to Background/Popup
 * const profile = await getProfile.send({ id: '123' })
 *
 * // Send to Content Script (Broadcast to all tabs)
 * await pingContent.send('Hello')
 *
 * // Send to Content Script (Specific tab)
 * await pingContent.send('Hello', tabId)
 */
export function defineChannel<Req, Res>(channelName: string, options: ChannelOptions = {}) {
  /**
   * Sends a message and awaits response
   * @param payload Data to send
   * @param tabId Optional tab ID to target (required for content scripts if not broadcasting)
   */
  const send = async (payload: Req, tabId?: number): Promise<Res> => {
    const id = `${channelName}--${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`
    const message = {
      type: 'request',
      channel: channelName,
      id,
      payload,
    } as WireMessage

    const handleResponse = (response: unknown) => {
      const msg = response as WireMessage
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message)
      }
      if (!msg) {
        throw new Error(
          'No response received (receiver might not have called sendResponse), channel: ' +
            channelName
        )
      }
      if (msg.success === false) {
        throw new Error(msg.error ?? 'Messaging error')
      }
      return msg.payload as Res
    }

    if (options.toContent && globalThis.chrome?.tabs) {
      if (typeof tabId === 'number') {
        return chrome.tabs.sendMessage(tabId, message).then(handleResponse)
      }

      // Broadcast to all http/https tabs
      const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] })
      if (tabs.length === 0) {
        throw new Error('No target tabs found')
      }

      const promises = tabs.map((tab) =>
        chrome.tabs
          .sendMessage(tab.id!, message)
          .then(handleResponse)
          .catch((err) => {
            console.warn(`Failed to send to tab ${tab.id}:`, err)
            return null
          })
      )

      const results = await Promise.all(promises)
      const success = results.find((r) => r !== null)
      if (success !== undefined && success !== null) {
        return success as Res
      }

      // throw error with channel name.
      throw new Error('Failed to send message to any content script, channel: ' + channelName)
    }

    return chrome.runtime.sendMessage(message).then(handleResponse)
  }

  /**
   * Registers handler for this channel.
   * Returns a function to cancel/unregister the handler.
   *
   * @param handler Processing function
   * @returns Unsubscribe function
   */
  const on = (handler: Handler<Req, Res>): (() => void) => {
    if (localHandlers.has(channelName)) {
      throw new Error(
        `Channel "${channelName}" already has a handler. ` +
          `Only one handler per channel is allowed.`
      )
    }

    let cancel: () => void

    if (isBackground()) {
      // Background: store handler locally
      localHandlers.set(channelName, handler as unknown as Handler<unknown, unknown>)
      handledChannels.add(channelName)
      // If it was previously canceled, remove from canceled set
      canceledChannels.delete(channelName)

      cancel = () => {
        localHandlers.delete(channelName)
        handledChannels.delete(channelName)
        canceledChannels.add(channelName)
      }
    } else {
      // Non-background: register local listener + register with background
      handledChannels.add(channelName)

      const listener = (
        message: unknown,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void
      ) => {
        const msg = message as WireMessage
        if (msg.type !== 'request' || msg.channel !== channelName) {
          return false
        }

        Promise.resolve()
          .then(() => handler(msg.payload as Req, sender))
          .then((result) =>
            sendResponse({
              type: 'response',
              channel: channelName,
              id: msg.id,
              success: true,
              payload: result,
            })
          )
          .catch((err) =>
            sendResponse({
              type: 'response',
              channel: channelName,
              id: msg.id,
              success: false,
              error: err instanceof Error ? err.message : String(err),
            })
          )

        return true
      }

      chrome.runtime.onMessage.addListener(listener)

      cancel = () => {
        chrome.runtime.onMessage.removeListener(listener)
        handledChannels.delete(channelName)

        // Notify background of registration
        chrome.runtime
          .sendMessage<WireMessage>({
            type: 'unregister',
            channel: channelName,
          })
          .catch((err) => console.warn(`Failed to unregister "${channelName}":`, err))
      }
    }

    return cancel
  }

  return Object.freeze({
    send,
    on,
    channelName,
  })
}
