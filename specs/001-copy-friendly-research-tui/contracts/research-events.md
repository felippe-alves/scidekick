# Contract: Research Runtime Events

This contract defines the package boundary between `packages/scidekick-runtime`
and any Scidekick renderer. The runtime emits structured events; renderers
consume them.

## Producer

`packages/scidekick-runtime`

## Consumers

- `packages/scidekick-cli` research commands
- Scidekick-owned CLI adapter inside the current `sk` binary during migration
- Transcript export code
- Future report or dashboard generators

## Event Envelope

```json
{
  "id": "evt_01JZRESEARCH0001",
  "sessionId": "rs_01JZSESSION",
  "runId": "run_01JZRUN",
  "traceId": "trace_01JZTRACE",
  "timestamp": "2026-06-11T20:00:00.000Z",
  "sequence": 42,
  "kind": "tool_error",
  "actor": {
    "id": "agent_primary",
    "role": "research_agent",
    "label": "Research Agent"
  },
  "title": "Experiment command failed",
  "body": "Command `bun test packages/scidekick-runtime/test/render.test.ts` exited 1.",
  "severity": "error",
  "references": [
    {
      "type": "artifact",
      "id": "artifact_raw_output_01",
      "path": ".sk/research/artifacts/run_01JZRUN/stderr.txt"
    }
  ],
  "rawArtifact": {
    "id": "artifact_raw_output_01",
    "path": ".sk/research/artifacts/run_01JZRUN/stderr.txt",
    "mediaType": "text/plain"
  }
}
```

## Required Event Kinds

- `state_transition`
- `tool_call`
- `tool_result`
- `tool_error`
- `diff`
- `claim_update`
- `evidence_summary`
- `review_issue`
- `review_round`
- `handoff`
- `run_summary`
- `message`

## Compatibility Rules

- Runtime events must be valid without importing `@oh-my-pi/pi-tui` or
  coding-agent mode components.
- Event bodies must be bounded, copy-safe, and Markdown-like when present.
- Full raw output belongs in artifacts referenced by ID/path.
- Renderers may derive display grouping from `kind`, `actor`, `references`, and
  `severity`, but must not require hidden terminal state to understand an event.
- Existing coding-agent TUI events are not retroactively required to satisfy
  this contract unless a later compatibility spec opts them in.

## Claim and Evidence Rules

Claim-related events must include:

- A stable claim ID.
- A support level from runtime state.
- Evidence references when support is stronger than an unsupported hypothesis.
- Language that does not exceed the event support level.

Evidence-related events must include:

- A stable evidence ID.
- Source or artifact references.
- The run, trace, review, or decision context where the evidence was produced or
  accepted.

## Status Segment Contract

```json
{
  "id": "status_phase",
  "label": "phase",
  "value": "reviewing",
  "priority": 20,
  "state": "active",
  "sourceEventId": "evt_01JZRESEARCH0001"
}
```

Status segments are live UI metadata. They may be rendered in `compact` and
`rich` profiles but are omitted from default transcript export.
