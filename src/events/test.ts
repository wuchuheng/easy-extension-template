import { createEvent } from './core'
const backgroundToBackgroundEvent = createEvent<string, string>('backgroundToBackgroundEvent')

export const testBackgroundToBackground = () => {
  const logPrefix = '[test:background-to-background]'
  backgroundToBackgroundEvent.handle(async (data) => {
    console.log(`${logPrefix} The handler is triggered with arg:`, data)
    return 'Hi'
  })
  const arg = 'Hi'
  console.log(`${logPrefix} Try to trigger the event with arg:`, arg)
  backgroundToBackgroundEvent.dispatch(arg).then((res) => {
    console.log(`${logPrefix} The handler returns:`, res)
  })
}
