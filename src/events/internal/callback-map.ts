/**
 * Generic in-memory callback storage for one-to-one events.
 * Used by cs2cs, bg2bg, and similar patterns.
 */

import type { CallBack, Cancel } from '../types'

export class CallbackMap {
  private map = new Map<string, Map<number, CallBack<unknown, unknown>>>()
  private nextId = 0

  /**
   * Get all callbacks for an event name.
   */
  get(key: string): Map<number, CallBack<unknown, unknown>> | undefined {
    return this.map.get(key)
  }

  /**
   * Register a callback for an event name.
   * Returns a cancel function to unregister.
   */
  register<Args = void, Return = void>(key: string, callback: CallBack<Args, Return>): Cancel {
    if (!this.map.has(key)) {
      this.map.set(key, new Map())
    }
    const id = ++this.nextId
    this.map.get(key)!.set(id, callback as CallBack<unknown, unknown>)

    return () => {
      const callbackMap = this.map.get(key)
      callbackMap?.delete(id)
      if (callbackMap?.size === 0) {
        this.map.delete(key)
      }
    }
  }

  /**
   * Get the first (and typically only) callback for an event name.
   * Used for one-to-one event patterns.
   */
  getFirst<Args = void, Return = void>(key: string): CallBack<Args, Return> | undefined {
    const callbacks = this.map.get(key)?.values()
    return callbacks?.next().value as CallBack<Args, Return> | undefined
  }

  /**
   * Check if an event has any registered callbacks.
   */
  has(key: string): boolean {
    return this.map.has(key) && this.map.get(key)!.size > 0
  }
}
