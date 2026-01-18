import { createRoot } from 'react-dom/client'
import App from './views/App.tsx'
import {
  sendMsgFromCSToBG,
  sendMsgFromCSToOffscreen,
  sendMsgFromCSToOptions,
  sendMsgFromOptionToCS,
} from '@/messaging/channels.ts'

console.log('[CRXJS] Hello world from content script!')

const container = document.createElement('div')
container.id = 'crxjs-app'
document.body.appendChild(container)
createRoot(container).render(<App />)

sendMsgFromCSToOffscreen
  .send('Hi')
  .then((response) => console.log('[content] Response from Offscreen:', response))
sendMsgFromCSToBG
  .send('Hi')
  .then((msg) => console.log('[content] receive response from background script:', msg))
  .catch((err) => console.error('[content] Failed to send to background:', err))

// sendMsgFromCSToPopup
//   .send('Hi')
//   .then((msg) => console.log('[content] receive response from popup script:', msg))
//   .catch((err) => console.error('[content] Popup is likely closed (normal):', err.message))

// sendMsgFromCSToSidePanel
//   .send('Hi')
//   .then((msg) => console.log('[content] receive response from side panel:', msg))
//   .catch((err) => console.error('[content] Failed to send to side panel:', err))

sendMsgFromCSToOptions
  .send('Hi')
  .then((msg) => console.log('[content] receive response from options:', msg))
  .catch(console.error)

sendMsgFromOptionToCS.on(async (msg) => {
  console.log('[content] receive message from options:', msg)
  return 'Hi'
})
