import { isTest } from '../config'
import { bg2bg, bg2cs, bg2ep } from './background'
import { log, Scope } from '../logger'

// Need to import ep2bg and cs2bg to handle messages from extension pages and content scripts
import { ep2bg } from '../extensionPage/extensionPage'
import { cs2bg } from '../contentScript/contentScript'

export const setUpBG = () => {
  if (!isTest) {
    return
  }

  // Handle cs2bg messages from content scripts
  const cs2bgEvent = cs2bg<string, string>('test:cs-to-bg')
  cs2bgEvent.handle(async (arg) => {
    log(Scope.BACKGROUND, '[cs2bg] handle test:cs-to-bg, arg:', arg)
    return arg
  })

  // Handle ep2bg messages from extension pages
  const ep2bgEvent = ep2bg<void, string>('test:ep-to-bg')
  ep2bgEvent.handle(async () => {
    log(Scope.BACKGROUND, '[ep2bg] handle test:ep-to-bg')
    return 'bg received from ep'
  })

  // Test bg2bg (internal, returns single value)
  const bgInternalEvent = bg2bg<string, string>('test:bg-to-bg')
  bgInternalEvent.handle(async (arg) => {
    log(Scope.BACKGROUND, '[bg2bg] handle test:bg-to-bg, arg:', arg)
    return arg + ' (bg response)'
  })

  bgInternalEvent.dispatch('hello internal').then((result) => {
    log(Scope.BACKGROUND, '[bg2bg] dispatch test:bg-to-bg, result:', result)
  })

  // Test bg2cs (returns single value) - dispatch to active tab
  // Note: This requires knowing the tab ID, so we'll skip automatic dispatch
  // and let manual testing handle it
  const bg2csEvent = bg2cs<number, number>('test:bg-to-cs')
  bg2csEvent.handle(async (arg) => {
    log(Scope.BACKGROUND, '[bg2cs] handle test:bg-to-cs, arg:', arg)
    return arg * 2
  })

  // Test bg2ep (returns single value)
  const bg2epEvent = bg2ep<string, string>('test:bg-to-ep')
  bg2epEvent.handle(async (arg) => {
    log(Scope.BACKGROUND, '[bg2ep] handle test:bg-to-ep, arg:', arg)
    return 'bg received: ' + arg
  })

  // Dispatch bg2ep to test (extension page should be listening)
  bg2epEvent
    .dispatch('hello from bg')
    .then((result) => {
      log(Scope.BACKGROUND, '[bg2ep] dispatch test:bg-to-ep, result:', result)
    })
    .catch((err) => {
      log(
        Scope.BACKGROUND,
        '[bg2ep] dispatch failed (extension page may not be open):',
        err.message
      )
    })
}
