/**
 * Event Tester Utilities
 *
 * Helper functions for testing the Event Relay System in Playwright tests.
 *
 * @module helpers/event-tester
 */

import type { Page } from '@playwright/test'
import type { EventEnvelope, EventHandlers } from '@/events/types'

/**
 * Event relay source code for injection into test pages.
 *
 * This script defines the event relay system and is injected
 * into test pages during E2E testing.
 */
const EVENT_RELAY_SOURCE = `
// This will be replaced with the actual event relay code
// For now, we use the compiled version from the build

window.__testEventRelay = {
  registered: false,
  handlers: {},
  messages: [],
};

// Capture chrome.runtime messages for testing
if (typeof chrome !== 'undefined' && chrome.runtime) {
  const originalSendMessage = chrome.runtime.sendMessage;
  chrome.runtime.sendMessage = function(...args) {
    window.__testEventRelay.messages.push({
      type: 'outgoing',
      args: JSON.parse(JSON.stringify(args)),
      timestamp: Date.now(),
    });
    return originalSendMessage.apply(chrome.runtime, args);
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    window.__testEventRelay.messages.push({
      type: 'incoming',
      message: JSON.parse(JSON.stringify(message)),
      sender: sender,
      timestamp: Date.now(),
    });
  });
}
`

/**
 * Inject the event relay system into a page.
 *
 * This function injects the event relay code and registers
 * the provided handlers.
 *
 * @param page - Playwright page
 * @param handlers - Event handlers to register (as serializable object)
 * @returns Promise that resolves when script is injected
 */
export async function injectEventRelay(
  page: Page,
  handlers: Record<string, string>
): Promise<void> {
  // 1. Inject the event relay source code
  await page.addInitScript(EVENT_RELAY_SOURCE)

  // 2. Register the handlers
  await page.evaluate((handlerDefs) => {
    // This will be implemented once we have the actual compiled event relay code
    window.__testHandlers = handlerDefs
  }, handlers)
}

/**
 * Call an event from a page and await the response.
 *
 * @param page - Playwright page
 * @param eventName - Name of the event to call
 * @param args - Arguments to pass to the event handler
 * @returns Promise resolving to the event result
 * @throws Error if event call fails
 */
export async function callEvent<T = unknown>(
  page: Page,
  eventName: string,
  ...args: unknown[]
): Promise<T> {
  // 1. Execute the event call in the page context
  const result = await page.evaluate(
    async ({ name, arguments: args }) => {
      // 2. Call the event through the event proxy
      // @ts-expect-error - Event proxy is injected at runtime
      const events = window.__eventProxy
      if (!events) {
        throw new Error('Event proxy not initialized. Call injectEventRelay first.')
      }

      // @ts-expect-error - Dynamic event call
      return await events[name](...args)
    },
    { name: eventName, arguments: args }
  )

  return result as T
}

/**
 * Initialize the event relay system in a page with handlers.
 *
 * This is a convenience function that combines injectEventRelay
 * with handler registration and relayCenter initialization.
 *
 * @param page - Playwright page
 * @param handlers - Event handlers to register
 * @param isBackground - Whether this is the background context (for relayCenter)
 * @returns Promise that resolves when system is initialized
 */
export async function initializeEventRelay(
  page: Page,
  handlers: EventHandlers,
  isBackground: boolean = false
): Promise<void> {
  // 1. Convert handlers to serializable format for injection
  const handlerDefs: Record<string, string> = {}

  for (const [name, handler] of Object.entries(handlers)) {
    handlerDefs[name] = handler.toString()
  }

  // 2. Inject event relay code
  await injectEventRelay(page, handlerDefs)

  // 3. Initialize the event system
  await page.evaluate(
    ({ handlers: h, background: bg }) => {
      // This will use the actual createEventRegister function
      // For now, stub implementation
      // @ts-expect-error - Runtime evaluation
      window.__eventHandlers = h
      // @ts-expect-error - Runtime evaluation
      window.__isBackground = bg
    },
    { handlers: handlerDefs, background: isBackground }
  )

  // 4. If background, initialize relay center
  if (isBackground) {
    await page.evaluate(() => {
      // @ts-expect-error - Will be replaced with actual relayCenter call
      // window.__relayCenter()
    })
  }
}

/**
 * Wait for a specific message type in the page.
 *
 * @param page - Playwright page
 * @ messageType - The message type to wait for
 * @param timeout - Maximum time to wait in milliseconds
 * @returns Promise resolving to the captured message envelope
 */
export async function waitForMessage(
  page: Page,
  messageType: string,
  timeout: number = 5000
): Promise<EventEnvelope> {
  return (await page.evaluate(
    async ({ type, timeout: ms }) => {
      return await new Promise((resolve, reject) => {
        // @ts-expect-error - Test utilities
        const messages = window.__testEventRelay?.messages ?? []

        // Check if message already exists
        const existing = messages.find((m) => m.message?.type === type)
        if (existing) {
          resolve(existing.message)
          return
        }

        // Wait for new message
        // @ts-expect-error - Test utilities
        const listener = chrome?.runtime?.onMessage?.addListener((message) => {
          if (message.type === type) {
            // @ts-expect-error - Chrome API
            chrome.runtime.onMessage.removeListener(listener)
            resolve(message)
          }
        })

        // Timeout
        setTimeout(() => {
          // @ts-expect-error - Chrome API
          if (listener) chrome.runtime.onMessage.removeListener(listener)
          reject(new Error(`Timeout waiting for message type: ${type}`))
        }, ms)
      })
    },
    { type: messageType, timeout }
  )) as EventEnvelope
}

/**
 * Get all captured messages from a page.
 *
 * @param page - Playwright page
 * @returns Array of captured message envelopes
 */
export async function getCapturedMessages(page: Page): Promise<EventEnvelope[]> {
  return await page.evaluate(() => {
    // @ts-expect-error - Test utilities
    const messages = window.__testEventRelay?.messages ?? []
    return messages.filter((m) => m.message).map((m) => m.message)
  })
}

/**
 * Clear all captured messages from a page.
 *
 * Useful for isolating test scenarios.
 *
 * @param page - Playwright page
 */
export async function clearCapturedMessages(page: Page): Promise<void> {
  await page.evaluate(() => {
    // @ts-expect-error - Test utilities
    if (window.__testEventRelay) {
      window.__testEventRelay.messages = []
    }
  })
}
