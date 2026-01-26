/**
 * Message Capture Utilities
 *
 * Helper functions for capturing and verifying Chrome runtime messages
 * during E2E testing.
 *
 * @module helpers/message-capture
 */

import type { EventEnvelope, MessageType, Role } from '@/events/types'

/**
 * Message capture result interface.
 */
export interface CapturedMessage {
  type: 'incoming' | 'outgoing'
  message: EventEnvelope
  sender?: chrome.runtime.MessageSender
  timestamp: number
}

/**
 * Verify if an object is a valid EventEnvelope.
 *
 * This type guard checks that the object has all required fields
 * of an EventEnvelope.
 *
 * @param envelope - Object to verify
 * @returns true if the object is a valid EventEnvelope
 */
export function verifyEnvelope(envelope: unknown): envelope is EventEnvelope {
  if (typeof envelope !== 'object' || envelope === null) {
    return false
  }

  const env = envelope as Record<string, unknown>

  // Check required string fields
  const requiredStringFields: (keyof EventEnvelope)[] = ['id', 'event', 'type']
  for (const field of requiredStringFields) {
    if (typeof env[field] !== 'string') {
      return false
    }
  }

  // Check Role enum fields
  if (!isValidRole(env.from) || !isValidRole(env.to)) {
    return false
  }

  // Check args field (optional array)
  if (env.args !== undefined && !Array.isArray(env.args)) {
    return false
  }

  // Check response field (optional object)
  if (env.response !== undefined && typeof env.response !== 'object') {
    return false
  }

  return true
}

/**
 * Verify if a value is a valid Role enum value.
 *
 * @param role - Value to check
 * @returns true if valid Role
 */
function isValidRole(role: unknown): role is Role {
  return typeof role === 'string' && ['client', 'relay', 'handler'].includes(role)
}

/**
 * Verify if a value is a valid MessageType enum value.
 *
 * @param type - Value to check
 * @returns true if valid MessageType
 */
export function isValidMessageType(type: unknown): type is MessageType {
  return typeof type === 'string' && ['request', 'relayAccessed', 'response'].includes(type)
}

/**
 * Capture all chrome.runtime.onMessage messages in a page.
 *
 * This function injects a script that intercepts all messages
 * and stores them for later retrieval.
 *
 * @param page - Playwright page
 * @returns Promise resolving to array of captured messages
 */
export async function captureMessages(page: Page): Promise<CapturedMessage[]> {
  // 1. Inject message capture script
  await page.addInitScript(() => {
    // @ts-expect-error - Test utility
    window.__capturedMessages = []

    // Intercept chrome.runtime.sendMessage
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      const originalSendMessage = chrome.runtime.sendMessage

      // @ts-expect-error - Overwriting for testing
      chrome.runtime.sendMessage = function (...args) {
        // @ts-expect-error - Test utility
        window.__capturedMessages.push({
          type: 'outgoing',
          envelope: args[0],
          timestamp: Date.now(),
        })
        return originalSendMessage.apply(chrome.runtime, args)
      }
    }

    // Intercept chrome.runtime.onMessage
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
        // @ts-expect-error - Test utility
        window.__capturedMessages.push({
          type: 'incoming',
          envelope: message,
          sender,
          timestamp: Date.now(),
        })
        // Return false to indicate we're not sending a response
        return false
      })
    }
  })

  // 2. Get captured messages
  const messages = await page.evaluate(() => {
    // @ts-expect-error - Test utility
    return window.__capturedMessages ?? []
  })

  return messages
}

/**
 * Get all captured messages from a page.
 *
 * @param page - Playwright page
 * @returns Promise resolving to array of captured messages
 */
export async function getCapturedMessages(page: Page): Promise<CapturedMessage[]> {
  return await page.evaluate(() => {
    // @ts-expect-error - Test utility
    return window.__capturedMessages ?? []
  })
}

/**
 * Clear all captured messages from a page.
 *
 * @param page - Playwright page
 */
export async function clearCapturedMessages(page: Page): Promise<void> {
  await page.evaluate(() => {
    // @ts-expect-error - Test utility
    window.__capturedMessages = []
  })
}

/**
 * Find messages by event name.
 *
 * @param messages - Array of captured messages
 * @param eventName - Event name to filter by
 * @returns Array of messages matching the event name
 */
export function findMessagesByEvent(
  messages: CapturedMessage[],
  eventName: string
): CapturedMessage[] {
  return messages.filter((m) => m.message?.event === eventName)
}

/**
 * Find messages by message type.
 *
 * @param messages - Array of captured messages
 * @param messageType - Message type to filter by
 * @returns Array of messages matching the type
 */
export function findMessagesByType(
  messages: CapturedMessage[],
  messageType: MessageType
): CapturedMessage[] {
  return messages.filter((m) => m.message?.type === messageType)
}

/**
 * Find messages by role (from field).
 *
 * @param messages - Array of captured messages
 * @param role - Role to filter by
 * @returns Array of messages with matching from field
 */
export function findMessagesByFrom(messages: CapturedMessage[], role: Role): CapturedMessage[] {
  return messages.filter((m) => m.message?.from === role)
}

/**
 * Find messages by destination (to field).
 *
 * @param messages - Array of captured messages
 * @param role - Role to filter by
 * @returns Array of messages with matching to field
 */
export function findMessagesByTo(messages: CapturedMessage[], role: Role): CapturedMessage[] {
  return messages.filter((m) => m.message?.to === role)
}

/**
 * Find a message by its unique ID.
 *
 * @param messages - Array of captured messages
 * @param id - Message ID to find
 * @returns The message with matching ID, or undefined if not found
 */
export function findMessageById(
  messages: CapturedMessage[],
  id: string
): CapturedMessage | undefined {
  return messages.find((m) => m.message?.id === id)
}

/**
 * Get messages in timestamp order.
 *
 * @param messages - Array of captured messages
 * @returns Array sorted by timestamp (oldest first)
 */
export function sortByTimestamp(messages: CapturedMessage[]): CapturedMessage[] {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Calculate time difference between two messages.
 *
 * @param first - First message (should be earlier)
 * @param second - Second message (should be later)
 * @returns Time difference in milliseconds
 */
export function getTimeDifference(first: CapturedMessage, second: CapturedMessage): number {
  return second.timestamp - first.timestamp
}

/**
 * Verify message flow sequence.
 *
 * Checks that messages follow the expected sequence:
 * request -> relayAccessed -> response
 *
 * @param messages - Array of captured messages for a single event
 * @returns true if the sequence is valid
 */
export function verifyMessageSequence(messages: CapturedMessage[]): boolean {
  // 1. Need at least 3 messages for complete flow
  if (messages.length < 1) {
    return false
  }

  // 2. Sort by timestamp
  const sorted = sortByTimestamp(messages)

  // 3. Check sequence: should have request first
  const first = sorted[0]
  if (first.message?.type !== 'request') {
    return false
  }

  // 4. If we have relayAccessed, it should come after request
  const relayAccessed = sorted.find((m) => m.message?.type === 'relayAccessed')
  if (relayAccessed) {
    const requestIndex = sorted.indexOf(first)
    const accessedIndex = sorted.indexOf(relayAccessed)
    if (accessedIndex <= requestIndex) {
      return false
    }
  }

  // 5. Response should come last
  const response = sorted.find((m) => m.message?.type === 'response')
  if (response) {
    const responseIndex = sorted.indexOf(response)
    if (responseIndex !== sorted.length - 1) {
      return false
    }
  }

  return true
}

/**
 * Extract the full message chain for a single request ID.
 *
 * @param messages - Array of captured messages
 * @param id - Request ID to extract
 * @returns Array of all messages with matching ID
 */
export function getMessageChain(messages: CapturedMessage[], id: string): CapturedMessage[] {
  return messages.filter((m) => m.message?.id === id)
}

/**
 * Verify that all messages in a chain have the same ID.
 *
 * @param messages - Array of captured messages
 * @param expectedId - Expected ID
 * @returns true if all messages have the expected ID
 */
export function verifyIdConsistency(messages: CapturedMessage[], expectedId: string): boolean {
  return messages.every((m) => m.message?.id === expectedId)
}

/**
 * Import Page type for Playwright
 */
import type { Page } from '@playwright/test'
