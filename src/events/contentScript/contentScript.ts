type CallBack<Args, Return> = (args: Args) => Promise<Return>
type Cancel = () => void
type ContentEvent<Args, Return> = {
  dispatch: (args: Args) => Promise<Return[]>
  handle: (callback: CallBack<Args, Return>) => Cancel
}

declare global {
  var cs2csCallBack: Map<string, Map<number, (args: unknown) => Promise<unknown>>>
}

let id = 0
const getNextId = () => {
  return ++id
}

/**
 * Content script to content script event
 * @param name Event name
 * @returns ContentEvent
 */
export const cs2cs = <Args = void, Return = void>(name: string): ContentEvent<Args, Return> => {
  return {
    dispatch: async (args: Args) => {
      const callbackMap = globalThis.cs2csCallBack.get(name)!
      const result: unknown[] = await Promise.all(
        Array.from(callbackMap.values()).map((callback) => callback(args))
      )

      return result as Return[]
    },
    handle: (callback: CallBack<Args, Return>) => {
      if (!globalThis.cs2csCallBack) {
        globalThis.cs2csCallBack = new Map()
      }

      if (!globalThis.cs2csCallBack.has(name)) {
        globalThis.cs2csCallBack.set(name, new Map())
      }
      const id = getNextId()
      const callbackMap = globalThis.cs2csCallBack.get(name)!
      callbackMap.set(id, callback as (args: unknown) => Promise<unknown>)

      return () => {
        callbackMap.delete(id)
      }
    },
  }
}
