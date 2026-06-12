# Data Model: Copy-Friendly Research TUI

## ResearchTranscriptEvent

Structured event emitted by `packages/scidekick-runtime` for user-visible
research activity.

**Fields**:

- `id`: Stable event ID, unique within the research session.
- `sessionId`: Research session ID.
- `runId`: Optional run ID when the event belongs to a concrete execution.
- `traceId`: Optional trace ID for tool/model/handoff provenance.
- `timestamp`: ISO-8601 timestamp.
- `sequence`: Monotonic session-local sequence number.
- `kind`: One of `state_transition`, `tool_call`, `tool_result`,
  `tool_error`, `diff`, `claim_update`, `evidence_summary`,
  `review_issue`, `review_round`, `handoff`, `run_summary`, or `message`.
- `actor`: Optional speaker/agent/user identity with role.
- `title`: Short human-readable event title.
- `body`: Copy-safe Markdown-like body text or structured summary fields.
- `references`: Stable references to claims, evidence, reviews, artifacts,
  traces, files, URLs, or raw output.
- `severity`: Optional `info`, `warning`, `error`, or `blocked`.
- `supportLevel`: Optional claim support level when `kind` involves claims.
- `rawArtifact`: Optional pointer to full raw output when the body is summarized.

**Validation Rules**:

- `id`, `sessionId`, `timestamp`, `sequence`, and `kind` are required.
- `sequence` must be monotonic for a session.
- Tool error events must include `severity: "error"` and either body text or a
  raw artifact pointer.
- Claim, evidence, review, and run summary events must include stable
  references for every mentioned object.
- Diff events must preserve patch-readable text and must not require visual
  containers to remain intelligible.

## ResearchStatusSegment

Compact status-line item emitted by the runtime or derived by the CLI adapter
from current runtime state.

**Fields**:

- `id`: Stable segment key.
- `label`: Short label such as `model`, `mode`, `branch`, `phase`, `gate`,
  `queue`, `run`, `tokens`, `cost`, or `approval`.
- `value`: Current display value.
- `priority`: Numeric priority for narrow terminals.
- `state`: Optional `neutral`, `active`, `warning`, `blocked`, or `done`.
- `sourceEventId`: Optional event ID that caused the current value.

**Validation Rules**:

- Status segments must be concise and independently omittable by priority.
- Status-line text is terminal chrome and is excluded from transcript export by
  default.
- Status segments must not be the only location for claim, evidence, command,
  error, or review content.

## ResearchRenderProfile

Display profile selected for interactive rendering, CI/log output, or export.

**Values**:

- `plain`: Stable low-noise text for logs, CI, scripts, and exports.
- `compact`: Default interactive profile; copy-friendly transcript plus compact
  status-line segments.
- `rich`: Opt-in visual grouping while preserving a clean export path.

**Validation Rules**:

- Non-interactive terminals default to `plain`.
- Interactive `sk research ...` defaults to `compact` unless configured
  otherwise.
- `plain` and default `compact` output must not contain box-drawing glyphs,
  heavy bounding boxes, nested boxes, vertical rule columns, or repeated
  decorative dividers around normal research events.
- All profiles render the same semantic event content and stable IDs.

## CopySafeRenderResult

Renderer output for one event or a replayed event sequence.

**Fields**:

- `text`: Rendered copy-safe text.
- `profile`: Render profile used.
- `eventIds`: Source event IDs included in the output.
- `referenceIds`: Claim, evidence, review, run, trace, and artifact IDs included
  in the output.
- `omittedArtifacts`: Raw artifact pointers omitted or summarized in `text`.
- `includesTerminalChrome`: Boolean marker, false for plain export by default.
- `warnings`: Optional renderer warnings, such as truncated raw output.

**Validation Rules**:

- Export defaults to `includesTerminalChrome: false`.
- Every rendered claim, evidence summary, review issue, and run summary must
  retain stable source references.
- Truncated or summarized output must include a raw artifact pointer.

## ResearchExportManifest

Metadata written with transcript exports.

**Fields**:

- `exportId`: Stable export ID.
- `sessionId`: Source session ID.
- `profile`: Render profile used for export, normally `plain`.
- `createdAt`: ISO-8601 timestamp.
- `eventRange`: First and last sequence number included.
- `sourceEventLog`: Path under `.sk/research/`.
- `renderedPath`: Exported Markdown/text path.
- `references`: Deduplicated IDs for runs, traces, claims, evidence, review
  rounds, review issues, and raw artifacts.

**Validation Rules**:

- Manifest must point back to the source event log.
- Manifest must not be the only copy of event content.
- Export may include status metadata only when explicitly requested.

## State Transitions

Research runtime state changes are represented as events and replayed by the
renderer.

```text
initialized
  -> planning
  -> gated
  -> executing
  -> reviewing
  -> summarizing
  -> complete
```

`blocked`, `paused`, and `failed` may interrupt the normal flow and later resume
to `planning`, `executing`, or `reviewing` with a new state transition event.
The renderer displays transitions but does not authorize or mutate them.
