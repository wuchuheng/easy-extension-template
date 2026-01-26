/**
 * Event Relay System - Type Definitions
 *
 * Provides type definitions for the broadcast-style event communication system.
 * Independent from the channel-based messaging system.
 *
 * @module events/types
 */

/**
 * Role enum for message routing in the event relay system.
 *
 * Messages flow between these roles:
 * - Client → Relay → Handler (request)
 * - Relay → Client (relayAccessed acknowledgment)
 * - Handler → Relay → Client (response)
 */
export enum Role {
  Client = 'client',
  Relay = 'relay',
  Handler = 'handler',
}

/**
 * Message type enum for event relay messages.
 */
export enum MessageType {
  request = 'request',
  relayAccessed = 'relayAccessed',
  response = 'response',
}

/**
 * Event envelope structure for all relay messages.
 */
export interface EventEnvelope<T = unknown> {
  id: string
  event: string
  from: Role
  to: Role
  type: MessageType
  args?: unknown[]
  response?: {
    success: boolean
    data?: T
    error?: {
      message: string
      stack?: string
    }
  }
}

/**
 * Options for event registration.
 */
export interface EventRegisterOptions {
  debug?: boolean
}

/**
 * Event handlers type - a record mapping event names to handler functions.
 */
export type EventHandlers = Record<string, (...args: unknown[]) => Promise<unknown> | unknown>

/**
 * Extract handler function argument types.
 */
export type HandlerArgs<T> = T extends (...args: infer A) => unknown ? A : never

/**
 * Extract handler function return type.
 */
export type HandlerReturn<T> = T extends (...args: unknown[]) => infer R ? R : never

/**
 * Event proxy interface - typed client-side API for calling events.
 */
export type EventProxy<Handlers extends EventHandlers> = {
  [K in keyof Handlers]: (...args: HandlerArgs<Handlers[K]>) => Promise<HandlerReturn<Handlers[K]>>
}
