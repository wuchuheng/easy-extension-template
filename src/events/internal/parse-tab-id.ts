/**
 * Utilities for parsing tabId from bg2cs dispatch arguments.
 */

/**
 * Parses arguments from bg2cs dispatch.
 * Supports both tuple syntax `[args, tabId]` and object syntax `{ tabId, ...args }`.
 *
 * @returns A tuple of [args, tabId]
 * @throws {Error} If tabId is not provided
 */
export function parseArgsAndTabId<Args>(
  argsAndTabId: (Args & { tabId: number }) | [Args, number]
): [Args, number] {
  let args: Args
  let tabId: number

  if (Array.isArray(argsAndTabId) && argsAndTabId.length === 2) {
    ;[args, tabId] = argsAndTabId as [Args, number]
  } else {
    const obj = argsAndTabId as Args & { tabId: number }
    tabId = obj.tabId

    const { tabId: _, ...rest } = obj
    args = rest as Args
  }

  if (tabId === undefined) {
    throw new Error('tabId is required for bg2cs')
  }

  return [args, tabId]
}
