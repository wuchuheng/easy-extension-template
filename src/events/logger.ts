/**
 * Unified logging utility for the Chrome extension event system.
 *
 * Provides standardized logging with scope-based prefixes for consistent
 * log formatting across different contexts (background, extension pages, content scripts).
 *
 * @example
 * ```ts
 * import { log, Scope } from '@/events/logger'
 *
 * log(Scope.BACKGROUND, 'Service worker initialized')
 * // Output: [background] Service worker initialized
 * ```
 */

/**
 * Execution scope for log messages.
 * Maps to standardized log prefixes for different Chrome extension contexts.
 */
export enum Scope {
  /** Background service worker context */
  BACKGROUND = 'background',
  /** Extension page context (popup, options, sidepanel) */
  EXTENSION_PAGE = 'extension-page',
  /** Content script context (injected into web pages) */
  CONTENT_SCRIPT = 'content-script',
}

/**
 * Log an informational message with the given scope prefix.
 *
 * @param scope - The execution scope for the log message
 * @param message - The message to log
 * @param args - Additional arguments to pass to console.log
 */
export const log = (scope: Scope, message: string, ...args: unknown[]) => {
  const prefix = `[${scope}]`
  console.log(prefix, message, ...args)
}

/**
 * Log an error message with the given scope prefix.
 *
 * @param scope - The execution scope for the error message
 * @param message - The error message to log
 * @param args - Additional arguments to pass to console.error
 */
export const logError = (scope: Scope, message: string, ...args: unknown[]) => {
  const prefix = `[${scope}]`
  console.error(prefix, message, ...args)
}

/**
 * Log a warning message with the given scope prefix.
 *
 * @param scope - The execution scope for the warning message
 * @param message - The warning message to log
 * @param args - Additional arguments to pass to console.warn
 */
export const logWarn = (scope: Scope, message: string, ...args: unknown[]) => {
  const prefix = `[${scope}]`
  console.warn(prefix, message, ...args)
}
