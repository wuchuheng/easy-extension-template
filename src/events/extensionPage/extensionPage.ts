/**
 * Extension page event patterns.
 */

import type { OneToOneEvent, OneToManyEvent } from '../types'
import { createMessageEvent, createPortDispatcher } from '../internal/factories'
import { registerMessageListener } from '../internal/messaging'

/**
 * Extension page to background (chrome.runtime.sendMessage).
 * @example
 * ```ts
 * const event = ep2bg<void, string>('fetch:data')
 * await event.dispatch() // returns string
 * // In background: event.handle(async () => 'data from background')
 * ```
 */
export const ep2bg = <Args = void, Return = void>(name: string): OneToOneEvent<Args, Return> =>
  createMessageEvent<Args, Return>(name, {
    senderFilter: (sender) => sender.origin?.startsWith('chrome-extension://') ?? false,
  })

/**
 * Extension page to content script (port-based relay via background).
 * Sends to ALL content scripts across all tabs.
 * @example
 * ```ts
 * const event = ep2cs<string, number>('count-tabs')
 * await event.dispatch('count') // returns number[]
 * // In content script: event.handle(async (arg) => 42)
 * ```
 */
export const ep2cs = <Args = void, Return = void>(name: string): OneToManyEvent<Args, Return> => ({
  dispatch: createPortDispatcher<Args, Return>(name),
  handle: (callback) => registerMessageListener<Args, Return>(name, callback),
})
