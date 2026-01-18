// messaging/core.ts
// Shared file – used in ALL contexts (background, content, offscreen, popup, options, devtools)

/**
 * Internal handler signature
 */
type Handler<Req, Res> = (request: Req) => Promise<Res> | Res

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
  target?: { tabId: number; frameId?: number }
  via?: 'router'
}

/**
 * Background-only state
 */
const localHandlers = new Map<string, Handler<unknown, unknown>>()
const handledChannels = new Set<string>()
const canceledChannels = new Set<string>()
const channelTargets = new Map<
  string,
  { kind: 'tab'; tabId: number; frameId?: number } | { kind: 'runtime' }
>()
let routerInitialized = false

/**
 * Environment detection
 * @returns true if running in background/service worker
 */
const isBackground = (): boolean => {
  return typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope
}

/**
 * Creates a typed channel object with `.send()` and `.on()` methods.
 *
 * @template Req Request payload type
 * @template Res Response payload type
 * @param channelName Unique channel identifier
 */
export function defineChannel<Req, Res>(channelName: string) {
  /**
   * Sends a message and awaits response
   * @param payload Data to send
   */
  const send = async (payload: Req, opts?: { tabId?: number; frameId?: number }): Promise<Res> => {
    const id = `${channelName}--${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`

    const response = await chrome.runtime.sendMessage({
      type: 'request',
      channel: channelName,
      id,
      payload,
      target: opts?.tabId != null ? { tabId: opts.tabId, frameId: opts.frameId } : undefined,
    } satisfies WireMessage)

    const msg = response as WireMessage | undefined
    if (!msg) {
      throw new Error('No response received (receiver might not have called sendResponse)')
    }
    if (msg.success === false) {
      throw new Error(msg.error ?? 'Messaging error')
    }
    return msg.payload as Res
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
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void
      ) => {
        const msg = message as WireMessage
        if (msg.type !== 'request' || msg.channel !== channelName) {
          return false
        }

        Promise.resolve()
          .then(() => handler(msg.payload as Req))
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

      // Register with background
      chrome.runtime
        .sendMessage<WireMessage>({
          type: 'register',
          channel: channelName,
        })
        .catch((err) => {
          console.warn(`Failed to register "${channelName}" with background:`, err)
        })

      cancel = () => {
        chrome.runtime.onMessage.removeListener(listener)
        handledChannels.delete(channelName)

        // Notify background of unregistration
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

  return Object.freeze({ send, on, channelName })
}

/**
 * Configuration options for the router
 */
interface RouterOptions {
  /**
   * If true, logs all routing events to the console.
   * @default false
   */
  debug?: boolean
}

/**
 * Initializes background router for all channel messaging.
 *
 * @param options Router configuration
 * @returns Unsubscribe function
 */
export const initRouter = (options: RouterOptions = {}): (() => void) => {
  if (!isBackground()) {
    console.warn('[messaging] initRouter called outside background context.')
    return () => undefined
  }

  if (routerInitialized) {
    console.warn('[messaging] initRouter already initialized.')
    return () => undefined
  }

  routerInitialized = true
  const { debug = false } = options

  const log = (...args: unknown[]) => {
    if (debug) {
      console.log('[messaging:router]', ...args)
    }
  }

  const buildErrorResponse = (msg: WireMessage, error: string): WireMessage => ({
    type: 'response',
    channel: msg.channel,
    id: msg.id,
    success: false,
    error,
  })

  const listener = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    const msg = message as WireMessage
    if (!msg || typeof msg.type !== 'string' || typeof msg.channel !== 'string') {
      return false
    }

    if (msg.type === 'register') {
      handledChannels.add(msg.channel)
      canceledChannels.delete(msg.channel)

      if (sender.tab?.id != null) {
        channelTargets.set(msg.channel, {
          kind: 'tab',
          tabId: sender.tab.id,
          frameId: sender.frameId,
        })
      } else {
        channelTargets.set(msg.channel, { kind: 'runtime' })
      }

      log('register', msg.channel, channelTargets.get(msg.channel))
      sendResponse({ type: 'response', channel: msg.channel, success: true })
      return true
    }

    if (msg.type === 'unregister') {
      handledChannels.delete(msg.channel)
      canceledChannels.add(msg.channel)
      channelTargets.delete(msg.channel)
      log('unregister', msg.channel)
      sendResponse({ type: 'response', channel: msg.channel, success: true })
      return true
    }

    if (msg.type !== 'request' || msg.via === 'router') {
      return false
    }

    if (canceledChannels.has(msg.channel)) {
      sendResponse(buildErrorResponse(msg, 'Channel explicitly canceled by handler.'))
      return true
    }

    const forwardToTab = async (tabId: number, frameId?: number) => {
      try {
        const response =
          frameId != null
            ? await chrome.tabs.sendMessage(tabId, msg, { frameId })
            : await chrome.tabs.sendMessage(tabId, msg)
        const responseMsg = response as WireMessage | undefined
        if (!responseMsg) {
          sendResponse(
            buildErrorResponse(
              msg,
              'No response received (receiver might not have called sendResponse)'
            )
          )
          return
        }
        sendResponse(responseMsg)
      } catch (error) {
        sendResponse(
          buildErrorResponse(msg, error instanceof Error ? error.message : String(error))
        )
      }
    }

    const forwardToRuntime = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          ...msg,
          via: 'router',
        })
        const responseMsg = response as WireMessage | undefined
        if (!responseMsg) {
          sendResponse(
            buildErrorResponse(
              msg,
              'No response received (receiver might not have called sendResponse)'
            )
          )
          return
        }
        sendResponse(responseMsg)
      } catch (error) {
        sendResponse(
          buildErrorResponse(msg, error instanceof Error ? error.message : String(error))
        )
      }
    }

    if (msg.target?.tabId != null) {
      log('request->tab', msg.channel, msg.target.tabId)
      void forwardToTab(msg.target.tabId, msg.target.frameId)
      return true
    }

    const localHandler = localHandlers.get(msg.channel)
    if (localHandler) {
      log('request->local', msg.channel)
      Promise.resolve()
        .then(() => localHandler(msg.payload))
        .then((result) =>
          sendResponse({
            type: 'response',
            channel: msg.channel,
            id: msg.id,
            success: true,
            payload: result,
          })
        )
        .catch((error) =>
          sendResponse(
            buildErrorResponse(msg, error instanceof Error ? error.message : String(error))
          )
        )
      return true
    }

    if (!handledChannels.has(msg.channel)) {
      sendResponse(buildErrorResponse(msg, `No handler registered for "${msg.channel}".`))
      return true
    }

    const target = channelTargets.get(msg.channel)
    if (target?.kind === 'tab') {
      log('request->registered-tab', msg.channel, target.tabId)
      void forwardToTab(target.tabId, target.frameId)
      return true
    }

    log('request->runtime', msg.channel)
    void forwardToRuntime()
    return true
  }

  chrome.runtime.onMessage.addListener(listener)

  return () => {
    chrome.runtime.onMessage.removeListener(listener)
    routerInitialized = false
  }
}
