/**
 * Test setup for the event system.
 *
 * Provides test event handlers for development and debugging.
 * These handlers demonstrate the event patterns and should NOT be used in production.
 *
 * @module
 */

import * as contentScriptTest from './contentScript/contentScript-test'
import * as backgroundTest from './background/background-test'
import * as extensionPageTest from './extensionPage/extensionPage-test'
import { isTest } from './config'

/**
 * Setup test event handlers for content scripts.
 *
 * Call this in your content script entry point during development.
 *
 * @example
 * ```ts
 * // src/content/main.tsx
 * import { setupContentScript } from '@/events/test'
 * setupContentScript()
 * ```
 */
export const setupContentScript = () => {
  if (!isTest) return
  contentScriptTest.setUpCS()
}

/**
 * Setup test event handlers for the background service worker.
 *
 * Call this in your background entry point during development.
 *
 * @example
 * ```ts
 * // src/background/index.ts
 * import { setupBackground } from '@/events/test'
 * setupBackground()
 * ```
 */
export const setupBackground = () => {
  if (!isTest) return
  backgroundTest.setUpBG()
}

/**
 * Setup test event handlers for extension pages.
 *
 * Call this in your extension page entry points during development.
 *
 * @example
 * ```ts
 * // src/popup/main.tsx
 * import { setupExtensionPage } from '@/events/test'
 * setupExtensionPage()
 * ```
 */
export const setupExtensionPage = () => {
  if (!isTest) return
  extensionPageTest.setUpEP()
}
