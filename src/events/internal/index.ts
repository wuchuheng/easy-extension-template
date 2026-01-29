/**
 * Internal utilities for the event system.
 * @internal
 */

// Callback storage
export { CallbackMap } from './callback-map'

// Factories
export {
  createInMemoryEvent,
  createMessageEvent,
  createPortHandler,
  createPortDispatcher,
} from './factories'

// Message handling
export {
  EP2CS_TIMEOUT_MS,
  sendMessage,
  sendMessageToTab,
  registerMessageListener,
  errorToResponse,
  errorToPortResponse,
} from './messaging'

export { createMessageListener, type MessageListenerCallback } from './message-listener'

// Port relay
export {
  generateMsgId,
  extractEventName,
  initializeRelayStorage,
  isExtensionPage,
  isContentScript,
  handleExtensionPageConnection,
  handleContentScriptConnection,
} from './port-relay'

// Argument parsing
export { parseArgsAndTabId } from './parse-tab-id'
