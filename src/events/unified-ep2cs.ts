/**
 * Unified ep2cs event with runtime environment detection.
 *
 * This module provides a single event factory that creates event objects
 * working in both content scripts and extension pages. Environment detection
 * happens at CALL time, not module initialization time.
 *
 * @module
 */

import type { CallBack, OneToManyEvent } from './types'
import { registerMessageListener } from './internal/messaging'
import { createPortDispatcher, createPortHandler } from './internal/factories'
import { hasChromeRuntime, isContentScriptContext } from './ep2cs-env'

/**
 * Creates an ep2cs event that works in all contexts.
 *
 * The returned event object has both `dispatch` and `handle` methods:
 * - `dispatch`: Works in extension pages/offscreen (throws in content scripts)
 * - `handle`: Works in content scripts (port-based) or extension pages (message listener)
 *
 * Environment detection happens at CALL time, not module init time.
 *
 * @typeParam Args - The argument type passed to the event handler
 * @typeParam Return - The return type of the event handler
 * @param eventName - The unique event name
 * @returns An event object with methods that adapt to the runtime context
 *
 * @example
 * ```ts
 * // In config.ts - define once
 * import { ep2cs } from '@/events/unified-ep2cs'
 *
 * export const myEvent = ep2cs<string, void>('my-event')
 *
 * // In content script - use .handle()
 * import { myEvent } from '@/events/config'
 * myEvent.handle(async (data) => {
 *   console.log('Received:', data)
 * })
 *
 * // In offscreen/popup - use .dispatch()
 * import { myEvent } from '@/events/config'
 * await myEvent.dispatch('Hello!')
 * ```
 */
export function ep2cs<Args = void, Return = void>(eventName: string): OneToManyEvent<Args, Return> {
  const dispatchFromPage = createPortDispatcher<Args, Return>(eventName)
  const handleInContentScript = createPortHandler<Args, Return>(eventName)

  return {
    /**
     * Dispatches the event to all content scripts.
     * Only works in extension pages/offscreen documents.
     */
    dispatch: async (args: Args): Promise<Return[]> => {
      if (!hasChromeRuntime()) {
        throw new Error('ep2cs: chrome.runtime is not available in this context.')
      }

      // Runtime check: content scripts cannot dispatch
      const isContentScript = isContentScriptContext()

      if (isContentScript) {
        throw new Error(
          'ep2cs: Content scripts cannot dispatch ep2cs events. Use from extension page.'
        )
      }
      return dispatchFromPage(args)
    },

    /**
     * Registers a handler for this event.
     * - In content scripts: Creates port connection to relay service
     * - In extension pages: Registers message listener
     */
    handle: (callback: CallBack<Args, Return>) => {
      if (!hasChromeRuntime()) {
        throw new Error('ep2cs: chrome.runtime is not available in this context.')
      }

      // Runtime check: content scripts need port-based handler
      const isContentScript = isContentScriptContext()

      if (isContentScript) {
        return handleInContentScript(callback)
      } else {
        // Extension page: use registerMessageListener
        return registerMessageListener<Args, Return>(eventName, callback)
      }
    },
  }
}
