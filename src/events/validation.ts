/**
 * Check if the message is a letter.
 * @param message The message to check.
 * @returns True if the message is a letter, false otherwise.
 */
export const checkIsLetterFormat = (message: unknown): boolean => {
  if (typeof message !== 'object' || message === null) {
    return false
  }
  if (!('from' in message)) {
    return false
  }
  if (!('to' in message)) {
    return false
  }
  return true
}
