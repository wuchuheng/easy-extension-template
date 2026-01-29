import './setUpOffscreen'
import { setupBackground } from '@/events/test'
import { relayService } from '@/events/background/background'
import { log, Scope } from '@/events/logger'

/**
 * Background Service Worker
 * Handles offscreen document creation for SQLite and WASM support.
 */

log(Scope.BACKGROUND, 'Script loaded')

// Start the relay service for ep2cs (extension page to content script)
relayService()

// Setup test event handlers
setupBackground()
