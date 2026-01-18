import {
  sendMsgFromBGToOption,
  sendMsgFromCSToBG,
  sendMsgFromOptionToBG,
} from '@/messaging/channels'
import './setUpOffscreen'
/**
 * Background Service Worker
 * Handles offscreen document creation for SQLite and WASM support.
 */

console.log('[background] Script loaded')

sendMsgFromCSToBG.on(async (msg) => {
  console.log('[background] Received message from content script:', msg)
  return 'Hi'
})

sendMsgFromOptionToBG.on(async (msg) => {
  console.log('[background] Received message from options:', msg)
  return 'Hi'
})

setTimeout(() => {
  sendMsgFromBGToOption.send('Hi')
}, 10000)
