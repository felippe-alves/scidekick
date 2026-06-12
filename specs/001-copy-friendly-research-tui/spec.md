# Feature Specification: Copy-Friendly Research TUI

**Feature Branch**: `001-copy-friendly-research-tui`

**Created**: 2026-06-11

**Status**: Ready for Implementation

**Input**: User description: "Redesign the Scidekick v2 research TUI so it keeps
the original Pi-style copy-friendly transcript, avoids Oh My Pi's noisy boxes
and line art, and preserves the informative Oh My Pi status-line segments."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copy Research Transcript (Priority: P1)

As a researcher, I can copy terminal output from a Scidekick research session
into Markdown notes, a paper draft, a GitHub issue, or a rebuttal plan without
manual cleanup of borders, boxes, or decorative line art.

**Why this priority**: The transcript is part of the research workflow. If the
TUI pollutes copied text, it directly harms evidence review, peer review,
reproducibility notes, and claim auditing.

**Independent Test**: Render representative research events in the default
profile, copy the output as plain text, and verify that commands, errors, claim
summaries, review issues, and evidence links remain readable Markdown-like text
without box-drawing chrome.

**Acceptance Scenarios**:

1. **Given** a research session emits tool calls, errors, evidence summaries,
   claims, and review issues, **When** the default TUI renders them, **Then**
   the transcript contains no heavy bounding boxes, vertical rule columns, or
   repeated decorative dividers.
2. **Given** a researcher copies the rendered transcript into a Markdown file,
   **When** the copied text is read outside the terminal, **Then** the commands,
   outputs, claim IDs, evidence IDs, and review issue IDs remain intelligible.

---

### User Story 2 - Preserve Informative Status Line (Priority: P2)

As a researcher, I can still see compact status-line segments for model, mode,
branch, research phase, gate state, queue/run state, token or context pressure,
cost, and approval state while the transcript stays clean.

**Why this priority**: Oh My Pi's useful status-line metadata should be retained
because long-running research needs situational awareness, but the metadata must
not pollute copied content.

**Independent Test**: Render a session with changing model, branch, phase, gate,
queue, and approval states and verify that the status line updates while
exported transcript content excludes terminal chrome by default.

**Acceptance Scenarios**:

1. **Given** a session moves from planning to execution, **When** the TUI updates,
   **Then** the status line shows the active research phase and gate status.
2. **Given** transcript export is requested, **When** the export is written,
   **Then** status-line chrome is omitted unless the user explicitly asks to
   include status metadata.

---

### User Story 3 - Choose Display Profile (Priority: P3)

As a researcher or script author, I can choose `plain`, `compact`, or `rich`
rendering profiles so interactive use, CI logs, and scripted exports use the
appropriate level of UI chrome.

**Why this priority**: Different environments need different presentation, but
all profiles must preserve auditability and source links.

**Independent Test**: Render the same research event sequence through all three
profiles and verify that each profile preserves the same semantic content and
source identifiers.

**Acceptance Scenarios**:

1. **Given** `plain` rendering is selected, **When** research events are shown,
   **Then** the output is stable, low-noise text suitable for logs and export.
2. **Given** `compact` rendering is selected, **When** research events are
   shown, **Then** the output remains copy-friendly while keeping live status
   segments.
3. **Given** `rich` rendering is selected, **When** additional visual grouping
   is used, **Then** the output still preserves a clean export path and does not
   become the only representation of research content.

### Edge Cases

- Very long tool output must be summarized in the TUI while linking to the raw
  artifact, trace, or run record.
- Diffs must remain patch-readable and must not be wrapped in visual containers
  that break copy/paste.
- Multi-agent sessions must identify speaker, role, and handoff without using
  nested boxes.
- Review issues and claim updates must preserve stable IDs in copied output.
- Narrow terminals must wrap text without inserting misleading separators or
  hiding important evidence links.
- Non-interactive terminals and CI must default to `plain`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The default research TUI MUST render transcript content in a
  copy-friendly, Markdown-like format with minimal decorative chrome.
- **FR-002**: The default research TUI MUST NOT use heavy bounding boxes, nested
  boxes, vertical rule columns, or repeated decorative divider lines around
  normal research events.
- **FR-003**: The system MUST provide `plain`, `compact`, and `rich` display
  profiles for research commands.
- **FR-004**: `plain` rendering MUST be suitable for logs, CI, transcript export,
  and scripted use.
- **FR-005**: `compact` rendering MUST be the default interactive research
  profile unless the user configures another default.
- **FR-006**: The TUI MUST preserve informative status-line segments for model,
  reasoning mode, branch, workspace, research phase, gate status, queue/run
  status, token or context pressure, cost, and approval state where available.
- **FR-007**: Transcript export MUST omit terminal chrome by default and include
  stable references to run IDs, trace IDs, claim IDs, evidence IDs, review round
  IDs, and review issue IDs when present.
- **FR-008**: Tool calls, tool errors, diffs, review issues, evidence summaries,
  and claim summaries MUST have clean text renderings that remain intelligible
  after copy/paste.
- **FR-009**: Rendering MUST be driven from structured research events rather
  than ad hoc strings embedded in the runtime.
- **FR-010**: `packages/scidekick-runtime` MUST NOT depend on TUI internals.
- **FR-011**: Existing coding-agent TUI behavior MUST remain available during
  migration unless explicitly changed by a later compatibility spec.
- **FR-012**: Rendering tests MUST assert both semantic content and absence of
  box-drawing or decorative line-art noise in `plain` and default `compact`
  output.

### Key Entities *(include if feature involves data)*

- **ResearchTranscriptEvent**: Structured event emitted for user-visible
  research activity such as state transitions, tool calls, claims, reviews,
  evidence updates, and run summaries.
- **ResearchRenderProfile**: Display mode that controls transcript chrome and
  status presentation. Initial values are `plain`, `compact`, and `rich`.
- **ResearchStatusSegment**: Compact status-line item such as model, branch,
  phase, gate, queue, run, token, cost, or approval state.
- **CopySafeRenderResult**: Rendered text plus metadata describing source event
  IDs, omitted raw artifacts, and export behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A representative copied transcript containing tool calls, errors,
  claims, evidence, and review issues can be pasted into Markdown with no
  box-drawing glyphs or vertical border columns.
- **SC-002**: Snapshot tests cover at least one example each for state
  transition, tool error, diff, claim update, evidence summary, peer-review
  issue, and run summary rendering.
- **SC-003**: Transcript exports include stable references back to source events
  and artifacts for every rendered claim, evidence summary, review issue, and
  run summary.
- **SC-004**: Non-interactive execution defaults to `plain` rendering and
  interactive `sk research ...` defaults to `compact` rendering.
- **SC-005**: Existing coding-agent sessions still render with their current TUI
  behavior while v2 research commands use the new renderer.

## Assumptions

- The first implementation is a Scidekick research CLI/TUI adapter, not a
  wholesale replacement of `packages/tui`.
- The runtime emits structured research events that are independent of terminal
  rendering.
- Status-line segments may reuse useful Oh My Pi primitives if they do not
  force box-heavy transcript rendering.
- The feature applies first to `sk research ...` commands; v1 coding-agent
  screens can be migrated later behind explicit compatibility work.
