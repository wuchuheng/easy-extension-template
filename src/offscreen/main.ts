import { sendMsgFromCSToOffscreen } from '@/messaging/channels'

console.log('[offscreen] Offscreen document loaded')

sendMsgFromCSToOffscreen.on(async (msg) => {
  console.log('[offscreen] Received message via channel:', msg)
  return `Hi`
})
