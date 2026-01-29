// messaging/core.ts
// Shared file – used in ALL contexts (background, content, offscreen, popup, options, devtools)

/**
 * Error data format for messaging responses.
 */
interface ErrorData {
  message: string
  stack?: string
}

/**
 * Internal handler signature
 */
type Handler<Req, Res> = (request: Req, sender: chrome.runtime.MessageSender) => Promise<Res> | Res

/**
 * Wraps an async handler and automatically sends success/error responses.
 * Eliminates duplicate Promise.chain patterns across the codebase.
 *
 * @param handler - The async handler function to wrap (can return Promise<T> or T)
 * @param sendResponse - Chrome's sendResponse callback
 * @param context - Context for error messages (channel name or event name)
 */
function wrapAsyncHandler<T>(
  handler: () => Promise<T> | T,
  sendResponse: (response: { success: boolean; data?: T; error?: ErrorData }) => void,
  context?: string
): void {
  Promise.resolve()
    .then(() => handler())
    .then((data) => sendResponse({ success: true, data }))
    .catch((error) => {
      const errorData: ErrorData = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }
      sendResponse({ success: false, error: errorData })
      if (context) {
        console.warn(`[${context}] Handler error:`, error)
      }
    })
}

/**
 * Wire message format (requests, responses, registration)
 */
interface WireMessage {
  type: 'request' | 'response' | 'unregister'
  channel: string
  id?: string
  payload?: unknown
  success?: boolean
  error?: string
  toContent?: boolean
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

/**
 * Helper to broadcast message to all tabs
 */
const broadcastToContent = async (message: WireMessage): Promise<WireMessage> => {
  // Broadcast to all http/https tabs
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] })
  if (tabs.length === 0) {
    throw new Error('No target tabs found')
  }

  const promises = tabs.map((tab) =>
    chrome.tabs
      .sendMessage(tab.id!, message)
      .then((res) => {
        // res is the WireMessage response from the content script
        return res as WireMessage
      })
      .catch((err) => {
        console.warn(`Failed to send to tab ${tab.id}:`, err)
        return null
      })
  )

  const results = await Promise.all(promises)

  // Find a successful response
  const success = results.find((r) => r !== null && r.success === true)
  if (success) {
    return success
  }

  // If no success, but we have a failure response (e.g. error from handler), return it
  const failure = results.find((r) => r !== null)
  if (failure) {
    return failure
  }

  throw new Error('Failed to send message to any content script, channel: ' + message.channel)
}

if (isBackground()) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const msg = message as WireMessage

    // 1. Local Handler
    if (msg.type === 'request' && localHandlers.has(msg.channel)) {
      const handler = localHandlers.get(msg.channel)!

      wrapAsyncHandler(
        () => handler(msg.payload, sender),
        (result) => {
          sendResponse({
            type: 'response',
            channel: msg.channel,
            id: msg.id,
            success: result.success,
            payload: result.data,
            error: result.error?.message,
          } as WireMessage)
        },
        msg.channel
      )

      return true
    }

    // 2. Relay to Content (if requested and not handled locally)
    if (msg.type === 'request' && msg.toContent) {
      wrapAsyncHandler(
        () => broadcastToContent(msg),
        (result) => {
          sendResponse({
            type: 'response',
            channel: msg.channel,
            id: msg.id,
            success: result.success,
            payload: result.data,
            error: result.error?.message,
          } as WireMessage)
        },
        msg.channel
      )
      return true
    }

    return false
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
 * // Receiver
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
      toContent: options.toContent, // Pass the flag
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

      // Use the shared broadcast helper
      return broadcastToContent(message).then(handleResponse)
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

        wrapAsyncHandler(
          () => handler(msg.payload as Req, sender),
          (result) => {
            sendResponse({
              type: 'response',
              channel: channelName,
              id: msg.id,
              success: result.success,
              payload: result.data,
              error: result.error?.message,
            })
          },
          channelName
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
