// =============================================================================
// Chrome Extension Event System
// =============================================================================
// A type-safe event system for communication between different contexts
// in a Chrome extension (content scripts, background, extension pages).
//
// Event Naming Convention:
// - Use descriptive names with colons for namespacing, e.g., 'user:fetch',
//   'tabs:count', 'storage:update'
// =============================================================================

// ----------------------------------------------------------------------------
// Content Script Events
// ----------------------------------------------------------------------------

/**
 * Content script to content script event (one-to-one).
 *
 * For communication within the same content script context.
 * Returns: Promise<Return>
 */
export { cs2cs } from './contentScript/contentScript'

/**
 * Content script to background event (one-to-one).
 *
 * For sending messages from content script to background script.
 * Returns: Promise<Return>
 */
export { cs2bg } from './contentScript/contentScript'

/**
 * Content script to extension page event (one-to-one).
 *
 * For sending messages from content script to extension pages (popup/options/sidepanel).
 * Returns: Promise<Return>
 */
export { cs2ep } from './contentScript/contentScript'

/**
 * Extension page to content script event handler (one-to-many).
 *
 * For receiving messages from extension pages in content scripts.
 * Use this in content scripts to handle ep2cs events dispatched from extension pages.
 *
 * Note: This is only the handler side. The dispatcher side (ep2cs) is imported
 * from extensionPage/extensionPage.ts.
 */
export { ep2cs as ep2csHandler } from './contentScript/contentScript'

// ----------------------------------------------------------------------------
// Background Events
// ----------------------------------------------------------------------------

/**
 * Background to background event (one-to-one).
 *
 * For internal communication within the background script.
 * Returns: Promise<Return>
 */
export { bg2bg } from './background/background'

/**
 * Background to content script event (one-to-one).
 *
 * For sending messages from background to a specific tab's content script.
 * Returns: Promise<Return>
 */
export { bg2cs } from './background/background'

/**
 * Background to extension page event (one-to-one).
 *
 * For sending messages from background to extension pages.
 * Returns: Promise<Return>
 */
export { bg2ep } from './background/background'

/**
 * Relay service for ep2cs (extension page to content script).
 *
 * Manages long-lived port connections between extension pages and content scripts.
 * This should be called once when the background script initializes.
 *
 * @example
 * ```ts
 * // In background/index.ts
 * import { relayService } from '@/events'
 * relayService()
 * ```
 */
export { relayService } from './background/background'

// ----------------------------------------------------------------------------
// Extension Page Events
// ----------------------------------------------------------------------------

/**
 * Extension page to background event (one-to-one).
 *
 * For sending messages from extension pages (popup/options/sidepanel) to background.
 * Returns: Promise<Return>
 */
export { ep2bg } from './extensionPage/extensionPage'

/**
 * Extension page to content script event dispatcher (one-to-many).
 *
 * For sending messages from extension pages to ALL content scripts across all tabs.
 * Returns: Promise<Return[]> (one element per tab with a handler)
 *
 * Note: This is the dispatcher side. The handler side (ep2csHandler) is imported
 * from contentScript/contentScript.ts.
 */
export { ep2cs } from './extensionPage/extensionPage'

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

/**
 * Callback type for event handlers.
 */
export type CallBack<Args, Return> = (args: Args) => Promise<Return>

/**
 * Cancel function type returned by event handlers.
 * Call this to unregister the handler.
 */
export type Cancel = () => void

/**
 * One-to-one event type.
 * Used for most event patterns where a single dispatcher communicates with a single handler.
 */
export type OneToOneEvent<Args, Return> = {
  dispatch: (args: Args) => Promise<Return>
  handle: (callback: CallBack<Args, Return>) => Cancel
}

/**
 * One-to-many event type.
 * Used for patterns like ep2cs where a single dispatcher communicates with multiple handlers.
 */
export type OneToManyEvent<Args, Return> = {
  dispatch: (args: Args) => Promise<Return[]>
  handle: (callback: CallBack<Args, Return>) => Cancel
}

// ----------------------------------------------------------------------------
// Logging Utilities
// ----------------------------------------------------------------------------

/**
 * Logging scope enum for consistent log prefixes across contexts.
 */
export { Scope } from './logger'

/**
 * Logging functions for consistent console output across contexts.
 */
export { log, logError, logWarn } from './logger'

// ----------------------------------------------------------------------------
// Test Setup Utilities
// ----------------------------------------------------------------------------

/**
 * Setup functions for testing event patterns in different contexts.
 *
 * @example
 * ```ts
 * // In background script
 * import { setupBackground } from '@/events'
 * setupBackground()
 *
 * // In content script
 * import { setupContentScript } from '@/events'
 * setupContentScript()
 *
 * // In extension page
 * import { setupExtensionPage } from '@/events'
 * setupExtensionPage()
 * ```
 */
export { setupBackground, setupContentScript, setupExtensionPage } from './test'
