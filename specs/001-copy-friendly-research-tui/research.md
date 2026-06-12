# Research: Copy-Friendly Research TUI

## Decision: Runtime Owns Structured Research Events

`packages/scidekick-runtime` will emit typed `ResearchTranscriptEvent` and
`ResearchStatusSegment` records for user-visible research activity. The runtime
does not emit pre-rendered transcript strings except for bounded raw previews
inside typed fields, and it does not import TUI internals.

**Rationale**: The constitution requires durable research objects and audit
trails that survive terminal sessions and chat compaction. A typed event stream
lets the same source data drive interactive rendering, CI logs, transcript
exports, and future reports without tying research semantics to a terminal
component.

**Alternatives considered**:

- Re-skin existing coding-agent TUI output: rejected because it preserves the
  current transcript component as the behavioral center and makes copy-friendly
  output a styling afterthought.
- Add cleaner string formatters directly to runtime code: rejected because
  ad hoc strings cannot support profile-specific rendering, stable exports, or
  structured audit queries.

## Decision: Scidekick-Owned CLI Adapter Renders Events

`packages/scidekick-cli` or an isolated Scidekick adapter inside the current
`sk` binary will consume runtime events and render `plain`, `compact`, and
`rich` profiles. This adapter owns transcript formatting, status-line
composition, export behavior, and non-interactive defaults.

**Rationale**: The CLI boundary keeps terminal behavior replaceable while
allowing the current `sk` command to host the feature during migration. It also
lets tests assert renderer contracts without constructing full coding-agent
sessions.

**Alternatives considered**:

- Put rendering into `packages/scidekick-runtime`: rejected because it would make
  runtime depend on terminal concerns.
- Put v2 research rendering into existing coding-agent mode components:
  rejected because the specification requires coding-agent behavior to remain
  compatibility-only and prevents Oh My Pi visual conventions from capturing
  Scidekick v2 behavior.

## Decision: Reuse `packages/tui` Only as Primitives

The renderer may reuse `packages/tui` helpers for width measurement, wrapping,
status-line segments, incremental screen updates, and low-level terminal
control. It must not use boxed transcript components as the default rendering
style for normal research events.

**Rationale**: The existing TUI package contains useful terminal mechanics, but
the feature's primary contract is clean copied text. Treating `packages/tui` as
a primitive layer gives Scidekick the mature terminal behavior without importing
the Oh My Pi boxed transcript aesthetic as the product default.

**Alternatives considered**:

- Fork all TUI behavior into Scidekick immediately: rejected as unnecessary for
  this feature and likely to duplicate stable terminal mechanics.
- Use existing boxed components with CSS/theme-like changes: rejected because
  boxes, vertical rules, and decorative dividers are the failure mode being
  removed.

## Decision: `.sk/research/` Is the Replayable Source for Export

Transcript export will read persisted runtime events and export manifests from
`.sk/research/`, not scrape terminal output. The initial TUI feature will define
and implement the minimal event-log and export-manifest interfaces required for
transcript replay; later runtime specs can expand the full research object
lifecycle and control-plane behavior.

**Rationale**: Export from durable structured state is auditable, replayable,
and profile-independent. It also supports interruption/resume by replaying the
same event stream into a renderer.

**Alternatives considered**:

- Copy terminal scrollback as the export source: rejected because it includes
  terminal chrome and loses structured links.
- Store only rendered Markdown: rejected because status changes, artifacts, and
  future render profiles need source event metadata.

## Decision: Profile Defaults Are Environment-Sensitive

Non-interactive terminals and CI default to `plain`. Interactive
`sk research ...` defaults to `compact`. `rich` is opt-in and must retain a
clean export path from the same events.

**Rationale**: CI logs and scripted workflows need stable text; interactive
research needs compact live status without polluting copied transcript content.
An opt-in rich profile can add visual grouping without becoming the only
representation.

**Alternatives considered**:

- Always default to `plain`: rejected because long-running interactive research
  benefits from status-line metadata.
- Always default to `rich`: rejected because it risks reintroducing visual noise
  and poor copy behavior.

## Decision: Claim Rendering Preserves Support Level

Claim, evidence, and review events render IDs, support levels, links, and
uncertainty exactly from source fields. Renderers must not infer stronger
language or merge unsupported claims into confident summaries.

**Rationale**: Research TUI output is often copied into notes, issues, papers,
and rebuttal plans. Overconfident display text would become a research-quality
bug, not just a UI bug.

**Alternatives considered**:

- Generate polished natural-language summaries during rendering: rejected
  because the renderer is not the claim-evaluation layer.
- Hide support metadata in status or hover affordances: rejected because copied
  text must preserve audit context.
