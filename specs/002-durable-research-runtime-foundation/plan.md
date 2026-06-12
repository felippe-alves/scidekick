# Implementation Plan: Durable Research Runtime Foundation

**Branch**: `codex-scidekick-v2-spec-kit` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

## Summary

Implement the first Scidekick-owned research-control runtime objects after the copy-friendly TUI slice. The feature adds durable project and session state, typed plan/claim/evidence records, gate validation for draft plans, and initial `sk research init/status/plan` command routing through `packages/scidekick-cli`.

The intent is architectural independence, not full replacement of Oh My Pi. `packages/coding-agent` remains a compatibility shell that dispatches to Scidekick-owned runtime and CLI packages.

## Technical Context

**Language/Version**: TypeScript on Bun 1.3.14.

**Primary Dependencies**: Existing workspace packages. `packages/scidekick-runtime` remains UI-agnostic and does not depend on coding-agent internals.

**Storage**: Local `.sk/research/state.json`, `.sk/research/sessions/<session-id>/state.json`, and existing append-first session event logs.

**Testing**: Bun package-local contract tests for runtime state and CLI command behavior.

**Scope**: Initial durable state, plan gate validation, status output, and transcript-compatible event emission.

**Out of Scope**: Execution orchestration, MCP/tool guardrails, full state-machine transition enforcement, evidence ingestion, claim promotion, report generation, and `/autoresearch` migration.

## Constitution Check

- **Research state is load-bearing**: PASS. Session phase, gates, plans, claims, and evidence are persisted as runtime objects.
- **Evidence before execution and claims**: PASS. Plan recording requires expected evidence and stop/rollback criteria before future execution.
- **Durable, local-first, auditable artifacts**: PASS. State is local JSON and state changes are appended to JSONL event logs.
- **Copy-friendly and audit-friendly interfaces**: PASS. Commands print plain status and continue using replayable transcript events.
- **Compatibility without behavioral capture**: PASS. Coding-agent only dispatches the command.

## Project Structure

```text
packages/scidekick-runtime/
├── src/research-state/
│   ├── index.ts
│   ├── state-store.ts
│   ├── types.ts
│   └── validation.ts
└── test/research-state.test.ts

packages/scidekick-cli/
├── src/commands/research.ts
└── test/research-runtime-command.test.ts
```

## Implementation Boundary

This slice intentionally does not mutate `packages/coding-agent/src/session/*`. New v2 behavior enters through Scidekick-owned runtime APIs and the existing `research` command adapter.
