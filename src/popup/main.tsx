import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { sendMsgFromCSToPopup } from '@/messaging/channels.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

sendMsgFromCSToPopup.on(async (msg) => {
  console.log('[popup] receive content script message:', msg)
  return 'Hi'
})
