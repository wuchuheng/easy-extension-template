import { Letter, MessageType, ResponseLetter, Role } from './types'

/**
 *
 */
export function eventRelay() {
  console.log('[event-relay] eventRelay service is running')
  globalThis.extensionEvents = {
    events: new Map(),
  }

  chrome.runtime.onMessage.addListener((request: Letter, _sender, sendResponse) => {
    if (request.to !== Role.Relay) {
      // Ignore this message.
      return
    }

    const inputLetter = request as Letter

    // 2.1 Validate the event name valid. or not.
    if (inputLetter.content.type === MessageType.ValidateEvent) {
      console.log('[event-relay] ValidateEvent:', inputLetter.content)
      const { event } = inputLetter.content
      const responseLetter: ResponseLetter<void> = {
        from: Role.Relay,
        to: Role.Sender,
        content: {
          ...inputLetter.content,
          type: MessageType.Response,
          success: !globalThis.extensionEvents.events.has(event),
        },
      }

      sendResponse(responseLetter)
      return
    }

    console.log('[event-relay] Received message:', request)
    sendResponse({ reply: 'Message received!' })
  })

  // Access message from content script.

  // chrome.runtime.onConnect.addListener((port) => {
  //   const isRelayPort = relayPort.checkIsRelayPort(port)

  //   if (!isRelayPort) {
  //     return
  //   }
  //   console.log('[event-relay] Connected to content script:', port)

  //   port.onMessage.addListener((msg) => {
  //     console.log('Received from content script:', msg)
  //     port.postMessage({ reply: 'Message received!' })
  //   })

  //   port.onDisconnect.addListener(() => {
  //     console.log('[event-relay] Disconnected from content script:', port)
  //   })
  // })

  // chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  //   console.log('[event-relay] Received message:', request)
  //   sendResponse({ reply: 'Message received!' })
  // })
}
