/**
 * Offscreen document setup for background service worker.
 * Handles creation of offscreen documents for features requiring localStorage, workers, or WASM.
 */

const OFFSCREEN_PATH = 'src/offscreen/index.html'

/**
 * Configuration for offscreen document creation.
 * Specifies reasons and justification for Chrome to review.
 */
const OFFSCREEN_CONFIG: {
  reasons: chrome.offscreen.Reason[]
  justification: string
} = {
  reasons: [chrome.offscreen.Reason.LOCAL_STORAGE, chrome.offscreen.Reason.WORKERS],
  justification: 'Database storage (SQLite) and WASM execution for log management',
}

/**
 * Maximum number of retry attempts for offscreen initialization.
 */
const MAX_RETRY_ATTEMPTS = 3

/**
 * Creates the offscreen document if it doesn't already exist.
 *
 * @throws {Error} If document creation fails
 */
async function createOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) {
    return
  }

  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL(OFFSCREEN_PATH),
    ...OFFSCREEN_CONFIG,
  })
}

/**
 * Initializes the offscreen document with error handling and retry logic.
 *
 * @param retryCount - Current retry attempt number (for internal recursion)
 * @returns Promise that resolves when initialization is complete
 */
async function initializeOffscreen(retryCount = 0): Promise<void> {
  try {
    await createOffscreenDocument()
    console.log('[background] Offscreen document initialized.')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[background] Failed to initialize offscreen document:', errorMessage)

    // Retry logic for development environment where dev server might be warming up
    if (import.meta.env.DEV && retryCount < MAX_RETRY_ATTEMPTS) {
      const delayMs = Math.pow(2, retryCount) * 1000 // Exponential backoff: 1s, 2s, 4s
      console.log(
        `[background] Retrying initialization in ${delayMs}ms... (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`
      )

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          initializeOffscreen(retryCount + 1)
            .then(resolve)
            .catch(() => resolve())
        }, delayMs)
      })
    }

    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      console.error('[background] Max retry attempts reached. Offscreen initialization failed.')
    }
  }
}

/**
 * Starts the offscreen initialization process.
 * In development mode, adds a small delay to allow the dev server to start.
 */
export function setupOffscreen(): void {
  if (import.meta.env.DEV) {
    console.log('[background] Waiting for dev server...')
    setTimeout(() => initializeOffscreen().catch(console.error), 1000)
  } else {
    initializeOffscreen().catch(console.error)
  }
}

// Auto-start on module import
setupOffscreen()
