# EP2CS Event System - Root Cause Analysis & Fix Plan

## Problem Statement

The refactored `createEp2CsEvent()` function with automatic environment detection is **not working**. Content scripts are not connecting to the relay service.

## Root Cause Analysis

### The Bug

**`createEp2CsEvent()` runs at module initialization time, NOT at runtime.**

### Why This Fails

```typescript
// src/events/config.ts
export const sayHelloFromOffToCS = createEp2CsEvent<string, void>(
  'sayHelloFromOfscreenToContentScript'
)
```

When `config.ts` is imported:

1. **Module initialization happens once** - `createEp2CsEvent()` is called when the module is first loaded
2. **Environment detection happens once** - `getExtensionEnv()` runs and returns whatever environment the module is loaded in first
3. **Event object is created once** - The returned event object is fixed to that initial environment
4. **All imports share the same object** - When content script and offscreen import `sayHelloFromOffToCS`, they get the **same pre-created object**, not environment-specific versions

### The Flow

```
Build time / Module load:
┌─────────────────────────────────────┐
│ config.ts is loaded                 │
│ ↓                                   │
│ createEp2CsEvent() runs ONCE        │
│ ↓                                   │
│ getExtensionEnv() detects env ONCE  │  ← This is the bug!
│ ↓                                   │
│ Returns ONE event object            │
└─────────────────────────────────────┘

Runtime:
┌─────────────────────┐         ┌─────────────────────────┐
│ Content Script      │         │ Offscreen Document      │
│ imports config      │         │ imports config          │
│ ↓                   │         │ ↓                        │
│ Gets SAME object    │         │ Gets SAME object        │
│ (wrong impl)        │         │ (wrong impl)             │
└─────────────────────┘         └─────────────────────────┘
```

### Why the Test Event Works

The test event `test:ep-to-cs` works because it's created **at runtime** in each context:

```typescript
// src/events/contentScript/contentScript-test.ts
export const setUpCS = () => {
  // Event created when function runs (at runtime in content script context)
  const ep2csEvent = ep2cs<string, number>('test:ep-to-cs')
  ep2csEvent.handle(...)
}
```

## Solutions

### Option 1: Event Factory Function (Recommended)

Export a **function** instead of a pre-created object:

```typescript
// src/events/config.ts
export const createSayHelloFromOffToCS = () => createEp2CsEvent<string, void>('sayHelloFromOfscreenToContentScript')

// Usage:
const event = createSayHelloFromOffToCS()
event.handle(...) / event.dispatch(...)
```

**Pros:** Simple, minimal changes
**Cons:** Still need to call function to get event

### Option 2: Separate Event Names

Use different event names for each context, so each gets its own handler:

```typescript
// src/events/config.ts
export const sayHelloFromOffToCS = {
  forContentScript: ep2cs<string, void>('sayHelloFromOfscreenToContentScript'),
  forExtensionPage: ep2csFromPage<string, void>('sayHelloFromOfscreenToContentScript'),
}
```

**Pros:** Clear separation
**Cons:** Different API for each context

### Option 3: Runtime-Adaptive Event Object

Create an event object that adapts at runtime:

```typescript
export function createAdaptiveEp2CsEvent<Args, Return>(name: string): OneToManyEvent<Args, Return> {
  return {
    dispatch: async (args: Args) => {
      if (isExtensionPage()) {
        return ep2csFromPage<Args, Return>(name).dispatch(args)
      }
      throw new Error('Cannot dispatch from content script')
    },
    handle: (callback) => {
      if (isContentScript()) {
        return ep2cs<Args, Return>(name).handle(callback)
      }
      throw new Error('Cannot handle in extension page')
    },
  }
}
```

**Pros:** Single import, auto-adapts
**Cons:** More complex implementation

### Option 4: Direct Event Creation (Current Working Solution)

Go back to creating events directly where used:

```typescript
// Content script
import { ep2cs } from '@/events'
const sayHelloFromOffToCS = ep2cs<string, void>('sayHelloFromOfscreenToContentScript')

// Offscreen
import { ep2csFromPage } from '@/events'
const sayHelloFromOffToCS = ep2csFromPage<string, void>('sayHelloFromOfscreenToContentScript')
```

**Pros:** Works reliably, simple
**Cons:** Duplicate event name string

## Recommended Solution

**Option 1 (Event Factory Function)** provides the best balance:

- Maintains single source of truth for event names
- Clean API: `createSayHelloFromOffToCS()`
- Minimal code changes
- Environment detection happens at runtime when function is called

## Implementation Plan

1. **Update `src/events/config.ts`:**
   - Change from `export const sayHelloFromOffToCS = createEp2CsEvent(...)`
   - To `export const createSayHelloFromOffToCS = () => createEp2CsEvent(...)`

2. **Update `src/content/main.tsx`:**

   ```typescript
   const sayHelloFromOffToCS = createSayHelloFromOffToCS()
   sayHelloFromOffToCS.handle(...)
   ```

3. **Update `src/offscreen/main.ts`:**

   ```typescript
   const sayHelloFromOffToCS = createSayHelloFromOffToCS()
   sayHelloFromOffToCS.dispatch(...)
   ```

4. **Test** with Chrome DevTools MCP to verify

5. **Optional cleanup:** Remove unused `src/events/create-ep2cs.ts` and `src/events/env.ts` if not needed elsewhere
