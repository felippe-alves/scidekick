# Feature Specification: Durable Research Runtime Foundation

**Feature Branch**: `codex-scidekick-v2-spec-kit`

**Created**: 2026-06-12

**Status**: Implemented

**Input**: User description: "Continue v2 beyond the TUI slice toward independence from Oh My Pi by implementing the durable research runtime foundation."

## User Scenarios & Testing

### User Story 1 - Initialize Research State (Priority: P1)

A researcher starts a v2 research session with a concrete objective, and Scidekick creates local `.sk/research/` state that is independent of coding-agent session internals.

**Why this priority**: Durable Scidekick-owned state is the first architectural boundary needed to make v2 more than a coding-agent prompt or TUI skin.

**Independent Test**: Call `sk research init --session <id> --objective <text>` and verify `.sk/research/state.json`, session state, and a replayable event log exist.

**Acceptance Scenarios**:

1. **Given** an empty workspace, **When** a session is initialized with an objective, **Then** Scidekick records an intake-phase session and points project state at it.
2. **Given** an existing session id, **When** initialization is repeated, **Then** Scidekick refuses to overwrite it.

---

### User Story 2 - Record a Gated Plan (Priority: P2)

A researcher records a draft research plan only when the minimum evidence, success, stop, and rollback gates are present.

**Why this priority**: The v2 architecture requires execution to be gated by explicit evidence and rollback expectations rather than informal chat state.

**Independent Test**: Call `sk research plan` with and without required gate fields and verify only complete plans persist.

**Acceptance Scenarios**:

1. **Given** an initialized session, **When** a complete draft plan is recorded, **Then** session phase becomes `plan` and the active plan id is persisted.
2. **Given** an initialized session, **When** a plan omits expected evidence or rollback, **Then** Scidekick rejects it without changing session state.

---

### User Story 3 - Report Durable Status (Priority: P3)

A researcher asks for session status and sees the phase, objective, active plan, and gate state from `.sk/research/` rather than terminal scrollback or coding-agent memory.

**Why this priority**: Status makes the new runtime observable and gives later orchestration features a stable command surface.

**Independent Test**: Call `sk research status --session <id>` after init and plan recording and verify it reports the persisted state.

## Requirements

### Functional Requirements

- **FR-001**: Runtime MUST persist project-level state under `.sk/research/state.json`.
- **FR-002**: Runtime MUST persist session-level state under `.sk/research/sessions/<session-id>/state.json`.
- **FR-003**: Runtime MUST record initialization and plan updates in the append-first event log.
- **FR-004**: Runtime MUST reject plans that omit expected evidence, success criteria, stop condition, or rollback plan.
- **FR-005**: CLI MUST expose `research init`, `research status`, and `research plan` through `packages/scidekick-cli`.
- **FR-006**: Coding-agent integration MUST remain a thin command wrapper and MUST NOT store v2 state in coding-agent session internals.

### Key Entities

- **ResearchSessionState**: Durable v2 state for one research session, including objective, phase, gates, plans, claims, evidence, and event sequence cursor.
- **ResearchProjectState**: Workspace-level index and current-session pointer.
- **ResearchPlanRecord**: Draft plan with objective, expected evidence, success criteria, stop condition, rollback plan, and status.
- **ClaimRecord**: Typed claim ledger entry for later claim-promotion work.
- **EvidenceRecord**: Typed evidence ledger entry for later analysis and claim support.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Runtime and CLI package tests pass for initialization, gated planning, status reporting, and existing transcript export.
- **SC-002**: `packages/scidekick-runtime` remains independent of TUI and coding-agent internals.
- **SC-003**: New commands read and write `.sk/research/` state without relying on terminal scrollback.

## Assumptions

- The first foundation slice implements intake and plan phases only.
- Scope, evidence review, preregistration, execution, analysis, critique, peer review, claim review, and report generation remain later slices.
- `.sk/research/` stays filesystem-backed with JSON state plus JSONL events.
