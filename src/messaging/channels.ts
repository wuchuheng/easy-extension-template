import { defineChannel } from './core'

export const sendMsgFromCSToOffscreen = defineChannel<string, string>('content-to-offscreen')
export const sendMsgFromCSToBG = defineChannel<string, string>('content-to-background')
export const sendMsgFromCSToPopup = defineChannel<string, string>('content-to-popup')
export const sendMsgFromCSToSidePanel = defineChannel<string, string>('content-to-sidepanel')
export const sendMsgFromCSToOptions = defineChannel<string, string>('content-to-options')

export const sendMsgFromOptionToBG = defineChannel<string, string>('options-to-background')
export const sendMsgFromOptionToCS = defineChannel<string, string>('options-to-content', {
  toContent: true,
})

export const sendMsgFromBGToOption = defineChannel<string, string>('background-to-options')
