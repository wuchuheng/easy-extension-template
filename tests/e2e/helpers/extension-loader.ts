/**
 * Extension Loader Utilities
 *
 * Helper functions for loading Chrome extensions in Playwright tests.
 *
 * @module helpers/extension-loader
 */

import type { BrowserContext, Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Get the path to the built extension.
 *
 * @returns Path to the extension directory
 */
export function getExtensionPath(): string {
  // In development, use the dist directory
  // In production CI, this might need to point to a different location
  return path.resolve(__dirname, '../../../dist')
}

/**
 * Load the extension in a browser context.
 *
 * This function loads the unpacked extension and waits for installation.
 *
 * @param context - Playwright browser context
 * @returns Promise that resolves when extension is loaded
 */
export async function loadExtension(context: BrowserContext): Promise<void> {
  const _extensionPath = getExtensionPath()

  // Add --load-extension flag via context
  // Note: Playwright doesn't directly support loading extensions in all contexts
  // This is a placeholder for the actual implementation
  await context.addInitScript(() => {
    // Extension will be loaded via browser args in playwright.config.ts
  })
}

/**
 * Get the extension background page (service worker).
 *
 * For Manifest V3 extensions, the background is a service worker.
 * This function finds and returns the service worker page.
 *
 * @param context - Playwright browser context
 * @returns The background service worker page
 * @throws Error if background page not found
 */
export async function getBackgroundPage(context: BrowserContext): Promise<Page> {
  // 1. Wait for background page to be available
  await context.waitForEvent('serviceworker', { timeout: 10000 })

  // 2. Get all background pages
  const backgroundPages = context.pages()
  const backgroundPage = backgroundPages.find(
    (page) => page.url().includes('chrome-extension://') || page.url() === ''
  )

  if (!backgroundPage) {
    throw new Error('Background service worker not found')
  }

  return backgroundPage
}

/**
 * Get the extension popup page.
 *
 * @param context - Playwright browser context
 * @param extensionId - The extension ID (optional, will try to find it)
 * @returns The popup page
 */
export async function getPopupPage(context: BrowserContext, extensionId?: string): Promise<Page> {
  // 1. If no extension ID provided, try to find it
  let id = extensionId

  if (!id) {
    // Open chrome://extensions page to get extension ID
    const extensionsPage = await context.newPage()
    await extensionsPage.goto('chrome://extensions/')

    // 2. Get extension ID from page (simplified approach)
    id = await extensionsPage.evaluate(() => {
      const extensions = document.querySelectorAll('extensions-item')
      return extensions[0]?.getAttribute('id') ?? ''
    })

    await extensionsPage.close()
  }

  if (!id) {
    throw new Error('Could not find extension ID')
  }

  // 3. Open popup via chrome.action API
  const popupUrl = `chrome-extension://${id}/popup.html`

  // 4. Create new page for popup
  const popupPage = await context.newPage()
  await popupPage.goto(popupUrl)

  return popupPage
}

/**
 * Create a test page with content script for testing.
 *
 * @param context - Playwright browser context
 * @param url - URL to navigate to (defaults to example.com)
 * @returns A page with content script injected
 */
export async function getContentPage(
  context: BrowserContext,
  url: string = 'http://example.com'
): Promise<Page> {
  const page = await context.newPage()
  await page.goto(url)
  return page
}

/**
 * Wait for extension to be fully installed.
 *
 * @param context - Playwright browser context
 * @param timeout - Maximum time to wait in milliseconds
 * @returns Promise that resolves when extension is ready
 */
export async function waitForExtensionInstall(
  context: BrowserContext,
  timeout: number = 10000
): Promise<void> {
  // Wait for service worker to be registered
  await context.waitForEvent('serviceworker', { timeout })
}

/**
 * Reload the extension.
 *
 * Useful for testing state persistence across reloads.
 *
 * @param context - Playwright browser context
 * @returns Promise that resolves when extension is reloaded
 */
export async function reloadExtension(context: BrowserContext): Promise<void> {
  // Navigate to chrome://extensions and click reload
  const extensionsPage = await context.newPage()
  await extensionsPage.goto('chrome://extensions/')

  await extensionsPage.evaluate(() => {
    const reloadButton = document.querySelector('extensions-item cr-button')
    if (reloadButton) {
      ;(reloadButton as HTMLElement).click()
    }
  })

  await extensionsPage.close()

  // Wait for extension to reload
  await waitForExtensionInstall(context)
}
