console.log('[background] Background script loaded')

// Helper to create offscreen document
async function createOffscreen() {
  if (await chrome.offscreen.hasDocument()) return
  await chrome.offscreen.createDocument({
    url: 'src/offscreen/index.html',
    reasons: [chrome.offscreen.Reason.DOM_PARSER],
    justification: 'Parse DOM in background',
  })
}

chrome.runtime.onInstalled.addListener(createOffscreen)
chrome.runtime.onStartup.addListener(createOffscreen)
createOffscreen()
