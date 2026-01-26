<!--
TEMPLATE MAP (reference-only)
.claude/templates/docs/00-control/00-spec.md

OUTPUT MAP (write to)
agent-docs/00-control/00-spec.md

NOTES
- Keep headings unchanged.
- Keep this file concise and link to stage docs for detail.
-->

# 00 Project Spec

## 1) Project summary

- **One-sentence description**: Chrome extension template with React UI and TypeScript
- **Primary users**: Extension developers building Chrome extensions with Manifest V3

## 2) Goals and success criteria

- **Goals**:
  - Provide a modern Chrome extension development template
  - Support multiple extension contexts (popup, options, content, sidepanel, offscreen)
  - Enable type-safe inter-context communication
- **Success criteria**:
  - Full TypeScript type inference for messaging
  - All contexts can communicate seamlessly
  - Easy to extend for new features
- **Non-goals**:
  - Not a full-featured extension (template only)
  - No business logic included
- **Source of truth**: `agent-docs/01-discovery/01-brief.md`, `agent-docs/01-discovery/02-requirements.md`, `agent-docs/01-discovery/03-scope.md`

## 3) Current stage

- **Current stage (1-8)**: Stage 8 (Worker) - TASK-101 Complete, TASK-102 Complete
- **Active release**: v1.1.0 (Event Relay System)
- **Status summary**: Event Relay System (F-001) implementation complete (TASK-101, TASK-102). Manual testing pending.
- **Last updated (YYYY-MM-DD)**: 2026-01-27

## 4) Technology stack (chosen in Stage 2)

- **Language/Runtime**: TypeScript 5.8+, Node.js
- **Backend Framework**: Chrome Extension Manifest V3 (Service Worker)
- **Client/UI**: React 19, TypeScript
- **Database**: Chrome Storage API (no external database)
- **Cache**: N/A
- **Messaging**: Custom channel-based system + Event Relay System
- **Auth**: N/A (local extension)
- **Infrastructure**: Vite 7, CRXJS Vite Plugin 2
- **CI/CD**: N/A (template project)
- **Observability**: Console logging (per context)

## 5) Document index (reading order)

- `agent-docs/00-control/01-status.md`
- `agent-docs/01-discovery/01-brief.md`
- `agent-docs/01-discovery/02-requirements.md`
- `agent-docs/01-discovery/03-scope.md`
- `agent-docs/01-discovery/04-feature.md` (F-001: Event Relay System)
- `agent-docs/02-feasibility/01-options.md`
- `agent-docs/03-architecture/01-hld.md`
- `agent-docs/03-architecture/02-dataflow.md`
- `agent-docs/03-architecture/03-deployment.md`
- `agent-docs/04-adr/`
- `agent-docs/05-design/01-contracts/01-api.md`
- `agent-docs/05-design/01-contracts/02-events.md`
- `agent-docs/05-design/01-contracts/03-errors.md`
- `agent-docs/05-design/03-modules/events.md`
- `agent-docs/06-implementation/01-build-and-run.md`
- `agent-docs/06-implementation/02-test-plan.md`
- `agent-docs/06-implementation/03-observability.md`
- `agent-docs/06-implementation/04-release-and-rollback.md`
- `agent-docs/07-taskManager/01-roadmap.md`
- `agent-docs/07-taskManager/02-task-catalog.md`
- `agent-docs/08-task/`

## 6) Recent changes

- **2026-01-27**: TASK-102 (E2E Tests) complete. Vitest + Playwright setup, 10 E2E test scenarios implemented, test utilities created.
- **2026-01-27**: TASK-101 (Event Relay System coding) complete. All type definitions, createEventRegister, relayCenter implemented.
- **2026-01-27**: S5 Design complete for Event Relay System (F-001). API contracts, events, errors, and module LLD documented.
- **2026-01-27**: S3 HLD and S5 API contracts scaffolded for existing channel system.
- **2026-01-27**: Feature F-001 (Event Relay System) approved via S1 Iteration Lead workflow.
