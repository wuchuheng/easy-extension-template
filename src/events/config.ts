/**
 * Configuration for the event system.
 *
 * Centralizes event definitions with runtime environment detection.
 * Events defined here work seamlessly across all extension contexts.
 */

import * as events from './index'

// ============================================================================
// Configuration
// ============================================================================

/**
 * Test mode flag.
 *
 * When true, enables test event handlers and verbose logging.
 * Set via environment variable or build flag.
 *
 * @example
 * ```ts
 * import { isTest } from '@/events/config'
 *
 * if (isTest) {
 *   setupTestHandlers()
 * }
 * ```
 */
export const isTest = true

// ============================================================================
// Application Events
// ============================================================================

/**
 * Offscreen to content script communication event.
 *
 * Environment detection happens at CALL time, not module init time.
 * - **Content scripts**: Use `.handle()` to receive messages
 * - **Offscreen/Extension pages**: Use `.dispatch()` to send messages
 *
 * @example
 * ```ts
 * // In content script (src/content/main.tsx):
 * import { sayHelloFromOffToCS } from '@/events/config'
 *
 * sayHelloFromOffToCS.handle(async (message) => {
 *   console.log('[Content Script] Received:', message)
 * })
 * ```
 *
 * @example
 * ```ts
 * // In offscreen document (src/offscreen/main.ts):
 * import { sayHelloFromOffToCS } from '@/events/config'
 *
 * await sayHelloFromOffToCS.dispatch('Hello from offscreen!')
 * ```
 */
export const sayHelloFromOffToCS = events.ep2cs<string, void>('sayHelloFromOfscreenToContentScript')
