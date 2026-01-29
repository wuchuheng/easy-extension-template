import { isTest } from '../config'
import { ep2bg, ep2cs } from './extensionPage'
import { log, Scope } from '../logger'

export const setUpEP = () => {
  if (!isTest) {
    return
  }

  // Test ep2bg (returns single value)
  const ep2bgEvent = ep2bg<void, string>('test:ep-to-bg')
  ep2bgEvent.dispatch().then((result) => {
    log(Scope.EXTENSION_PAGE, '[ep2bg] dispatch test:ep-to-bg, result:', result)
  })

  // Test ep2cs (one-to-many, returns array)
  const ep2csEvent = ep2cs<string, number>('test:ep-to-cs')
  ep2csEvent.dispatch('count tabs').then((result) => {
    log(Scope.EXTENSION_PAGE, '[ep2cs] dispatch test:ep-to-cs, result:', result)
  })

  // Handle bg2ep messages from background
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.event === 'test:bg-to-ep') {
      log(Scope.EXTENSION_PAGE, '[bg2ep] handle test:bg-to-ep, arg:', request.args)
      sendResponse({ success: true, data: 'ep received: ' + request.args })
      return true
    }
    return false
  })

  // Handle cs2ep messages from content script
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.event === 'test:cs-to-ep') {
      log(Scope.EXTENSION_PAGE, '[cs2ep] handle test:cs-to-ep, arg:', request.args)
      sendResponse({ success: true, data: 'ep received from cs: ' + request.args })
      return true
    }
    return false
  })

  log(Scope.EXTENSION_PAGE, '[setUpEP] Extension page event handlers registered')
}
