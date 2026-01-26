# Manual Testing Guide

This guide provides step-by-step instructions for manually testing the Event Relay System in all Chrome extension contexts.

## Prerequisites

1. Build the extension:

   ```bash
   pnpm run build
   ```

2. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` directory

## Test Contexts

### 1. Background Service Worker

**Location**: `chrome://extensions/` → Click "service worker" link

**Steps**:

1. Open DevTools for the background service worker
2. In Console, register event handlers:

   ```javascript
   // This would be imported from the actual event relay code
   const { relayCenter, events } = createEventRegister({
     greeting: async (name) => `Hello, ${name}!`,
     getData: async () => ({ value: 42 }),
     throwError: async () => {
       throw new Error('Test error')
     },
   })

   // Initialize relay center (background only)
   relayCenter()
   ```

3. Verify no errors in console
4. Test calling events:
   ```javascript
   await events.greeting('World')
   // Should return: "Hello, World!"
   ```

**Expected Results**:

- Handlers registered successfully
- `relayCenter()` initializes without errors
- Event calls return correct results

---

### 2. Popup

**Location**: Click extension icon in toolbar

**Steps**:

1. Open extension popup
2. Open DevTools for the popup (right-click → Inspect)
3. In Console, register event handlers:
   ```javascript
   const { events } = createEventRegister({
     popupTask: async (msg) => `Popup received: ${msg}`,
   })
   ```
4. Test event calls:
   ```javascript
   await events.popupTask('test message')
   // Should return: "Popup received: test message"
   ```

**Expected Results**:

- Event handlers registered
- Event calls work from popup context
- Responses received correctly

---

### 3. Options Page

**Location**: Right-click extension icon → Options

**Steps**:

1. Open options page
2. Open DevTools (F12)
3. In Console, register and test:

   ```javascript
   const { events } = createEventRegister({
     saveSettings: async (settings) => {
       console.log('Settings saved:', settings)
       return true
     },
   })

   await events.saveSettings({ theme: 'dark' })
   ```

**Expected Results**:

- Options page can register handlers
- Event calls work correctly
- Console logs show handler execution

---

### 4. Content Script

**Location**: Any web page (e.g., example.com)

**Steps**:

1. Navigate to `https://example.com`
2. Open DevTools (F12)
3. In Console, inject event relay:
   ```javascript
   const { events } = createEventRegister({
     contentHandler: async (data) => {
       console.log('Content script received:', data)
       return 'Content script OK'
     },
   })
   ```
4. Test event call:
   ```javascript
   await events.contentHandler('test data')
   ```

**Expected Results**:

- Content script can register handlers
- Event calls work from content context
- No CORS or security errors

---

### 5. Side Panel

**Location**: Click extension icon → Open side panel (if enabled)

**Steps**:

1. Open side panel
2. Open DevTools for side panel
3. Test event registration and calls:

   ```javascript
   const { events } = createEventRegister({
     sidePanelTask: async () => 'Side panel OK',
   })

   await events.sidePanelTask()
   ```

**Expected Results**:

- Side panel can register handlers
- Event calls work correctly

---

## Test Scenarios

### Scenario 1: Cross-Context Communication

**Test**: Background calls popup handler

1. In Background:

   ```javascript
   await events.popupTask('from background')
   ```

2. In Popup:
   ```javascript
   createEventRegister({
     popupTask: async (msg) => `Popup got: ${msg}`,
   })
   ```

**Expected**: Background receives response from popup handler

---

### Scenario 2: Error Handling

**Test**: Handler throws error

1. Register throwing handler:

   ```javascript
   createEventRegister({
     throwError: async () => {
       throw new Error('Test error')
     },
   })
   ```

2. Call throwing event:
   ```javascript
   try {
     await events.throwError()
   } catch (error) {
     console.error('Caught:', error)
   }
   ```

**Expected**:

- Error is caught
- Error message is preserved
- Stack trace is included

---

### Scenario 3: RelayAccessed Timing

**Test**: Verify 100ms acknowledgment

1. Add timing logs:

   ```javascript
   const start = Date.now()

   chrome.runtime.onMessage.addListener((msg) => {
     if (msg.type === 'relayAccessed') {
       const elapsed = Date.now() - start
       console.log(`relayAccessed received in ${elapsed}ms`)
       expect(elapsed).toBeLessThanOrEqual(100)
     }
   })

   await events.greeting('test')
   ```

**Expected**: relayAccessed arrives within 100ms

---

### Scenario 4: Multiple Handlers

**Test**: Same event in multiple contexts

1. Register `testEvent` in background, popup, and options
2. Call `events.testEvent()` from any context
3. Verify only one handler executes (last registration wins)

**Expected**:

- Only most recently registered handler executes
- No duplicate handler executions

---

### Scenario 5: ID Correlation

**Test**: Verify message ID consistency

1. Add message interceptor:

   ```javascript
   let requestId = null

   const originalSend = chrome.runtime.sendMessage
   chrome.runtime.sendMessage = function (...args) {
     if (args[0]?.type === 'request') {
       requestId = args[0].id
       console.log('Request ID:', requestId)
     }
     return originalSend.apply(chrome.runtime, args)
   }

   chrome.runtime.onMessage.addListener((msg) => {
     console.log('Received message ID:', msg.id)
     if (requestId && msg.id === requestId) {
       console.log('✓ IDs match!')
     }
   })
   ```

**Expected**: All messages in chain have same ID

---

## Debugging Tips

### Enable Debug Mode

```javascript
const { relayCenter, events } = createEventRegister(
  {
    /* handlers */
  },
  { debug: true } // Enable debug logging
)
```

### Common Issues

| Issue                 | Solution                                       |
| --------------------- | ---------------------------------------------- |
| "Relay not available" | Ensure `relayCenter()` is called in background |
| "Handler not found"   | Check handler is registered in calling context |
| "Timeout error"       | Check background service worker is running     |
| "CORS error"          | Ensure using `chrome.runtime` API, not `fetch` |

### Console Commands

```javascript
// Check if relay center is initialized
console.log('Relay ready:', window.__relayCenter !== undefined)

// List registered handlers
console.log('Handlers:', Object.keys(window.__eventHandlers || {}))

// Check pending messages
console.log('Pending:', window.__pendingResponses)
```

---

## Checklist

- [ ] Background service worker: relayCenter initializes
- [ ] Popup: Can register handlers and call events
- [ ] Options: Can register handlers and call events
- [ ] Content script: Can register handlers and call events
- [ ] Side panel: Can register handlers and call events
- [ ] Cross-context: Background can call popup handler
- [ ] Error handling: Thrown errors are caught and returned
- [ ] Timing: relayAccessed arrives within 100ms
- [ ] ID correlation: Message ID consistent through chain
- [ ] Type safety: TypeScript inference works correctly

---

**Document Version**: 1.0
**Last Updated**: 2026-01-27
