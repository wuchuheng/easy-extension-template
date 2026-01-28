import {} from '@/messaging/channels'
import './setUpOffscreen'
import { eventRelay } from '@/events/relayService'
import * as test from '@/events/test'
/**
 * Background Service Worker
 * Handles offscreen document creation for SQLite and WASM support.
 */

console.log('[background] Script loaded')

eventRelay()

test.testBackgroundToBackground()
