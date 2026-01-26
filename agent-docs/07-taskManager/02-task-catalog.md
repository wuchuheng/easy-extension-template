<!--
TEMPLATE MAP (reference-only)
.claude/templates/docs/07-task-catalog.md

OUTPUT MAP (write to)
agent-docs/07-taskManager/02-task-catalog.md

NOTES
- This is the SOURCE OF TRUTH for the "Worker Agent".
- Release-grouped: tasks live under a release version header.
- Status is tracked via checkbox markers.
- Tasks must be small, actionable, and testable.
-->

# 02 Task Catalog (Release Grouped)

## Status Legend

- `[ ]` **Pending**: Ready to be picked up.
- `[-]` **In Progress**: Currently being executed by a Worker.
- `[x]` **Completed**: Tested, Verified, and Merged.

## Release v1.1.0 (Active) - Event Relay System

**Target**: 2026-01-27 (1-day sprint)

---

- [x] **TASK-101**: [Code] Implement Event Relay System
  - **Priority**: P0 (Blocker)
  - **Dependencies**: None
  - **Boundary**: `src/events/types.ts`, `src/events/relay.ts`, `src/events/index.ts`
  - **Spec**: `agent-docs/05-design/03-modules/events.md`
  - **Micro-Spec**: [complete](agent-docs/08-task/active/TASK-101.md)
  - **Subtasks**:
    - Create `/src/events/` directory structure
    - Implement type definitions (`Role`, `MessageType`, `EventEnvelope`, etc.)
    - Implement `createEventRegister()` with TypeScript generics
    - Implement `relayCenter()` background initialization
    - Implement event proxy with ID generation
    - Implement request envelope creation and serialization
    - Implement relayAccessed acknowledgment (100ms)
    - Implement broadcast logic with `from`/`to` field updates
    - Implement handler listeners in all contexts
    - Implement response routing by ID to originating client
    - Implement try/catch around handler execution
    - Implement error serialization (message + stack)
    - Add TSDoc comments to public API
  - **DoD**:
    - `npm run typecheck` passes
    - `npm run lint:fix` passes
    - All exported functions have TSDoc
    - No console errors/warnings

- [x] **TASK-102**: [Test] Implement E2E Tests
  - **Priority**: P0 (Blocker)
  - **Dependencies**: TASK-101
  - **Boundary**: `tests/e2e/`, `vitest.config.ts`, `playwright.config.ts`
  - **Spec**: `agent-docs/01-discovery/04-feature.md` section 4
  - **Micro-Spec**: [complete](agent-docs/08-task/active/TASK-102.md)
  - **Subtasks**:
    - Set up Vitest + Playwright environment
    - Create extension testing utilities
    - Implement E2E tests 1-5 (basic, timeout, multi-context, errors, cross-tab)
    - Implement E2E tests 6-10 (content script, popup relay, concurrent, type verification, ID correlation)
    - Run all tests, fix failures
    - Manual testing in all contexts
  - **DoD**:
    - All 10 E2E tests pass
    - Manual testing succeeds in all contexts (popup, options, content, background, sidepanel)
    - No errors in console

---

## Release v1.2.0 (Backlog)

- [ ] **TASK-201**: [To Be Defined]: Placeholder
  - **Priority**: P2
  - **Dependencies**: None
  - **Boundary**: TBD
  - **DoD**: TBD
