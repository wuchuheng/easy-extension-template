/**
 * Defines the three primary execution zones of a Chrome Extension
 */
export enum ExtensionEnv {
  Background = 'BACKGROUND', // Service Worker (MV3)
  ContentScript = 'CONTENT_SCRIPT', // Injected into web pages
  ExtensionPage = 'EXTENSION_PAGE', // Popup, Options, SidePanel, etc.
}

export enum Role {
  Sender = 'SENDER',
  Receiver = 'RECEIVER',
  Relay = 'RELAY',
}

export enum MessageType {
  Request = 'REQUEST',
  Response = 'RESPONSE',
  ValidateEvent = 'VALIDATE_EVENT',
}

type CommonLetter = {
  from: Role
  to: Role
  content: {
    event: string
    env: {
      type: ExtensionEnv
      tabId?: number
    }
  }
}

export type ValidateEventLetter = CommonLetter & {
  content: {
    type: MessageType.ValidateEvent
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

// GlobalThis type for global extensionEvent object
declare global {
  var extensionEvents: {
    events: Map<
      string,
      {
        backgroundCallback: <TArgs, TReturn>(data: TArgs) => Promise<TReturn>
        from: ExtensionEnv
      }
    >
  }
}
