# Tasks: Copy-Friendly Research TUI

**Input**: Design documents from `/specs/001-copy-friendly-research-tui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by FR-012 and SC-002. Tests must defend externally observable contracts: event validation, render output, profile defaults, export shape, and compatibility isolation.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently after the foundational event/runtime contracts exist.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish package boundaries and package-local verification surfaces without implementing feature behavior.

- [X] T001 Create `packages/scidekick-runtime/package.json` with workspace metadata, `test`, `check`, and export entries
- [X] T002 Create `packages/scidekick-runtime/src/index.ts` and empty source directories `packages/scidekick-runtime/src/events/`, `packages/scidekick-runtime/src/research-store/`, and `packages/scidekick-runtime/src/status/`
- [X] T003 Create `packages/scidekick-runtime/test/` for runtime contract tests
- [X] T004 Create `packages/scidekick-cli/package.json` with workspace metadata, `test`, `check`, and export entries
- [X] T005 Create `packages/scidekick-cli/src/index.ts` and source directories `packages/scidekick-cli/src/commands/`, `packages/scidekick-cli/src/render/`, `packages/scidekick-cli/src/export/`, and `packages/scidekick-cli/src/fixtures/`
- [X] T006 Create `packages/scidekick-cli/test/` for renderer, export, and CLI adapter tests
- [X] T007 Add `@scidekick/runtime` as a workspace dependency of `packages/scidekick-cli/package.json`
- [X] T008 Verify root workspace package discovery includes `packages/scidekick-runtime` and `packages/scidekick-cli` through existing `package.json` workspace settings

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the structured event model, validation rules, replay fixture, and package separation that all stories depend on.

**CRITICAL**: No user story implementation should begin until this phase is complete.

- [X] T009 [P] Define `ResearchTranscriptEvent`, event kind unions, actor types, reference types, raw artifact pointer types, and support-level types in `packages/scidekick-runtime/src/events/types.ts`
- [X] T010 [P] Define `ResearchStatusSegment`, status segment state, and status priority types in `packages/scidekick-runtime/src/status/types.ts`
- [X] T011 [P] Define `ResearchRenderProfile`, `CopySafeRenderResult`, and `ResearchExportManifest` types in `packages/scidekick-runtime/src/events/render-types.ts`
- [X] T012 Implement event validation helpers for required fields, monotonic sequence checks, tool-error severity, diff body preservation, and claim/evidence/reference requirements in `packages/scidekick-runtime/src/events/validation.ts`
- [X] T013 Implement status segment validation for concise labels, priority ordering, and optional source event references in `packages/scidekick-runtime/src/status/validation.ts`
- [X] T014 Implement append-first JSONL event log read/write interfaces for `.sk/research/` paths in `packages/scidekick-runtime/src/research-store/event-log.ts`
- [X] T015 Implement export manifest read/write interfaces under `.sk/research/exports/` in `packages/scidekick-runtime/src/research-store/export-manifest.ts`
- [X] T016 [P] Add representative fixture event log with state transition, tool call, tool error, diff, claim update, evidence summary, review issue, review round, handoff, run summary, and message events in `packages/scidekick-cli/src/fixtures/research-events.ts`
- [X] T017 [P] Add runtime contract tests for valid and invalid `ResearchTranscriptEvent` records in `packages/scidekick-runtime/test/research-events.test.ts`
- [X] T018 [P] Add runtime contract tests for status segment validation and priority behavior in `packages/scidekick-runtime/test/status-segments.test.ts`
- [X] T019 [P] Add store contract tests for event-log replay order, malformed JSONL handling, and manifest persistence in `packages/scidekick-runtime/test/research-store.test.ts`
- [X] T020 Export only UI-agnostic runtime APIs from `packages/scidekick-runtime/src/index.ts`
- [X] T021 Add a dependency-boundary test that `packages/scidekick-runtime` does not import `@oh-my-pi/pi-tui`, `@oh-my-pi/pi-coding-agent`, or `packages/coding-agent` modules in `packages/scidekick-runtime/test/dependency-boundary.test.ts`

**Checkpoint**: Runtime event contracts, replayable fixture data, and package isolation are ready for renderer stories.

---

## Phase 3: User Story 1 - Copy Research Transcript (Priority: P1) MVP

**Goal**: Render representative research events as clean Markdown-like text that can be copied without box drawing, vertical borders, or decorative line art.

**Independent Test**: Render the fixture event sequence through the default transcript renderer and verify semantic IDs, commands, errors, diffs, claims, evidence, review issues, and raw artifact links remain intelligible with no forbidden chrome.

### Tests for User Story 1

- [X] T022 [P] [US1] Add plain renderer contract test covering state transition, tool call, tool error, diff, claim update, evidence summary, review issue, and run summary in `packages/scidekick-cli/test/research-render-plain.test.ts`
- [X] T023 [P] [US1] Add semantic-content assertions for event IDs, run IDs, trace IDs, claim IDs, evidence IDs, review issue IDs, and raw artifact IDs in `packages/scidekick-cli/test/research-render-plain.test.ts`
- [X] T024 [P] [US1] Add forbidden-chrome assertions for box-drawing glyphs, heavy bounding boxes, vertical rule columns, nested boxes, and repeated decorative dividers in `packages/scidekick-cli/test/research-render-plain.test.ts`
- [X] T025 [P] [US1] Add diff rendering assertions that patch hunks remain copyable and are not wrapped in visual containers in `packages/scidekick-cli/test/research-render-plain.test.ts`

### Implementation for User Story 1

- [X] T026 [US1] Implement plain event formatting for every required event kind in `packages/scidekick-cli/src/render/plain-renderer.ts`
- [X] T027 [US1] Implement reference extraction and `CopySafeRenderResult` metadata assembly in `packages/scidekick-cli/src/render/render-result.ts`
- [X] T028 [US1] Implement long-output summarization with raw artifact links and renderer warnings in `packages/scidekick-cli/src/render/plain-renderer.ts`
- [X] T029 [US1] Implement profile-independent render orchestration for event sequences in `packages/scidekick-cli/src/render/research-renderer.ts`
- [X] T030 [US1] Export renderer APIs from `packages/scidekick-cli/src/index.ts`

**Checkpoint**: User Story 1 is fully functional and testable independently through fixture rendering.

---

## Phase 4: User Story 2 - Preserve Informative Status Line (Priority: P2)

**Goal**: Keep compact interactive status segments for research context while ensuring status chrome is excluded from default export and transcript text remains clean.

**Independent Test**: Render a compact session with changing model, mode, branch, workspace, phase, gate, queue/run, token/context, cost, and approval segments, then verify transcript content remains copy-friendly and export metadata excludes status chrome by default.

### Tests for User Story 2

- [X] T031 [P] [US2] Add compact renderer status-segment test for model, mode, branch, workspace, phase, gate, queue/run, tokens/context pressure, cost, and approval values in `packages/scidekick-cli/test/research-render-compact.test.ts`
- [X] T032 [P] [US2] Add compact renderer forbidden-chrome and semantic-content parity assertions in `packages/scidekick-cli/test/research-render-compact.test.ts`
- [X] T033 [P] [US2] Add export-chrome exclusion assertions for compact rendered sessions in `packages/scidekick-cli/test/research-export.test.ts`

### Implementation for User Story 2

- [X] T034 [US2] Implement compact renderer composition from plain transcript text plus status segments in `packages/scidekick-cli/src/render/compact-renderer.ts`
- [X] T035 [US2] Implement status segment ordering, priority elision, and text sanitization in `packages/scidekick-cli/src/render/status-line.ts`
- [X] T036 [US2] Implement transcript export metadata flagging `includesTerminalChrome: false` by default in `packages/scidekick-cli/src/export/export-transcript.ts`

**Checkpoint**: User Stories 1 and 2 both work independently and compact status does not pollute copied transcript output.

---

## Phase 5: User Story 3 - Choose Display Profile (Priority: P3)

**Goal**: Support `plain`, `compact`, and `rich` profiles with environment-sensitive defaults and semantic parity across profiles.

**Independent Test**: Render the same event sequence through all profiles, verify source event IDs and stable reference IDs match, and verify non-interactive defaults resolve to `plain` while interactive `sk research ...` defaults to `compact`.

### Tests for User Story 3

- [X] T037 [P] [US3] Add profile-selection tests for explicit `plain`, `compact`, `rich`, non-interactive default, and interactive default in `packages/scidekick-cli/test/research-render-profiles.test.ts`
- [X] T038 [P] [US3] Add semantic parity tests comparing event IDs and reference IDs across `plain`, `compact`, and `rich` in `packages/scidekick-cli/test/research-render-profiles.test.ts`
- [X] T039 [P] [US3] Add CLI adapter tests for `sk research export --session <session-id>` reading `.sk/research/` instead of terminal scrollback in `packages/scidekick-cli/test/research-command.test.ts`
- [X] T040 [P] [US3] Add compatibility test that existing coding-agent TUI command registration remains unchanged when Scidekick research commands are added in `packages/coding-agent/test/scidekick-research-compat.test.ts`

### Implementation for User Story 3

- [X] T041 [US3] Implement profile resolution logic in `packages/scidekick-cli/src/render/profile.ts`
- [X] T042 [US3] Implement rich renderer as opt-in grouping over the same source event stream in `packages/scidekick-cli/src/render/rich-renderer.ts`
- [X] T043 [US3] Implement transcript export from `.sk/research/` event logs plus `ResearchExportManifest` writes in `packages/scidekick-cli/src/export/export-transcript.ts`
- [X] T044 [US3] Implement `research` command adapter surface in `packages/scidekick-cli/src/commands/research.ts`
- [X] T045 [US3] Wire the current `sk` binary to dispatch `sk research ...` to the Scidekick-owned adapter without adding new inline imports or changing existing coding-agent session rendering in `packages/coding-agent/src/cli-commands.ts`

**Checkpoint**: All display profiles are selectable, profile semantics match, and the migration adapter is isolated from coding-agent TUI behavior.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate docs, changelog, integration paths, and full-suite readiness after the feature slices are implemented.

- [X] T046 [P] Update `packages/scidekick-runtime/CHANGELOG.md` with an Unreleased entry for runtime research event contracts
- [X] T047 [P] Update `packages/scidekick-cli/CHANGELOG.md` with an Unreleased entry for research transcript rendering and export
- [X] T048 [P] Update `specs/001-copy-friendly-research-tui/quickstart.md` if implementation package names or commands differ from the planned validation commands
- [X] T049 Run `bun --cwd=packages/scidekick-runtime test` and fix failures in `packages/scidekick-runtime/`
- [X] T050 Run `bun --cwd=packages/scidekick-cli test` and fix failures in `packages/scidekick-cli/`
- [ ] T051 Run `bun --cwd=packages/coding-agent test` for compatibility coverage affected by `packages/coding-agent/src/cli-commands.ts`
- [X] T052 Run `bun check` and fix type, lint, or formatting failures across touched packages
- [X] T053 Verify quickstart scenarios in `specs/001-copy-friendly-research-tui/quickstart.md` against implemented commands and tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; establishes package scaffolding.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; MVP renderer slice.
- **User Story 2 (Phase 4)**: Depends on Foundational and reuses US1 plain rendering for transcript content.
- **User Story 3 (Phase 5)**: Depends on Foundational; profile parity depends on US1 and compact behavior depends on US2.
- **Polish (Phase 6)**: Depends on selected implemented stories.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational; no dependency on US2 or US3.
- **User Story 2 (P2)**: Can start after Foundational, but should reuse US1 plain transcript renderer once available.
- **User Story 3 (P3)**: Can start after Foundational for profile resolution, but full parity validation depends on US1 and US2 renderers.

### Within Each User Story

- Test tasks should be written first and fail before implementation.
- Runtime types and validation precede store and renderer code.
- Plain renderer is the source of transcript semantics for compact and rich profiles.
- CLI command wiring comes after renderer and export APIs are testable directly.

### Parallel Opportunities

- T009, T010, and T011 can run in parallel after setup because they define separate type modules.
- T017, T018, and T019 can run in parallel after validation/store interfaces exist.
- T022 through T025 can run in parallel because they add focused assertions to the plain renderer test.
- T031 through T033 can run in parallel after the compact renderer contract is defined.
- T037 through T040 can run in parallel after render/export APIs are available.
- T046 through T048 can run in parallel during polish because they touch separate docs.

---

## Parallel Example: User Story 1

```text
Task: "T022 [P] [US1] Add plain renderer contract test covering state transition, tool call, tool error, diff, claim update, evidence summary, review issue, and run summary in packages/scidekick-cli/test/research-render-plain.test.ts"
Task: "T023 [P] [US1] Add semantic-content assertions for event IDs, run IDs, trace IDs, claim IDs, evidence IDs, review issue IDs, and raw artifact IDs in packages/scidekick-cli/test/research-render-plain.test.ts"
Task: "T024 [P] [US1] Add forbidden-chrome assertions for box-drawing glyphs, heavy bounding boxes, vertical rule columns, nested boxes, and repeated decorative dividers in packages/scidekick-cli/test/research-render-plain.test.ts"
Task: "T025 [P] [US1] Add diff rendering assertions that patch hunks remain copyable and are not wrapped in visual containers in packages/scidekick-cli/test/research-render-plain.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational event contracts and store interfaces.
3. Complete Phase 3: User Story 1 plain renderer.
4. Stop and validate with `bun --cwd=packages/scidekick-runtime test`, `bun --cwd=packages/scidekick-cli test`, and the plain renderer quickstart scenario.

### Incremental Delivery

1. Deliver US1 to make copied transcript output clean and auditable.
2. Add US2 to restore useful interactive research status without polluting exports.
3. Add US3 to expose profile selection, export replay, and `sk research ...` command wiring.
4. Run Phase 6 validation before considering the feature ready for merge.

### Compatibility Boundary

Existing coding-agent TUI behavior, `/autoresearch`, `wiki`, `journal`, and current session rendering are compatibility surfaces. Implementation tasks may add a `research` command adapter, but must not migrate existing coding-agent transcript components or replace current coding-agent TUI behavior in this feature.
