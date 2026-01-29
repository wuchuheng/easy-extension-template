import { isTest } from '../config'
import { ep2bg } from './extensionPage'
import { bg2ep } from '../background/background'
import { cs2ep } from '../contentScript/contentScript'
import { ep2cs } from '../unified-ep2cs'
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
  const bg2epEvent = bg2ep<string, string>('test:bg-to-ep')
  bg2epEvent.handle(async (arg) => {
    log(Scope.EXTENSION_PAGE, '[bg2ep] handle test:bg-to-ep, arg:', arg)
    return 'ep received: ' + arg
  })

  // Handle cs2ep messages from content script
  const cs2epEvent = cs2ep<string, string>('test:cs-to-ep')
  cs2epEvent.handle(async (arg) => {
    log(Scope.EXTENSION_PAGE, '[cs2ep] handle test:cs-to-ep, arg:', arg)
    return 'ep received from cs: ' + arg
  })

  log(Scope.EXTENSION_PAGE, '[setUpEP] Extension page event handlers registered')
}
