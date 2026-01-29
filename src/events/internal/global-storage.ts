/**
 * Global storage utilities for Chrome extension event system.
 *
 * Chrome extensions have multiple isolated contexts (background, content scripts, extension pages).
 * This module provides utilities for managing global state across these contexts.
 */

/**
 * Gets or initializes a value in globalThis.
 *
 * @template T - The type of the stored value
 * @param key - The global key to store under
 * @param initializer - Function to create the initial value if not exists
 * @returns The stored or initialized value
 *
 * @example
 * ```ts
 * const callbacks = getGlobalStorage('myCallbacks', () => new Map())
 * ```
 */
export function getGlobalStorage<T>(key: string, initializer: () => T): T {
  const storage = globalThis as Record<string, unknown>
  if (!(key in storage)) {
    storage[key] = initializer()
  }
  return storage[key] as T
}

/**
 * Checks if a global key exists.
 *
 * @param key - The global key to check
 * @returns true if the key exists in globalThis
 */
export function hasGlobalStorage(key: string): boolean {
  return key in globalThis
}

/**
 * Sets a value in globalThis.
 *
 * @template T - The type of the value
 * @param key - The global key to store under
 * @param value - The value to store
 */
export function setGlobalStorage<T>(key: string, value: T): void {
  const storage = globalThis as Record<string, unknown>
  storage[key] = value
}

/**
 * Deletes a value from globalThis.
 *
 * @param key - The global key to delete
 */
export function deleteGlobalStorage(key: string): void {
  const storage = globalThis as Record<string, unknown>
  delete storage[key]
}
