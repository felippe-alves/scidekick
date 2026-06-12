# Contract: CLI Rendering and Export

This contract defines how Scidekick research commands render runtime events for
terminal users, logs, and exported transcripts.

## Commands

The initial surface is `sk research ...`. Exact subcommands are implementation
tasks, but the renderer must support:

- Running or attaching to a research session.
- Selecting `--profile plain`, `--profile compact`, or `--profile rich`.
- Exporting a transcript from `.sk/research/` without scraping terminal
  scrollback.

## Profile Selection

```text
non-interactive stdout -> plain
interactive sk research ... -> compact
explicit --profile plain -> plain
explicit --profile compact -> compact
explicit --profile rich -> rich
```

Configuration may override the interactive default, but CI/non-interactive
defaults remain `plain` unless explicitly overridden.

## Plain Output Requirements

- Markdown-like text.
- Stable event, run, trace, claim, evidence, review, and artifact IDs where
  present.
- No box-drawing glyphs.
- No vertical border columns.
- No repeated decorative dividers around normal research events.
- Patch-readable diffs.
- Long output summarized with raw artifact links.

## Compact Output Requirements

- Same semantic event content as `plain`.
- Live status line may include model, mode, branch, workspace, phase, gate,
  queue/run, token/context pressure, cost, and approval segments.
- Transcript lines remain copy-friendly without boxed event bodies.
- Status-line chrome is excluded from export by default.

## Rich Output Requirements

- May add visual grouping or color for interactive use.
- Must preserve export from source events.
- Must not become the only representation of any research content.
- Must keep diffs, commands, errors, claims, evidence, and review issues
  copyable as clean text.

## Export Requirements

Default export:

```text
sk research export --session <session-id>
```

Expected behavior:

- Reads source events from `.sk/research/`.
- Writes a copy-safe transcript, normally Markdown or plain text.
- Writes or updates a `ResearchExportManifest`.
- Omits terminal chrome/status-line segments by default.
- Includes status metadata only when explicitly requested.

## Compatibility Requirements

- Existing coding-agent TUI sessions keep their current behavior.
- `/autoresearch` remains compatibility-only unless a later spec migrates it to
  the Scidekick runtime event contract.
- The CLI adapter may live in the current `sk` binary temporarily, but
  Scidekick research rendering must be isolated from coding-agent TUI
  transcript components.
