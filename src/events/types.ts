/**
 * Defines the three primary execution zones of a Chrome Extension
 */
export enum ExtensionEnv {
  Background = 'BACKGROUND', // Service Worker (MV3)
  ContentScript = 'CONTENT_SCRIPT', // Injected into web pages
  ExtensionPage = 'EXTENSION_PAGE', // Popup, Options, SidePanel, etc.
}

export enum Role {
  Client = 'CLIENT',
  Handler = 'HANDLER',
  Relay = 'RELAY',
}

export enum MessageType {
  Request = 'REQUEST',
  Response = 'RESPONSE',
  ValidateEvent = 'VALIDATE_EVENT',
  SetUpRelay = 'SET_UP_RELAY',
}

type CommonLetter = {
  from: Role
  to: Role
  content: {
    event: string
    id: string
    env: {
      type: ExtensionEnv
    }
  }
}

export type ValidateEventLetter = CommonLetter & {
  content: {
    type: MessageType.ValidateEvent
  }
}

export type SetUpRelayLetter = CommonLetter & {
  content: {
    type: MessageType.SetUpRelay
  }
}

export type RequestLetter<TArgs = void> = CommonLetter & {
  content: {
    type: MessageType.Request
    args: TArgs
  }
}

export type ResponseLetter<TReturn = void> = CommonLetter & {
  content: {
    type: MessageType.Response
    success: boolean
    error?: {
      message: string
      stack?: string
    }
    data?: TReturn
  }
}

export type Letter<TArgs = void, TReturn = void> =
  | ValidateEventLetter
  | RequestLetter<TArgs>
  | ResponseLetter<TReturn>
  | SetUpRelayLetter

// GlobalThis type for global extensionEvent object
declare global {
  var extensionEvents: {
    events: Map<
      string,
      {
        backgroundCallback?: <TArgs, TReturn>(data: TArgs) => Promise<TReturn>
        ports?: Map<number, chrome.runtime.Port>
        definedFrom: ExtensionEnv
      }
    >
  }
}

// ============================================================================
// Event System Types (cs2cs, cs2bg, cs2ep, bg2bg, bg2cs, bg2ep, ep2bg, ep2cs)
// ============================================================================

/**
 * Callback function type for event handlers.
 */
export type CallBack<Args, Return> = (args: Args) => Promise<Return>

/**
 * Cancel function type for unregistering event handlers.
 */
export type Cancel = () => void

/**
 * One-to-one event type.
 * Used for most event patterns where a single dispatcher communicates with a single handler.
 *
 * @template Args - The arguments type passed to the handler
 * @template Return - The return type from the handler
 */
export type OneToOneEvent<Args, Return> = {
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
export type OneToManyEvent<Args, Return> = {
  dispatch: (args: Args) => Promise<Return[]>
  handle: (callback: CallBack<Args, Return>) => Cancel
}

/**
 * Message format for chrome.runtime.sendMessage based patterns.
 * Used by cs2bg, cs2ep, bg2ep, ep2bg.
 */
export type MessageFormat<Args, Return> = {
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
 * Port-based message format for ep2cs relay (request side).
 * Sent from extension page to background relay.
 */
export type PortMessageFormat<Args> = {
  msgId: string
  event: string
  args: Args
}

/**
 * Port-based response format for ep2cs relay (response side).
 * Sent from content script back to background relay.
 */
export type PortResponseFormat<Return> = {
  msgId: string
  data?: Return
  error?: {
    message: string
    stack: string
  }
}
