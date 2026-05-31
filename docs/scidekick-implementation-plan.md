# Scidekick Science Surface Implementation Plan

This plan implements the science surface in layers. The goal is to make Scidekick useful for AI/ML researchers first, then add agentic AI research support on top of that foundation.

## Priority order

### 1. Durable project memory: wiki and journal

Start with the research wiki and research journal.

This is the safest first step because it is:

- useful immediately
- mostly filesystem-backed
- independent of model/provider choices
- compatible with the existing `scidekick-science` package
- the foundation for every later research object

Initial commands:

```bash
sk wiki init
sk wiki ingest
sk wiki page
sk wiki query

sk journal init
sk journal add
sk journal today
sk journal link
```

Acceptance criteria:

- creates `.sk/wiki/` and `.sk/journal/`
- stores dated journal entries
- creates canonical pages for papers, runs, and manual notes
- supports explicit links between journal entries and wiki pages
- has tests for file layout, idempotency, invalid input, and existing-directory behavior

### 2. Core AI/ML research object store

After memory exists, add the base AI/ML research objects.

Initial commands:

```bash
sk experiment init
sk run record
sk eval record
sk dataset snapshot
sk model card
sk dataset card
```

Acceptance criteria:

- stable object IDs
- JSON metadata plus Markdown human-readable files
- links to journal and wiki
- records git commit when available
- records command, config path, artifacts, and metrics
- handles missing optional metadata without corrupting the object

### 3. Trace and provenance scaffolding

Before agent evals, add the trace/provenance layer that makes runs and rollouts inspectable.

Initial commands:

```bash
sk trace ingest
sk trace inspect
sk trace export --otel
sk artifact link
```

Start with an internal trace JSONL shape, then add OpenTelemetry export. Do not block the milestone on perfect OpenTelemetry coverage.

Acceptance criteria:

- stores model calls, tool calls, outputs, and artifacts
- records cost and latency when available
- links traces to runs, evals, wiki pages, and journal entries
- can inspect traces from the CLI
- exports a minimal OpenTelemetry-compatible representation

### 4. Agentic AI research layer

Add the agentic layer only after the AI/ML base surface exists.

Initial commands:

```bash
sk agent init
sk harness init
sk rollout record
sk taskset init
sk grader run
sk judge calibrate
```

Acceptance criteria:

- agent specs record model, prompts, tools, MCP servers, memory policy, and guardrails
- harness specs record context builder, tool router, sandbox, tracing, eval, and governance
- rollouts link to traces, tasksets, environments, graders, and journal entries
- graders are separated from LLM judges
- failed trajectories can be labeled and converted into regression cases

## Easiest useful starting point

Wire existing packages into the CLI:

```bash
sk install-skills
sk wiki ...
sk guard ...
```

This is the fastest visible progress because relevant packages already exist. It creates a real command surface before introducing more abstractions.

## Safest architectural starting point

Implement a small filesystem object store:

```text
.sk/
  wiki/
  journal/
  objects/
```

Shared primitives:

- workspace discovery
- atomic write
- slug generation
- metadata read/write
- Markdown front matter or sidecar JSON
- link model
- validation errors
- idempotent initialization

Every later surface should reuse these primitives rather than inventing separate filesystem conventions.

## Best high-leverage milestone

Ship one vertical slice:

```bash
sk journal init
sk journal add "Tried baseline eval"
sk wiki init
sk wiki page baseline-eval
sk experiment init baseline-eval
sk run record --name baseline --metric accuracy=0.82
```

This proves the core promise:

> research memory + structured run metadata + human-readable notes + durable links.

## Recommended implementation sequence

1. Add CLI command routing for Scidekick-owned commands.
2. Add workspace discovery and `.sk/` initialization.
3. Add journal initialization and append-only entries.
4. Add wiki initialization and page creation.
5. Add explicit wiki/journal links.
6. Add experiment initialization.
7. Add run recording with metrics and artifacts.
8. Add eval recording.
9. Add model and dataset card generation.
10. Add trace ingestion and inspection.
11. Add minimal OpenTelemetry export.
12. Add agent and harness specs.
13. Add rollout recording.
14. Add taskset and grader support.
15. Add judge calibration and human-review queues.
16. Add failure labeling and regression promotion.

## Design constraints

- Prefer filesystem-first implementation.
- Keep Markdown human-readable.
- Store machine-readable metadata next to human-readable files.
- Make initialization idempotent.
- Avoid provider lock-in.
- Do not require MLflow, W&B, DVC, Hugging Face, LangSmith, or Langfuse to be installed for the core surface to work.
- Integrate with those tools when present.
- Do not mark claims as supported unless required provenance is present.

## First concrete deliverable

The first deliverable should be:

```bash
sk journal init
sk journal add
sk journal today
sk wiki init
sk wiki page
sk experiment init
sk run record
```

With tests covering:

- clean workspace initialization
- repeated initialization
- journal entry creation
- wiki page creation
- experiment directory creation
- run metadata recording
- links from run to journal/wiki
- invalid slugs
- missing workspace behavior
