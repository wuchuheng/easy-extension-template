// messaging/core.ts
// Shared file – used in ALL contexts (background, content, offscreen, popup, options, devtools)

/**
 * Internal handler signature
 */
type Handler<Req, Res> = (request: Req) => Promise<Res> | Res;

/**
 * Wire message format (requests, responses, registration)
 */
interface WireMessage {
  type: "request" | "response" | "register" | "unregister";
  channel: string;
  id?: string;
  payload?: unknown;
  success?: boolean;
  error?: string;
}

/**
 * Background-only state
 */
const localHandlers = new Map<string, Handler<unknown, unknown>>();
const handledChannels = new Set<string>();
const canceledChannels = new Set<string>();

/**
 * Environment detection
 * @returns true if running in background/service worker
 */
const isBackground = (): boolean => {
  return (
    typeof ServiceWorkerGlobalScope !== "undefined"
    && self instanceof ServiceWorkerGlobalScope
  );
};

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
  const send = async (payload: Req): Promise<Res> => {
    const id = `${channelName}--${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;

    return chrome.runtime
      .sendMessage({
        type: "request",
        channel: channelName,
        id,
        payload,
      } as WireMessage)
      .then((response) => {
        const msg = response as WireMessage;
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }
        if (!msg) {
          throw new Error(
            "No response received (receiver might not have called sendResponse)",
          );
        }
        if (msg.success === false) {
          throw new Error(msg.error ?? "Messaging error");
        }
        return msg.payload as Res;
      });
  };

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
        `Channel "${channelName}" already has a handler. `
          + `Only one handler per channel is allowed.`,
      );
    }

    let cancel: () => void;

    if (isBackground()) {
      // Background: store handler locally
      localHandlers.set(
        channelName,
        handler as unknown as Handler<unknown, unknown>,
      );
      handledChannels.add(channelName);
      // If it was previously canceled, remove from canceled set
      canceledChannels.delete(channelName);

      cancel = () => {
        localHandlers.delete(channelName);
        handledChannels.delete(channelName);
        canceledChannels.add(channelName);
      };
    } else {
      // Non-background: register local listener + register with background
      handledChannels.add(channelName);

      const listener = (
        message: unknown,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void,
      ) => {
        const msg = message as WireMessage;
        if (msg.type !== "request" || msg.channel !== channelName) {
          return false;
        }

        Promise.resolve()
          .then(() => handler(msg.payload as Req))
          .then((result) =>
            sendResponse({
              type: "response",
              channel: channelName,
              id: msg.id,
              success: true,
              payload: result,
            }),
          )
          .catch((err) =>
            sendResponse({
              type: "response",
              channel: channelName,
              id: msg.id,
              success: false,
              error: err instanceof Error ? err.message : String(err),
            }),
          );

        return true;
      };

      chrome.runtime.onMessage.addListener(listener);

      // Register with background
      chrome.runtime
        .sendMessage<WireMessage>({
          type: "register",
          channel: channelName,
        })
        .catch((err) => {
          console.warn(
            `Failed to register "${channelName}" with background:`,
            err,
          );
        });

      cancel = () => {
        chrome.runtime.onMessage.removeListener(listener);
        handledChannels.delete(channelName);

        // Notify background of unregistration
        chrome.runtime
          .sendMessage<WireMessage>({
            type: "unregister",
            channel: channelName,
          })
          .catch((err) =>
            console.warn(`Failed to unregister "${channelName}":`, err),
          );
      };
    }

    return cancel;
  };

  return Object.freeze({
    send,
    on,
    channelName,
  });
}

/**
 * Configuration options for the router
 */
interface RouterOptions {
  /**
   * If true, logs all routing events to the console.
   * @default false
   */
  debug?: boolean;
}

/**
 * Starts the central message router.
 * Must be called **only once** in background/service worker.
 * Safe (no-op) to call in other contexts.
 *
 * @param options Configuration options
 */
export function initRouter(options: RouterOptions = {}) {
  if (!isBackground()) {
    return;
  }

  const { debug = false } = options;

  const console = {
    ...globalThis.console,
    log: debug ? globalThis.console.log.bind(globalThis.console) : () => {},
    warn: debug ? globalThis.console.warn.bind(globalThis.console) : () => {},
    error: debug ? globalThis.console.error.bind(globalThis.console) : () => {},
    info: debug ? globalThis.console.info.bind(globalThis.console) : () => {},
    debug: debug ? globalThis.console.debug.bind(globalThis.console) : () => {},
  };

  console.log("[Messaging] Router initialized");

  chrome.runtime.onMessage.addListener(
    (
      message: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) => {
      const msg = message as WireMessage;

      console.log("[Messaging] Received:", msg, "from", sender);

      // Handle handler registration from non-background pages
      if (msg.type === "register" && msg.channel) {
        console.log(`[Messaging] Registering channel: ${msg.channel}`);
        handledChannels.add(msg.channel);
        canceledChannels.delete(msg.channel);
        return false;
      }

      // Handle handler unregistration from non-background pages
      if (msg.type === "unregister" && msg.channel) {
        console.log(`[Messaging] Unregistering channel: ${msg.channel}`);
        handledChannels.delete(msg.channel);
        canceledChannels.add(msg.channel);
        return false;
      }

      // Ignore invalid messages
      if (msg.type !== "request" || !msg.id || !msg.channel) {
        return false;
      }

      const channel = msg.channel;

      // Local handling in background
      if (localHandlers.has(channel)) {
        console.log(`[Messaging] Handling locally: ${channel}`);
        const handler = localHandlers.get(channel)!;

        Promise.resolve()
          .then(() => handler(msg.payload))
          .then((result) =>
            sendResponse({
              type: "response",
              channel,
              id: msg.id,
              success: true,
              payload: result,
            }),
          )
          .catch((err) =>
            sendResponse({
              type: "response",
              channel,
              id: msg.id,
              success: false,
              error: err instanceof Error ? err.message : String(err),
            }),
          );

        return true;
      }

      // Check if channel was explicitly canceled
      if (canceledChannels.has(channel)) {
        console.warn(`[Messaging] Channel canceled: ${channel}`);
        sendResponse({
          type: "response",
          channel,
          id: msg.id,
          success: false,
          error: `Handler for channel "${channel}" has been explicitly canceled/unregistered.`,
        });
        return true;
      }

      // Unknown channel → explicit error
      if (!handledChannels.has(channel)) {
        console.warn(`[Messaging] No handler for: ${channel}`);
        sendResponse({
          type: "response",
          channel,
          id: msg.id,
          success: false,
          error:
            `No handler registered for channel "${channel}". `
            + `Call .on() in the appropriate context (background/offscreen/content/popup/etc).`,
        });
        return true;
      }

      // Forward to target context
      console.log(`[Messaging] Forwarding: ${channel}`);
      chrome.runtime
        .sendMessage(msg)
        .then((response) => sendResponse(response))
        .catch((err) =>
          sendResponse({
            type: "response",
            channel,
            id: msg.id,
            success: false,
            error: err.message || String(err),
          }),
        );

      return true;
    },
  );
}
