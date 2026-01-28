import { ExtensionEnv } from './types'
import { getExtensionEnv } from './utiles'
import { checkEventName } from './validation'

export interface ExtensionEvent<TArgs = void, TReturn = void> {
  // Dispatch event.
  dispatch: (data: TArgs) => Promise<TReturn[]>

  // Handler event
  handle: (callback: (data: TArgs) => Promise<TReturn>) => void
}

export const createEvent = <TArgs = void, TReturn = void>(
  name: string
): ExtensionEvent<TArgs, TReturn> => {
  // 1. Validate the event name has been used.

  return {
    dispatch: async (data) => {
      switch (getExtensionEnv()) {
        case ExtensionEnv.Background: {
          return dispatchEventInBackgroundScope<TArgs, TReturn>(name, data)
          break
        }
        case ExtensionEnv.ContentScript: {
          throw new Error('Not implemented')
          break
        }

        case ExtensionEnv.ExtensionPage:
          throw new Error('Not implemented')
          break
      }
    },
    handle: (callback: (data: TArgs) => Promise<TReturn>) => {
      const env = getExtensionEnv()
      switch (env) {
        case ExtensionEnv.Background: {
          registerEventToBackgroundScope<TArgs, TReturn>(name, callback)

          const isUsed =
            globalThis.extensionEvents.events && globalThis.extensionEvents.events.has(name)
          if (!isUsed) {
            throw new Error(`Event ${name} has not been used.`)
          }
          break
        }
        case ExtensionEnv.ContentScript: {
          break
        }

        case ExtensionEnv.ExtensionPage:
          checkEventName(name)
          break
      }
    },
  }
}

export const foolEvent = createEvent<string, string>('test')

/**
 * Register event to background scope.
 * @param name Event name.
 * @param callback Event callback.
 */
const registerEventToBackgroundScope = <TArgs = void, TReturn = void>(
  name: string,
  callback: (data: TArgs) => Promise<TReturn>
) => {
  if (!globalThis.extensionEvents.events) {
    globalThis.extensionEvents.events = new Map()
  }

  if (globalThis.extensionEvents.events.has(name)) {
    throw new Error(
      `Event ${name} has been registered, from ${globalThis.extensionEvents.events.get(name)!.from}`
    )
  }

  globalThis.extensionEvents.events.set(name, {
    from: ExtensionEnv.Background,
    backgroundCallback: callback as <TArgs, TReturn>(data: TArgs) => Promise<TReturn>,
  })
}

const dispatchEventInBackgroundScope = async <TArgs = void, TReturn = void>(
  name: string,
  data: TArgs
): Promise<TReturn[]> => {
  if (!globalThis.extensionEvents.events) {
    throw new Error('Extension events not initialized.')
  }

  const event = globalThis.extensionEvents.events.get(name)
  if (!event) {
    throw new Error(`Event ${name} not found.`)
  }

  if (event.from !== ExtensionEnv.Background) {
    throw new Error(`Event ${name} is not registered in background scope.`)
  }

  const result = await event.backgroundCallback(data)
  return [result] as TReturn[]
}
