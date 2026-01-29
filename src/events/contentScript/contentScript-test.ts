import { isTest } from '../config'
import { cs2bg, cs2cs } from './contentScript'
import { bg2cs } from '../background/background'
import { ep2cs } from '../unified-ep2cs'
import { log, Scope } from '../logger'

export const setUpCS = () => {
  if (!isTest) {
    return
  }

  // Test cs2cs (returns single value, not array)
  const csEvent = cs2cs<string, string>('foolEvent')
  csEvent.handle(async (arg) => {
    log(Scope.CONTENT_SCRIPT, '[cs2cs] handle foolEvent, arg:', arg)
    return arg
  })

  // Test cs2cs dispatch (self-test) - this works immediately
  csEvent
    .dispatch('hello from cs')
    .then((result) => {
      log(Scope.CONTENT_SCRIPT, '[cs2cs] dispatch foolEvent, result:', result)
    })
    .catch((err) => {
      log(Scope.CONTENT_SCRIPT, '[cs2cs] dispatch failed:', err.message)
    })

  // Test cs2bg (returns single value) - use retry mechanism to wait for background
  const bgEvent = cs2bg<string, string>('test:cs-to-bg')
  const dispatchToBackground = async (retries = 5, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await bgEvent.dispatch('Hi from cs')
        log(Scope.CONTENT_SCRIPT, '[cs2bg] dispatch test:cs-to-bg, result:', result)
        return // Success, exit retry loop
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        log(Scope.CONTENT_SCRIPT, `[cs2bg] Attempt ${i + 1}/${retries} failed:`, errorMessage)
        if (i < retries - 1) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
    log(Scope.CONTENT_SCRIPT, '[cs2bg] All retries exhausted')
  }
  // Start retry after a short initial delay
  setTimeout(() => dispatchToBackground(), 500)

  // Test cs2ep (returns single value) - only if extension page is open
  // Don't dispatch immediately - extension page might not be open
  // const epEvent = cs2ep<string, string>('test:cs-to-ep')
  // epEvent.dispatch('hello from cs').then((result) => {
  //   log(Scope.CONTENT_SCRIPT, '[cs2ep] dispatch test:cs-to-ep, result:', result)
  // })

  // Test ep2cs (one-to-many, returns array) - handler side
  const ep2csEvent = ep2cs<string, number>('test:ep-to-cs')
  ep2csEvent.handle(async (arg) => {
    log(Scope.CONTENT_SCRIPT, '[ep2cs] handle test:ep-to-cs, arg:', arg)
    return 42
  })

  // Handle bg2cs messages from background
  const bg2csEvent = bg2cs<number, number>('test:bg-to-cs')
  bg2csEvent.handle(async (arg) => {
    log(Scope.CONTENT_SCRIPT, '[bg2cs] handle test:bg-to-cs, arg:', arg)
    return arg * 2
  })

  log(Scope.CONTENT_SCRIPT, '[setUpCS] Content script event handlers registered')
}
