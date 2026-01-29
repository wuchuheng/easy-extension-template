# Event System Extension Spec

## Overview

Extend the existing event system to support all communication patterns in a Chrome extension:

- Content Script ↔ Background
- Content Script ↔ Extension Page
- Background ↔ Extension Page
- Background internal events

**Key Changes:**

1. Add 6 new event patterns (cs2ep, bg2bg, bg2cs, bg2ep, ep2bg, ep2cs)
2. Unified logging system with standardized prefixes
3. Comprehensive test infrastructure for all patterns

## Current State

### Existing Patterns

| Pattern | Direction                       | Implementation                             | File                                        |
| ------- | ------------------------------- | ------------------------------------------ | ------------------------------------------- |
| `cs2cs` | Content Script → Content Script | In-memory Map (`globalThis.cs2csCallBack`) | `src/events/contentScript/contentScript.ts` |
| `cs2bg` | Content Script → Background     | `chrome.runtime.sendMessage`               | `src/events/contentScript/contentScript.ts` |

### Core Types (Existing)

```typescript
// Callback and cancel types
type CallBack<Args, Return> = (args: Args) => Promise<Return>
type Cancel = () => void

// Core event interface (one-to-one)
type OneToOneEvent<Args, Return> = {
  dispatch: (args: Args) => Promise<Return>
  handle: (callback: CallBack<Args, Return>) => Cancel
}

// Core event interface (one-to-many)
type OneToManyEvent<Args, Return> = {
  dispatch: (args: Args) => Promise<Return[]>
  handle: (callback: CallBack<Args, Return>) => Cancel
}

// Message format for sendMessage
type MessageFormat<Args, Return> = {
  event: string
  args: Args
  response?: {
    success: boolean
    data?: Return
    error?: {
      message: string
      stack: string
    }
  }
}
```

### Cardinality Rules

| Pattern | Cardinality | Return Type         | Reason                              |
| ------- | ----------- | ------------------- | ----------------------------------- |
| `cs2cs` | 1→1         | `Promise<Return>`   | Single content script context       |
| `cs2bg` | 1→1         | `Promise<Return>`   | Single background context           |
| `cs2ep` | 1→1         | `Promise<Return>`   | Single extension page instance      |
| `bg2bg` | 1→1         | `Promise<Return>`   | Single background context           |
| `bg2cs` | 1→1         | `Promise<Return>`   | Targeted to specific tab            |
| `bg2ep` | 1→1         | `Promise<Return>`   | Single extension page instance      |
| `ep2bg` | 1→1         | `Promise<Return>`   | Single background context           |
| `ep2cs` | 1→\*        | `Promise<Return[]>` | **Multiple tabs can have handlers** |

### Existing Entry Points

| Context         | Entry Point                                                            | Current Init                                                      |
| --------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Background      | `src/background/index.ts`                                              | `setupBackground()` from `src/events/test.ts`                     |
| Content Script  | `src/content/main.tsx`                                                 | `setUpCS()` from `src/events/contentScript/contentScript-test.ts` |
| Extension Pages | `src/popup/main.tsx`, `src/options/main.tsx`, `src/sidepanel/main.tsx` | None                                                              |

### Test Infrastructure (Existing)

**Config:** `src/events/config.ts`

```typescript
export const isTest = true // Hardcoded flag for test mode
```

**Test Setup:** `src/events/test.ts`

```typescript
export const setupContentScript = () => {
  contentScriptTest.setUpCS()
}

export const setupBackground = () => {
  contentScriptTest.setUpBG()
}
```

**Test Cases:** `src/events/contentScript/contentScript-test.ts`

- Tests `cs2cs` with event name `'foolEvent'`
- Tests `cs2bg` with event name `'test:cs-to-bg'`
- Uses ad-hoc console logging

### Current Logging Patterns

| Context        | Current Prefix           | File                               |
| -------------- | ------------------------ | ---------------------------------- |
| Background     | `[background]`           | `src/background/index.ts`          |
| Content Script | `[CRXJS]` (non-standard) | `src/content/main.tsx`             |
| Relay          | `[relay]`                | Various                            |
| Offscreen      | `[offscreen]`            | `src/background/setUpOffscreen.ts` |

**Problem:** Inconsistent prefixes, no centralized logging utility.

---

## Unified Logging System

**New File:** `src/events/logger.ts`

```typescript
export enum Scope {
  BACKGROUND = 'background',
  EXTENSION_PAGE = 'extension-page',
  CONTENT_SCRIPT = 'content-script',
}

export const log = (scope: Scope, message: string, ...args: unknown[]) => {
  const prefix = `[${scope}]`
  console.log(prefix, message, ...args)
}

export const logError = (scope: Scope, message: string, ...args: unknown[]) => {
  const prefix = `[${scope}]`
  console.error(prefix, message, ...args)
}

export const logWarn = (scope: Scope, message: string, ...args: unknown[]) => {
  const prefix = `[${scope}]`
  console.warn(prefix, message, ...args)
}
```

**Standardized Prefixes:**
| Scope | Prefix | Usage |
|-------|--------|-------|
| `Scope.BACKGROUND` | `[background]` | Background service worker |
| `Scope.EXTENSION_PAGE` | `[extension-page]` | Popup, Options, SidePanel |
| `Scope.CONTENT_SCRIPT` | `[content-script]` | Content scripts in web pages |

---

## Proposed Additions

### 1. cs2ep (Content Script → Extension Page)

**Use Case:** Content script needs to communicate with its extension's popup/options page.

**Implementation:**

- Use `chrome.runtime.sendMessage` to broadcast
- Extension page listens via `chrome.runtime.onMessage`
- Only the extension page with matching sender should respond
- Return type: `Return[]` (array, typically single element)

```typescript
cs2ep<string, void>('notification:show').dispatch('Hello World')
```

### 2. bg2bg (Background → Background)

**Use Case:** Internal background event bus for background script modules to communicate.

**Implementation:**

- In-memory Map similar to `cs2cs`
- Store in `globalThis.bg2bgCallBack`
- Simple pub/sub within background context

```typescript
bg2bg<string, void>('storage:updated').dispatch('key changed')
```

### 3. bg2cs (Background → Content Script)

**Use Case:** Background needs to send commands to a specific tab's content script.

**Implementation:**

- Use `chrome.tabs.sendMessage(tabId, message)`
- Target specific tab by ID
- Return type: `Return[]` (array, typically single element)

```typescript
bg2cs<string, void>('refresh').dispatch(tabId, 'data')
```

### 4. bg2ep (Background → Extension Page)

**Use Case:** Background sends updates to extension popup/options page.

**Implementation:**

- Use `chrome.runtime.sendMessage`
- Extension page listens via `chrome.runtime.onMessage`
- Return type: `Return[]` (array, typically single element)

```typescript
bg2ep<number, void>('badge:update').dispatch(count)
```

### 5. ep2bg (Extension Page → Background)

**Use Case:** Popup/options page requests data or actions from background.

**Implementation:**

- Use `chrome.runtime.sendMessage`
- Background listens via `chrome.runtime.onMessage`
- Similar to `cs2bg` but initiated from extension page
- Return type: `Return[]` (array, typically single element)

```typescript
ep2bg<void, string>('fetch:data').dispatch()
```

### 6. ep2cs (Extension Page → Content Script) - **Complex Pattern**

**Use Case:** Extension page needs to send commands to one or more tabs' content scripts.

**Why Complex:**

- One-to-many relationship (one extension page → multiple tabs)
- Each tab has its own content script context
- Need to aggregate responses from all tabs
- Requires long-lived connection management

#### Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Extension Page │         │    Background    │         │  Content Script │
│                 │         │                  │         │   (Tab N)       │
│  ep2cs(event)   │────┐    │                  │    ┌────│  .handle()      │
│                 │    │    │  Port Manager    │    │    │  (connects on   │
│                 │    │    │  (holds ports)   │◄───┘    │   first handle) │
│                 │    │    │                  │         │                 │
└─────────────────┘    │    └──────────────────┘         └─────────────────┘
                       │                 │
                       │                 │
                       │         ┌───────┴────────┐
                       │         │                 │
                       └─────────│Message Relay    │
                                 │ (aggregates     │
                                 │  responses)     │
                                 └─────────────────┘
```

#### Implementation Details

##### Connection Naming Convention

```
ep2cs:<event name>
```

Examples:

- `ep2cs:action:refresh`
- `ep2cs:data:sync`
- `ep2cs:theme:update`

##### Background: Port Manager

**State:**

```typescript
// globalThis.ep2csPorts: Map<string, chrome.Port[]>
// Groups ports by event name (without "ep2cs:" prefix)
```

**Responsibilities:**

1. Listen for incoming connections via `chrome.runtime.onConnect`
2. Validate connection name matches pattern `ep2cs:<event name>`
3. Store port in appropriate group
4. Listen for `port.onDisconnect` to cleanup
5. Receive messages from extension page
6. Relay to all ports in the event group
7. Aggregate responses by message ID
8. Return aggregated results to extension page

##### Content Script: Auto-Connect on First Handle

When `ep2cs(...).handle()` is called in content script:

1. Create long-lived connection to background
2. Connection name: `ep2cs:<event name>`
3. Listen for messages on `port.onMessage`
4. Send response with matching message ID
5. Handle disconnection gracefully

##### Message Flow with Unique ID

```
Extension Page                    Background                    Content Scripts
     |                              |                                |
     |  dispatch(args)              |                                |
     |------------------------------|                                |
     |                              |  msgId: 1738251234567_abc123   |
     |                              |  postMessage() to all ports   |
     |                              |-------------------------------|-----
     |                              |                                |
     |                              |  <--- responses (msgId) ------|-----
     |                              |                                |
     |  <--- Return[] (aggregated)  |  collect all responses         |
     |                              |                                |
```

**Message ID Format:**

```
<timestamp>_<random>
Example: 1738251234567_abc123def456
```

Generated by:

```typescript
const msgId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
```

##### Message Format

```typescript
type Ep2CsMessage<Args, Return> = {
  msgId: string // Unique message identifier
  event: string // Event name (without "ep2cs:" prefix)
  args: Args // Arguments from dispatcher
}

type Ep2CsResponse<Return> = {
  msgId: string // Must match request msgId
  data?: Return // Successful response data
  error?: {
    // Error details
    message: string
    stack: string
  }
}
```

#### API Design

```typescript
// In extension page
const event = ep2cs<string, number>('action:count')
const results = await event.dispatch('increment')
// results: number[] - one element per tab that has a handler
// This is the ONLY pattern that returns an array

// In content script
const cancel = ep2cs<string, number>('action:count').handle(async (args) => {
  return args.length
})
// Automatically establishes connection on first handle()
```

---

## Test Infrastructure Plan

### Test File Structure

```
src/events/
├── test.ts                           # Main test setup (exports)
├── config.ts                         # isTest flag
├── logger.ts                         # 🆕 Unified logging utility
├── contentScript/
│   ├── contentScript.ts              # Existing: cs2cs, cs2bg
│   ├── contentScript-test.ts         # 🔄 Update: Add cs2ep test, use unified logging
├── background/
│   ├── background.ts                 # 🆕 bg2bg, bg2cs, bg2ep, relayService
│   └── background-test.ts            # 🆕 Background event tests
└── extensionPage/
    ├── extensionPage.ts              # 🆕 ep2bg, ep2cs
    └── extensionPage-test.ts         # 🆕 Extension page event tests
```

### Test Case Patterns

**Content Script Tests** (`contentScript-test.ts`):

```typescript
import { isTest } from '../config'
import { cs2bg, cs2cs, cs2ep } from './contentScript'
import { log, Scope } from '../logger'

export const setUpCS = () => {
  if (!isTest) return

  // Test cs2cs (returns single value, not array)
  const csEvent = cs2cs<string, string>('foolEvent')
  csEvent.handle(async (arg) => {
    log(Scope.CONTENT_SCRIPT, '[cs2cs] handle foolEvent, arg:', arg)
    return arg
  })
  csEvent.dispatch('hello').then((result) => {
    // result: string (single value, not array)
    log(Scope.CONTENT_SCRIPT, '[cs2cs] dispatch foolEvent, result:', result)
  })

  // Test cs2bg (returns single value, not array)
  const bgEvent = cs2bg<string, string>('test:cs-to-bg')
  bgEvent.handle(async (arg) => {
    log(Scope.CONTENT_SCRIPT, '[cs2bg] handle test:cs-to-bg, arg:', arg)
    return arg
  })
  bgEvent.dispatch('Hi').then((result) => {
    // result: string (single value, not array)
    log(Scope.CONTENT_SCRIPT, '[cs2bg] dispatch test:cs-to-bg, result:', result)
  })

  // Test cs2ep (NEW, returns single value)
  const epEvent = cs2ep<string, string>('test:cs-to-ep')
  epEvent.dispatch('hello from cs').then((result) => {
    // result: string (single value, not array)
    log(Scope.CONTENT_SCRIPT, '[cs2ep] dispatch test:cs-to-ep, result:', result)
  })
}
```

**Background Tests** (`background-test.ts`):

```typescript
import { isTest } from '../config'
import { bg2bg, bg2cs, bg2ep } from './background'
import { log, Scope } from '../logger'

export const setUpBG = () => {
  if (!isTest) return

  // Test bg2bg (internal)
  const bgInternalEvent = bg2bg<string, string>('test:bg-to-bg')
  bgInternalEvent.handle(async (arg) => {
    log(Scope.BACKGROUND, '[bg2bg] handle test:bg-to-bg, arg:', arg)
    return arg + ' (bg response)'
  })
  bgInternalEvent.dispatch('hello internal').then((result) => {
    log(Scope.BACKGROUND, '[bg2bg] dispatch test:bg-to-bg, result:', result)
  })

  // Test bg2cs
  const bg2csEvent = bg2cs<number, number>('test:bg-to-cs')
  bg2csEvent.handle(async (arg) => {
    log(Scope.BACKGROUND, '[bg2cs] handle test:bg-to-cs, arg:', arg)
    return arg * 2
  })

  // Test bg2ep
  const bg2epEvent = bg2ep<string, string>('test:bg-to-ep')
  bg2epEvent.handle(async (arg) => {
    log(Scope.BACKGROUND, '[bg2ep] handle test:bg-to-ep, arg:', arg)
    return 'bg received: ' + arg
  })
}
```

**Extension Page Tests** (`extensionPage-test.ts`):

```typescript
import { isTest } from '../config'
import { ep2bg, ep2cs } from './extensionPage'
import { log, Scope } from '../logger'

export const setUpEP = () => {
  if (!isTest) return

  // Test ep2bg (returns single value)
  const ep2bgEvent = ep2bg<void, string>('test:ep-to-bg')
  ep2bgEvent.dispatch().then((result) => {
    // result: string (single value, not array)
    log(Scope.EXTENSION_PAGE, '[ep2bg] dispatch test:ep-to-bg, result:', result)
  })

  // Test ep2cs (one-to-many, returns array)
  const ep2csEvent = ep2cs<string, number>('test:ep-to-cs')
  ep2csEvent.dispatch('count tabs').then((result) => {
    // result: number[] (array, one element per tab with handler)
    log(Scope.EXTENSION_PAGE, '[ep2cs] dispatch test:ep-to-cs, result:', result)
  })
}
```

### Entry Point Updates

**Background** (`src/background/index.ts`):

```typescript
import {} from '@/messaging/channels'
import './setUpOffscreen'
import { setupBackground } from '@/events/test'
import { relayService } from '@/events/background/background'

console.log('[background] Script loaded')
relayService() // Start port manager for ep2cs
setupBackground()
```

**Content Script** (`src/content/main.tsx`):

```typescript
import { createRoot } from 'react-dom/client'
import App from './views/App.tsx'
import { setUpCS } from '@/events/test'
import { log, Scope } from '@/events/logger'

log(Scope.CONTENT_SCRIPT, 'Content script loaded')

const container = document.createElement('div')
container.id = 'crxjs-app'
document.body.appendChild(container)
createRoot(container).render(<App />)

setUpCS()
```

**Extension Pages** (`src/popup/main.tsx`, `src/options/main.tsx`, `src/sidepanel/main.tsx`):

```typescript
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { setupExtensionPage } from '@/events/test'
import { log, Scope } from '@/events/logger'

log(Scope.EXTENSION_PAGE, 'Extension page loaded')
setupExtensionPage()

createRoot(document.getElementById('root')!).render(<App />)
```

---

## Summary Table

| Pattern | Direction                       | Implementation          | Connection | Cardinality | Return Type         | Status         |
| ------- | ------------------------------- | ----------------------- | ---------- | ----------- | ------------------- | -------------- |
| `cs2cs` | Content Script → Content Script | In-memory Map           | N/A        | 1→1         | `Promise<Return>`   | ✅ Implemented |
| `cs2bg` | Content Script → Background     | sendMessage             | One-time   | 1→1         | `Promise<Return>`   | ✅ Implemented |
| `cs2ep` | Content Script → Extension Page | sendMessage + onMessage | One-time   | 1→1         | `Promise<Return>`   | ✅ Implemented |
| `bg2bg` | Background → Background         | In-memory Map           | N/A        | 1→1         | `Promise<Return>`   | ✅ Implemented |
| `bg2cs` | Background → Content Script     | tabs.sendMessage        | One-time   | 1→1         | `Promise<Return>`   | ✅ Implemented |
| `bg2ep` | Background → Extension Page     | sendMessage + onMessage | One-time   | 1→1         | `Promise<Return>`   | ✅ Implemented |
| `ep2bg` | Extension Page → Background     | sendMessage + onMessage | One-time   | 1→1         | `Promise<Return>`   | ✅ Implemented |
| `ep2cs` | Extension Page → Content Script | Port + Relay Service    | Long-lived | 1→\*        | `Promise<Return[]>` | ✅ Implemented |

**Legend:** CS=Content Script, BG=Background, EP=Extension Page

---

## Implementation Status

### Completed ✅

| Task                    | Description                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| **Unified Logging**     | Created `src/events/logger.ts` with `Scope` enum and `log()`, `logError()`, `logWarn()` functions |
| **cs2cs Fix**           | Fixed return type from `Promise<Return[]>` to `Promise<Return>` (one-to-one)                      |
| **cs2bg Fix**           | Fixed return type from `Promise<Return[]>` to `Promise<Return>` (one-to-one)                      |
| **cs2ep**               | Implemented content script to extension page communication                                        |
| **bg2bg**               | Implemented background to background internal event bus                                           |
| **bg2cs**               | Implemented background to content script (requires tabId)                                         |
| **bg2ep**               | Implemented background to extension page communication                                            |
| **ep2bg**               | Implemented extension page to background communication                                            |
| **ep2cs**               | Implemented extension page to content script (one-to-many) with relay service                     |
| **relayService**        | Implemented port manager in background for ep2cs relay                                            |
| **Test Infrastructure** | Created test files for all patterns with unified logging                                          |
| **Entry Points**        | Updated background, content script, popup, options, and sidepanel entry points                    |
| **Types**               | Added `OneToOneEvent`, `OneToManyEvent`, `PortMessageFormat`, `PortResponseFormat` to `types.ts`  |

### Breaking Changes ⚠️

| Pattern | Before              | After             |
| ------- | ------------------- | ----------------- |
| `cs2cs` | `Promise<Return[]>` | `Promise<Return>` |
| `cs2bg` | `Promise<Return[]>` | `Promise<Return>` |

**Migration Example:**

```typescript
// Before
const [result] = await cs2cs<string, string>('event').dispatch('hello')

// After
const result = await cs2cs<string, string>('event').dispatch('hello')
```

---

## New Files Created

| File                                             | Purpose                                    |
| ------------------------------------------------ | ------------------------------------------ |
| `src/events/logger.ts`                           | ✅ Unified logging utility with Scope enum |
| `src/events/background/background.ts`            | ✅ bg2bg, bg2cs, bg2ep, relayService       |
| `src/events/background/background-test.ts`       | ✅ Test cases for background events        |
| `src/events/extensionPage/extensionPage.ts`      | ✅ ep2bg, ep2cs                            |
| `src/events/extensionPage/extensionPage-test.ts` | ✅ Test cases for extension page events    |

## Files Updated

| File                                             | Changes                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| `src/events/types.ts`                            | ✅ Added OneToOneEvent, OneToManyEvent, PortMessageFormat, PortResponseFormat |
| `src/events/contentScript/contentScript.ts`      | ✅ Fixed cs2cs/cs2bg return types, added cs2ep, added ep2cs handler           |
| `src/events/contentScript/contentScript-test.ts` | ✅ Updated with unified logging, added cs2ep test                             |
| `src/events/test.ts`                             | ✅ Added setupExtensionPage export, updated setupBackground                   |
| `src/background/index.ts`                        | ✅ Added relayService() call, uses unified logging                            |
| `src/content/main.tsx`                           | ✅ Uses setupContentScript(), unified logging                                 |
| `src/popup/main.tsx`                             | ✅ Added setupExtensionPage(), unified logging                                |
| `src/options/main.tsx`                           | ✅ Added setupExtensionPage(), unified logging                                |
| `src/sidepanel/main.tsx`                         | ✅ Added setupExtensionPage(), unified logging                                |

---

## Open Questions (Resolved)

1. **Tab filtering for `bg2cs`**: ✅ **Resolved** - `bg2cs` requires explicit `tabId` as first argument or via object syntax
2. **Timeout for `ep2cs`**: ✅ **Resolved** - 30 second timeout implemented in extensionPage.ts
3. **Error handling**: ✅ **Resolved** - Errors are collected in responses; all responses are aggregated before returning
4. **Connection retry**: ✅ **Resolved** - Content scripts auto-connect on first `.handle()` call; disconnection is handled gracefully
