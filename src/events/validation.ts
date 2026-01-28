import { ExtensionEnv, MessageType, ResponseLetter, Role, ValidateEventLetter } from './types'

/**
 * Check if the event name is valid.
 * @param name The event name to check.
 */
export const checkEventName = (name: string) => {
  const letter: ValidateEventLetter = {
    from: Role.Sender,
    to: Role.Relay,
    content: {
      type: MessageType.ValidateEvent,
      event: name,
      env: {
        type: ExtensionEnv.ExtensionPage,
      },
    },
  }
  chrome.runtime.sendMessage(letter).then((response: ResponseLetter) => {
    if (!response.content.success) {
      throw new Error(response.content.error?.message || 'Validate event failed.')
    }
  })
}
