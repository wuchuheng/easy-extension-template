import { isTest } from '../config'
import { cs2cs } from './contentScript'

export const setUpTest = () => {
  if (!isTest) {
    return
  }
  const csEvent = cs2cs<string, string>('foolEvent')

  csEvent.handle(async (arg) => {
    console.log(`[cs2cs] handle foolEvent, arg: ${arg}`)
    return arg
  })

  csEvent.dispatch('hello').then((result) => {
    console.log(`[cs2cs] dispatch foolEvent, result:`, result)
  })
}
