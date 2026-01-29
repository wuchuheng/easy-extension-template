/**
 * Shared messaging utilities for chrome.runtime.sendMessage patterns.
 */

import type { CallBack, Cancel, MessageFormat } from '../types'
import { createMessageListener } from './message-listener'

/**
 * Default timeout for ep2cs requests (30 seconds).
 */
export const EP2CS_TIMEOUT_MS = 30_000

/**
 * Converts an unknown error to a standardized error response format.
 * Used for MessageFormat responses (chrome.runtime.sendMessage).
 */
export function errorToResponse(error: unknown): {
  message: string
  stack: string
} {
  return {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? (error.stack ?? '') : '',
  }
}

/**
 * Converts an error to a PortResponseFormat error object.
 * Used for port-based responses (ep2cs relay).
 */
export function errorToPortResponse(error: unknown) {
  return {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? (error.stack ?? '') : '',
  }
}

/**
 * Sends a message via chrome.runtime.sendMessage and handles the response.
 *
 * @throws {Error} If the response indicates failure
 */
export async function sendMessage<Args, Return>(name: string, args: Args): Promise<Return> {
  const msg: MessageFormat<Args, Return> = { event: name, args }
  const result = (await chrome.runtime.sendMessage(msg)) as MessageFormat<Args, Return>['response']

  if (!result?.success) {
    throw new Error(result?.error?.message ?? 'Unknown error')
  }

  return result.data as Return
}

/**
 * Sends a message via chrome.tabs.sendMessage to a specific tab.
 *
 * @throws {Error} If the response indicates failure
 */
export async function sendMessageToTab<Args, Return>(
  name: string,
  args: Args,
  tabId: number
): Promise<Return> {
  const msg: MessageFormat<Args, Return> = { event: name, args }
  const result = (await chrome.tabs.sendMessage(tabId, msg)) as MessageFormat<
    Args,
    Return
  >['response']

  if (!result?.success) {
    throw new Error(result?.error?.message ?? 'Unknown error')
  }

  return result.data as Return
}

/**
 * Registers a chrome.runtime.onMessage listener for a specific event.
 * Returns a cancel function to unregister the listener.
 */
export function registerMessageListener<Args = void, Return = void>(
  name: string,
  callback: CallBack<Args, Return>,
  options?: {
    senderFilter?: (sender: chrome.runtime.MessageSender) => boolean
  }
): Cancel {
  const listener = createMessageListener<Args, Return>(name, options)(callback)
  chrome.runtime.onMessage.addListener(listener)
  return () => chrome.runtime.onMessage.removeListener(listener)
}
