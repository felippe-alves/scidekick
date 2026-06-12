# Quickstart: Copy-Friendly Research TUI Validation

This guide describes validation scenarios for the copy-friendly research TUI
plan. It is intentionally written as an implementation target; commands may need
package names adjusted during `tasks.md` and implementation.

## Prerequisites

- Bun 1.3.14 or the workspace-pinned Bun version.
- Repository dependencies installed.
- The minimal `packages/scidekick-runtime` event contracts and `.sk/research/`
  event-log interfaces from this feature.
- A Scidekick research CLI adapter from this feature that can replay fixture
  events through `plain`, `compact`, and `rich` profiles.

## Scenario 1: Render Copy-Safe Plain Transcript

Prepare a fixture event log containing:

- State transition.
- Tool call.
- Tool error with raw artifact pointer.
- Patch-readable diff.
- Claim update.
- Evidence summary.
- Peer-review issue.
- Run summary.

Run:

```bash
bun --cwd=packages/scidekick-cli test test/research-render-plain.test.ts
```

Expected outcome:

- The rendered transcript includes semantic content and stable IDs from every
  fixture event.
- The output contains no box-drawing glyphs, vertical border columns, heavy
  bounding boxes, nested boxes, or repeated decorative dividers.
- Long raw output is summarized with a referenced artifact path.

## Scenario 2: Preserve Interactive Status Without Export Chrome

Run:

```bash
bun --cwd=packages/scidekick-cli test test/research-render-compact.test.ts
```

Expected outcome:

- Interactive `compact` output includes status segments for model, mode, branch,
  workspace, phase, gate, queue/run, tokens/context pressure, cost, and approval
  when available.
- Transcript event content remains copy-friendly.
- Exported transcript output excludes status-line chrome by default.

## Scenario 3: Verify Profile Semantic Parity

Run:

```bash
bun --cwd=packages/scidekick-cli test test/research-render-profiles.test.ts
```

Expected outcome:

- `plain`, `compact`, and `rich` render the same source event IDs and stable
  reference IDs.
- `rich` may add visual grouping, but export still comes from the source event
  stream.
- Diffs remain patch-readable in all profiles.

## Scenario 4: Replay From `.sk/research/`

Run:

```bash
sk research export --session <fixture-session-id>
```

Expected outcome:

- Export reads from `.sk/research/`, not terminal scrollback.
- Export writes a copy-safe transcript.
- Export writes a manifest pointing back to the source event log and included
  run, trace, claim, evidence, review, and artifact IDs.

## Scenario 5: Compatibility Check

Run existing coding-agent TUI tests and the new research rendering tests:

```bash
bun --cwd=packages/coding-agent test test/scidekick-research-compat.test.ts
bun --cwd=packages/scidekick-cli test
```

Expected outcome:

- Existing coding-agent TUI behavior remains unchanged.
- New `sk research ...` rendering uses the Scidekick-owned renderer or adapter.

## Final Check

Run:

```bash
bun check
```

Expected outcome:

- Type and lint checks pass across the workspace.
- No runtime package imports TUI internals.
