import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import {
  sendMsgFromBGToOption,
  sendMsgFromCSToOptions,
  sendMsgFromOptionToBG,
  sendMsgFromOptionToCS,
} from '@/messaging/channels.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

sendMsgFromCSToOptions.on(async (msg) => {
  console.log('[options] receive content script message:', msg)
  return 'Hi'
})

sendMsgFromOptionToBG.send('Hi').then(console.log).catch(console.error)

sendMsgFromOptionToCS.send('Hi').then(console.log).catch(console.error)

sendMsgFromBGToOption.on(async (msg) => {
  console.log('[options] receive background message:', msg)
  return 'Hi'
})
