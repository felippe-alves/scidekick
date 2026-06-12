# Implementation Plan: Copy-Friendly Research TUI

**Branch**: `codex-scidekick-v2-spec-kit` | **Date**: 2026-06-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-copy-friendly-research-tui/spec.md`

## Summary

Build the Scidekick v2 research transcript as a structured event pipeline rather
than a coding-agent TUI skin. `packages/scidekick-runtime` owns durable research
state, `.sk/research/` persistence, and structured transcript/status events.
`packages/scidekick-cli` or a Scidekick-owned CLI adapter consumes those events
and renders `plain`, `compact`, and `rich` profiles. Existing `packages/tui`
primitives may be reused for status-line layout, measurement, wrapping, and
terminal updates, but Oh My Pi boxed transcript styling is not the default and
existing coding-agent TUI behavior remains compatibility-only.

This implementation slice includes the minimal runtime package contracts and
append-first event-log interfaces needed to replay and render research events.
Broader research-control behavior, experiment orchestration, claim promotion,
and full `.sk/research/` object lifecycle remain out of scope for later runtime
foundation specs.

## Technical Context

**Language/Version**: TypeScript on Bun 1.3.14, matching the repository
workspace and package scripts.

**Primary Dependencies**: Bun workspace packages, `@oh-my-pi/pi-utils` for
shared utilities/logging, optional `@oh-my-pi/pi-tui` primitives for status-line
measurement/wrapping/render loops, and no dependency from
`packages/scidekick-runtime` to TUI internals.

**Storage**: Local-first `.sk/research/` state store with append-first JSONL
event logs plus typed JSON/Markdown artifacts. This feature defines and
implements the minimal event-log and export-manifest interfaces required for
transcript replay; later runtime foundation specs will expand the full
research-object lifecycle and control-plane behavior.

**Testing**: Focused Bun tests for runtime event contracts and CLI rendering.
Use snapshot/contract tests for representative transcripts and semantic tests
for absence of box-drawing/decorative line art in `plain` and default
`compact` output. Run package-local checks first, then `bun check`.

**Target Platform**: Terminal-first local CLI on macOS/Linux with non-interactive
CI/log support. Windows terminal compatibility is best-effort unless a later
spec defines install/runtime requirements.

**Project Type**: Monorepo TypeScript library plus CLI adapter.

**Performance Goals**: Render incremental transcript/status updates without
noticeable interactive lag for normal research sessions; summarize or link long
tool output instead of flooding the terminal. Plain export should be a linear
pass over recorded events.

**Constraints**: Copy-safe transcript is the source of truth for user-visible
research output. No normal research event may require heavy boxes, nested boxes,
vertical border columns, or repeated decorative divider lines to remain
intelligible. Non-interactive terminals default to `plain`; interactive
`sk research ...` defaults to `compact`.

**Scale/Scope**: Initial scope covers `sk research ...` event rendering for
state transitions, tool calls, tool errors, diffs, claim updates, evidence
summaries, peer-review issues, run summaries, status segments, and transcript
export. Existing coding-agent sessions, `/autoresearch`, and Oh My Pi TUI paths
remain unchanged except for adapter integration points explicitly introduced by
later specs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Research state is load-bearing**: PASS. The plan defines
  `ResearchTranscriptEvent`, status segments, render results, and durable
  `.sk/research/` state as explicit contracts.
- **Evidence before execution and claims**: PASS. Claim/evidence/review events
  must carry support levels and stable IDs; rendering must not strengthen claim
  language beyond event state.
- **Durable, local-first, auditable artifacts**: PASS. Runtime events are
  append-first local artifacts and exports retain run, trace, claim, evidence,
  review round, and review issue references.
- **Copy-friendly and audit-friendly interfaces**: PASS. Copy-safe output is the
  primary interface contract; terminal chrome is excluded from export by
  default.
- **Compatibility without behavioral capture**: PASS. `packages/scidekick-runtime`
  owns v2 research behavior; existing coding-agent TUI behavior remains
  compatibility-only and does not dictate the new renderer.

No constitution violations require complexity tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-copy-friendly-research-tui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cli-rendering.md
│   └── research-events.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/
├── scidekick-runtime/
│   ├── package.json
│   ├── src/
│   │   ├── events/
│   │   ├── research-store/
│   │   ├── status/
│   │   └── index.ts
│   └── test/
├── scidekick-cli/
│   ├── package.json
│   ├── src/
│   │   ├── commands/research.ts
│   │   ├── render/
│   │   ├── export/
│   │   └── index.ts
│   └── test/
├── tui/
│   └── src/
└── coding-agent/
    └── src/
```

`packages/scidekick-cli` may start as an adapter inside `packages/coding-agent`
if the CLI binary cannot yet be split cleanly, but the adapter must keep
Scidekick-owned research rendering isolated from coding-agent TUI internals. The
runtime package must remain UI-agnostic.

**Structure Decision**: Use a new runtime package for research state/events and
a Scidekick-owned CLI renderer/adapter for terminal presentation. Reuse
`packages/tui` only as a primitive library; do not reuse Oh My Pi transcript
components as the default Scidekick research renderer. Keep `packages/coding-agent`
behavior as a compatibility surface until a separate compatibility spec changes
it.

## Phase 0 Research

Research output is recorded in [research.md](./research.md). All technical
unknowns are resolved there; no clarification placeholders remain.

## Phase 1 Design

Design output is recorded in:

- [data-model.md](./data-model.md)
- [contracts/research-events.md](./contracts/research-events.md)
- [contracts/cli-rendering.md](./contracts/cli-rendering.md)
- [quickstart.md](./quickstart.md)

## Constitution Check (Post-Design)

- **Research objects and state transitions**: PASS. `data-model.md` defines
  transcript events, status segments, render profiles, copy-safe render results,
  export manifests, and `.sk/research/` store records.
- **Allowed/blocked/routed actions**: PASS. Runtime emits structured events and
  approval/gate status; renderer only displays or exports events and must not
  mutate claim state.
- **Unsupported-claim prevention**: PASS. Claim renderers display support level,
  evidence links, and uncertainty from the source event without upgrading
  language.
- **Resume from durable local state**: PASS. The event stream and export
  manifests are read from `.sk/research/`; interrupted sessions can replay
  events into any render profile.
- **Audit/export/copy path**: PASS. Plain export omits terminal chrome by
  default and preserves stable IDs and artifact links.
- **Compatibility surfaces**: PASS. Existing coding-agent TUI and `/autoresearch`
  remain compatibility-only during this feature.

## Complexity Tracking

No constitution violations.
