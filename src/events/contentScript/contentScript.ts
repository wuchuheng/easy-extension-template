/**
 * Content script event patterns.
 */

import type { OneToOneEvent, OneToManyEvent } from '../types'
import { createInMemoryEvent, createMessageEvent, createPortHandler } from '../internal/factories'

const cs2csFactory = createInMemoryEvent('cs2cs')

/**
 * Content script to content script (in-memory).
 * @example
 * ```ts
 * const event = cs2cs<string, number>('my-event')
 * event.handle(async (arg) => arg.length)
 * await event.dispatch('hello') // returns number
 * ```
 */
export const cs2cs = <Args = void, Return = void>(name: string): OneToOneEvent<Args, Return> =>
  cs2csFactory<Args, Return>(name)

/**
 * Content script to background (chrome.runtime.sendMessage).
 * @example
 * ```ts
 * const event = cs2bg<string, string>('test:cs-to-bg')
 * // In background: event.handle(async (arg) => 'bg received: ' + arg)
 * await event.dispatch('hello') // returns string
 * ```
 */
export const cs2bg = <Args = void, Return = void>(name: string): OneToOneEvent<Args, Return> =>
  createMessageEvent<Args, Return>(name)

/**
 * Content script to extension page (chrome.runtime.sendMessage).
 * @example
 * ```ts
 * const event = cs2ep<string, void>('notification:show')
 * await event.dispatch('Hello World')
 * // In extension page: event.handle(async (arg) => console.log('Received:', arg))
 * ```
 */
export const cs2ep = <Args = void, Return = void>(name: string): OneToOneEvent<Args, Return> =>
  createMessageEvent<Args, Return>(name, {
    senderFilter: (sender) => !sender.origin?.startsWith('chrome-extension://'),
  })

/**
 * Extension page to content script handler (port-based relay).
 * Creates a long-lived connection to background relay service.
 * @example
 * ```ts
 * const event = ep2cs<string, number>('action:count')
 * const cancel = event.handle(async (arg) => {
 *   console.log('Received:', arg)
 *   return 42
 * })
 * // Later: cancel()
 * // In extension page: await event.dispatch('hello') // returns number[]
 * ```
 */
export const ep2cs = <Args = void, Return = void>(name: string): OneToManyEvent<Args, Return> => ({
  dispatch: async (_args: Args): Promise<Return[]> => {
    throw new Error('ep2cs: Content scripts cannot dispatch ep2cs events. Use from extension page.')
  },
  handle: createPortHandler<Args, Return>(name),
})
