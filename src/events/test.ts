import * as contentScriptTest from './contentScript/contentScript-test'
import * as backgroundTest from './background/background-test'
import * as extensionPageTest from './extensionPage/extensionPage-test'

export const setupContentScript = () => {
  contentScriptTest.setUpCS()
}

export const setupBackground = () => {
  // Setup background event handlers (including cs2bg, ep2bg, bg2bg, bg2cs, bg2ep)
  backgroundTest.setUpBG()
}

export const setupExtensionPage = () => {
  extensionPageTest.setUpEP()
}
