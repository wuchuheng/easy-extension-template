/**
 * Configuration for the event system.
 */

/**
 * Test mode flag.
 *
 * When true, enables test event handlers and verbose logging.
 * Set via environment variable or build flag.
 *
 * @example
 * ```ts
 * // In development/test builds
 * import { isTest } from '@/events/config'
 *
 * if (isTest) {
 *   setupTestHandlers()
 * }
 * ```
 */
export const isTest = true
