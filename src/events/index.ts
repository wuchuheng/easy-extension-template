/**
 * Event Relay System - Public API
 *
 * A broadcast-style event communication system for Chrome extensions.
 * Enables pub/sub messaging patterns between all extension contexts.
 *
 * @module events
 *
 * @example
 * ```ts
 * import { createEventRegister } from '@/events'
 *
 * // Define and register event handlers
 * const { relayCenter, events } = createEventRegister({
 *   greeting: async (name: string): Promise<string> => {
 *     return `Hello, ${name}!`
 *   },
 * })
 *
 * // In background service worker only
 * relayCenter()
 *
 * // In any context
 * const result = await events.greeting('Alice')
 * console.log(result) // "Hello, Alice!"
 * ```
 */

// Main function
export { createEventRegister } from './relay'

// Types
export {
  Role,
  MessageType,
  type EventEnvelope,
  type EventRegisterOptions,
  type EventHandlers,
  type EventProxy,
  type HandlerArgs,
  type HandlerReturn,
} from './types'
