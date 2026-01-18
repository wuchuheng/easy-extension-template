import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { sendMsgFromCSToSidePanel } from '@/messaging/channels.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

sendMsgFromCSToSidePanel.on(async (msg) => {
  console.log('[sidePanel] receive content script message:', msg)
  return 'Hi'
})
