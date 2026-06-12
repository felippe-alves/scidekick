# Scidekick V2 First Architecture Plan

Last updated: 2026-06-11

## Executive Summary

Scidekick v2 should be a Pi-level rewrite, not a thin prompt layer on the
current Oh My Pi coding-agent package and not a fully greenfield runtime. The
runtime should reuse the durable pieces that already work well:
`@oh-my-pi/pi-agent-core`, `@oh-my-pi/pi-ai`, `@oh-my-pi/pi-utils`, selected
tool implementations, MCP integration, model routing, telemetry primitives, and
Bun-first repository conventions.

The core product change is behavioral. Scidekick must stop being a coding
agent with science-themed prompts and become a research-control harness whose
default loop is evidence-gated:

```text
question -> hypothesis -> plan -> preregistered experiment -> execution
  -> analysis -> critique -> claim ledger -> human decision
```

The current v1 product already has a useful CLI identity, wiki/journal slices,
scientific skill installation, model-tier warnings, and autoresearch mode. Those
features should remain available, but v2 scientific behavior should move into
Scidekick-owned runtime packages instead of continuing to patch
`packages/coding-agent/src/session/*`, the coding-agent system prompt, or TUI
internals.

## Research Basis

The architecture follows a harness-first reading of recent agent systems:

- [Code as Agent Harness](https://arxiv.org/abs/2605.18747): code, tools,
  state, verification, memory, and multi-agent coordination are the actual
  harness. Prompt instructions alone are not enough for reliable long-horizon
  behavior.
- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence):
  long-running workflows need checkpointed state, resumability, time-travel
  inspection, and safe human interrupts.
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/): the
  useful primitive set is small: agents, tools, handoffs, guardrails, sessions,
  tracing, and human-in-the-loop controls.
- [OpenAI tool guardrails](https://openai.github.io/openai-agents-python/guardrails/?from=20421):
  tool-level guardrails are required because agent-level input and output
  checks do not cover every delegated specialist call.
- [The AI Scientist v2](https://arxiv.org/abs/2504.08066): end-to-end research
  systems need hypothesis formulation, experiment execution, analysis,
  visualization, manuscript/report stages, and an experiment-manager search
  process.
- [Robin](https://arxiv.org/abs/2505.13400), [PaperQA2](https://github.com/Future-House/paper-qa),
  and [PaperQA2 evaluation](https://arxiv.org/abs/2409.13740): scientific
  literature search and data analysis should use specialized agents and tools;
  Scidekick should integrate strong components instead of rebuilding them.
- [Co-Scientist](https://www.nature.com/articles/s41586-026-10644-y): hypothesis
  work should use generate, critique, refine, rank, and tournament patterns
  rather than premature convergence on the first plausible idea.
- [AutoScientists](https://arxiv.org/abs/2605.28655): long-running scientific
  work needs shared state, self-organizing teams, proposal critique before
  compute, champion tracking, and dead-end memory.
- [MCP specification](https://modelcontextprotocol.io/specification/2024-11-05/index):
  external tool and data access must be explicit, permissioned, consented, and
  visible to the user.
- [OpenTelemetry GenAI agent spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/):
  traces should be exportable in OTel-shaped spans for agents, model calls,
  tools, handoffs, guardrails, and research-object events.

The strongest cross-source conclusion is that v2 should make research state and
verification load-bearing runtime objects. The agent may draft plans, write
code, and run experiments, but the runtime must decide which phase it is in,
which actions are allowed, which evidence is required, and which claims may be
stated.

## Candidate Utilities to Evaluate

These utilities are worth tracking for v2, especially for the coding-agent
compatibility layer and long-running research sessions. They should not become
mandatory dependencies until Scidekick has validated fidelity, reversibility,
security boundaries, and fit with the evidence ledger.

### Context Compression and Token Economy

[Caveman](https://getcaveman.dev/) is a token-efficient agent stack built around
compression, spec-driven workflow, persistent memory, and a coding-agent CLI. Its
most relevant ideas are not the full CLI, but the layered framing: compress
prompts, command surfaces, outputs, and long-lived context independently.

Potential Scidekick use:

- Compress long AGENTS/SYSTEM/rule/context files before model calls.
- Compile stable research protocols and venue rubrics into compact prompt
  artifacts.
- Treat token budget as a runtime resource with measurable savings and fidelity
  checks.

[Headroom](https://github.com/chopratejas/headroom) is more immediately
applicable as an optional adapter because it exposes library, proxy, wrapper,
and MCP modes for compressing tool outputs, logs, RAG chunks, files, and
conversation history. Its reversible compression and retrieval framing maps well
to Scidekick's evidence requirements.

[RTK](https://github.com/rtk-ai/rtk) is a narrower command-output proxy for
common development commands. It is especially relevant to the coding-agent
compatibility layer because it rewrites or wraps commands such as `git status`,
`git diff`, `rg`, `pytest`, `cargo test`, `tsc`, Docker, Kubernetes, and cloud
CLI calls into compact summaries before they reach the model. Its single Rust
binary shape also fits Scidekick's preference for local, low-overhead tooling.

Potential Scidekick use:

- Compress large tool outputs before they enter context.
- Keep exact originals in `.sk/research/artifacts/` while passing compressed
  views to models.
- Add `headroom_compress`, `headroom_retrieve`, and `headroom_stats` as optional
  MCP tools in coding-agent compatibility mode.
- Evaluate RTK as an optional shell-output normalizer for `sk` coding-agent
  compatibility sessions and `sk research loop` benchmark/log inspection.
- Measure token savings against answer fidelity on Scidekick's own review,
  analysis, and experiment workflows.
- Track missed savings opportunities as observability data, not as an automatic
  rewrite policy.

Adoption gate:

- Compression must be reversible or source-linked for anything used as evidence.
- Claim promotion must cite exact uncompressed artifacts, not compressed
  summaries.
- Compression should be bypassed for diffs, code patches, statistics, reviewer
  quotes, and other exact-byte contexts unless a verifier proves preservation.
- RTK-style filtered command output must keep the full raw command output
  recoverable under `.sk/research/artifacts/` before it can support a scientific
  claim.
- Command-output normalization must be opt-in for evidence-producing runs until
  Scidekick has command-specific fidelity tests.

### Pi-Derived Harness Comparisons

[Caveman Code](https://github.com/JuliusBrussee/caveman-code) should be tracked
as a sibling harness inspiration, not just as part of the Caveman token
compression ecosystem. It is a heavy fork of Pi that packages Caveman's token
economy into a full terminal coding agent with plan mode, an autonomous goal
loop, tool-output budgets, optional RTK integration, read de-duplication,
architect/editor model split, session branching/checkpoints, persistent memory,
daemon mode, and an SDK surface.

Potential Scidekick use:

- Compare its fork boundary against Scidekick's proposed Pi-level rewrite.
- Study how it keeps compression as a first-class runtime concern instead of a
  prompt-only style rule.
- Evaluate the architect/editor split for Scidekick research workflows: slow
  model for methodology and claim review, cheaper model for bounded edits or
  artifact updates.
- Study its goal/autopilot loop and checkpoint model as a contrast to
  Scidekick's evidence-gated `loop` and peer-review driven workflows.
- Inspect its session branching and daemon/attach model as possible inputs for
  long-running `sk research team` sessions.

Adoption gate:

- Do not copy Caveman Code's coding-agent behavior wholesale; Scidekick's
  differentiator remains scientific state, evidence gates, and claim ledgers.
- Any compression, goal-loop, or checkpoint idea imported from Caveman Code must
  be reconciled with Scidekick's preregistration and evidence requirements.
- Use Caveman Code as a comparative implementation when deciding whether to
  reuse Pi primitives directly or keep selected Oh My Pi layers.

### Self-Improvement and Learning Ledgers

[self-improving-agent](https://clawhub.ai/pskoett/self-improving-agent) records
learnings, errors, corrections, and recurring issues in project-local markdown
files and includes criteria for promoting learnings into skills.

[Self-Improving + Proactive Agent](https://clawhub.ai/ivangdavila/self-improving)
uses tiered local memory for corrections, reflections, hot/warm/cold knowledge,
and heartbeat maintenance. Its useful constraint is explicit scope: it stores
local memory and does not infer preferences from silence.

Potential Scidekick use:

- Add a v2 `LearningRecord` distinct from scientific `EvidenceRecord`.
- Log user corrections, failed tools, wrong assumptions, outdated knowledge, and
  better recurring tactics.
- Promote resolved recurring learnings into skills only after validation.
- Feed learning records into Peer-Review Driven Research and skill-evolution
  workflows as failure-mechanism evidence.

Adoption gate:

- Learning records are not scientific evidence unless separately validated.
- The agent must not silently rewrite its own operating rules.
- Skill promotion requires held-out or regression-task validation, not just a
  plausible lesson.

### Proactive Maintenance

[Proactive Agent](https://clawhub.ai/halthelobster/proactive-agent) is useful as
a pattern library for heartbeats, working buffers, proactive check-ins, and
reverse prompting. The strongest ideas are periodic maintenance and surfacing
unknown unknowns, not unsolicited external action.

Potential Scidekick use:

- Add local-only `sk research heartbeat` maintenance runs.
- Detect stale decisions, unresolved review issues, abandoned experiments,
  repeated failures, and unpromoted learnings.
- Generate proactive suggestions as drafts in `.sk/research/proposals/`, not as
  autonomous external actions.

Adoption gate:

- Proactive runs must be local, auditable, and permission-limited.
- Nothing external is sent, scheduled, pushed, or mutated without explicit
  approval.
- Suggestions must link to concrete state: unresolved claim, stale review issue,
  failed run, old decision, or repeated user correction.

## Current Scidekick Baseline

Scidekick v1 is a direct Oh My Pi fork with Scidekick identity and a few
scientific surfaces:

- `sk` binary identity and `.sk` config defaults.
- `sk wiki`, `sk journal`, and `sk install-skills`.
- `packages/scidekick-science` for filesystem wiki/schema prototypes.
- `packages/scidekick-guard` for model-tier and skill registry metadata.
- A coding-agent `/autoresearch` extension with a metric-driven optimization
  loop.
- Subagent, tool, session, telemetry, MCP, and TUI features inherited from
  Oh My Pi.

The failure mode is architectural. Scientific behavior is currently expressed
mostly as prompt text, CLI commands, and extensions inside the coding-agent
package. That makes Scidekick prone to the same behavior the user reported:
fast implementation, local patching, quick conclusion drawing, and overconfident
summaries. It also makes upstream sync expensive because science-specific
behavior lives in files that should remain close to the coding-agent upstream.

## V2 Direction

V2 should introduce a Scidekick-owned research runtime and demote the current
coding-agent package to a compatibility shell and tool substrate.

### Package Boundaries

Add `packages/scidekick-runtime`.

Responsibilities:

- Research sessions and durable state.
- Research workflow state machine.
- Research objects and schemas.
- Agent roles and handoff contracts.
- Tool guardrails and permission gates.
- Evidence ledger and claim ledger.
- Filesystem-backed coordination queues.
- Trace capture and OTel export.
- Orchestrators for `loop`, `pipeline`, and `team`.

Keep `packages/scidekick-science`.

Responsibilities:

- Wiki schemas and scientific object templates.
- Filesystem wiki backend until v2 object store replaces or wraps it.
- Paper, hypothesis, experiment, evidence, and insight templates.

Keep `packages/scidekick-guard`.

Responsibilities:

- Model-tier classification.
- Skill validation metadata.
- Scientific context detection.
- Future skill-validation/evolution gates.

Use `packages/coding-agent` as a compatibility shell.

Responsibilities:

- Existing `sk` interactive coding workflows.
- Current v1 commands while migration is in progress.
- Selected reusable tools and adapters.
- Compatibility route for `/autoresearch`.

Avoid:

- Embedding v2 state transitions inside `packages/coding-agent/src/session/*`.
- Adding more science claims to the coding-agent system prompt as the primary
  behavior-control mechanism.
- Making v2 depend on TUI internals.
- Treating chat compaction as durable scientific memory.

### CLI Boundary

Either add `packages/scidekick-cli` or keep a small adapter in the current CLI.
The adapter should only parse commands, locate the workspace, and call
`scidekick-runtime`.

Initial command surface:

```bash
sk research init
sk research plan
sk research loop
sk research pipeline
sk research team
sk research status
sk research claim
sk research review
sk research review-plan
sk research rebuttal-plan
sk research report
```

During migration, `sk wiki`, `sk journal`, `sk install-skills`, and
`/autoresearch` remain v1 compatibility features. V2 can wrap them later, but
new research behavior should enter through `sk research ...`.

### Copy-Friendly Research TUI

Scidekick v2 needs a TUI redesign because the terminal transcript is part of
the research artifact surface. Researchers copy commands, errors, reviews,
claim summaries, citations, and experiment notes into Markdown files, papers,
issues, and rebuttal plans. Heavy boxes, nested borders, repeated divider
lines, and ornamental glyphs make that transcript harder to reuse and audit.

The v2 default should be closer to the original Pi transcript style:
plain-text-first, Markdown-like, low-noise, and copy-safe. The main Oh My Pi
feature worth preserving is the informative status line. Status metadata should
stay visible without polluting copied transcript content.

Design rules:

- Default transcript rendering should avoid bounding boxes, vertical rules,
  nested borders, decorative glyphs, and repeated line art.
- Tool calls, diffs, errors, citations, claim updates, review issues, and run
  summaries must have a clean text representation that can be pasted into a
  Markdown document without manual cleanup.
- Status information belongs in stable status-line segments or concise metadata
  headers, not in repeated framed blocks.
- Useful status-line segments from Oh My Pi should be retained or adapted:
  model, reasoning mode, branch, workspace, active research phase, gate status,
  queue/run status, token or context pressure, cost, and approval state.
- The renderer should separate research content from display chrome. Copying
  the scrollback should capture the content, not terminal decoration.
- The runtime should emit structured research events, and the CLI/TUI adapter
  should render them through `plain`, `compact`, or `rich` display profiles.
  `compact` should be the default for interactive research; `plain` should be
  the default for export, logs, CI, and scripted usage.
- Research artifacts must not depend on terminal copying. Every important
  transcript segment should also be exportable or source-linked through
  `.sk/research/transcripts/`, `.sk/research/reports/`, traces, claims, and
  evidence records.

Implementation boundary:

- Do not make `packages/scidekick-runtime` depend on TUI internals.
- Add the copy-friendly rendering contract in `packages/scidekick-cli` or a
  Scidekick-owned TUI adapter.
- Reuse low-level primitives from `packages/tui` where they help, but do not
  inherit the Oh My Pi box-heavy rendering style as the v2 default.
- Keep current coding-agent TUI behavior available for compatibility while v2
  research commands adopt the new renderer.

Spec Kit should track this as a dedicated feature:
`specs/001-copy-friendly-research-tui/spec.md`.

## Durable Research Store

The first v2 runtime should be local-first and filesystem-backed:

```text
.sk/
  research/
    session.jsonl
    state.json
    questions/
    hypotheses/
    plans/
    experiments/
    runs/
    claims/
    evidence/
    critiques/
    transcripts/
    review-rounds/
    review-issues/
    traces/
    teams/
    queues/
    dead-ends/
    champions/
    reports/
```

Use JSONL for event history and JSON plus Markdown for typed artifacts. The
Markdown gives researchers something commit-friendly and readable. The JSON
sidecars give the runtime stable contracts for enforcement.

Minimum event classes:

- `session.created`
- `state.transitioned`
- `question.recorded`
- `hypothesis.recorded`
- `plan.recorded`
- `experiment.preregistered`
- `run.started`
- `run.completed`
- `analysis.recorded`
- `critique.recorded`
- `review.round_started`
- `review.recorded`
- `review.issue_created`
- `review.issue_resolved`
- `review.meta_reviewed`
- `claim.created`
- `claim.promoted`
- `claim.rejected`
- `tool.requested`
- `tool.approved`
- `tool.rejected`
- `tool.completed`
- `handoff.created`
- `human.decision`

The store must be append-first. Later summarization can produce reports, wiki
syntheses, and dashboard views, but it must not erase the research trail.

## Research State Machine

The runtime should enforce these states:

```text
intake
scope
evidence_review
hypothesis
plan
preregister
execute
analyze
critique
peer_review
claim_review
publish_or_archive
```

### Transition Gates

`intake -> scope`

- Requires a recorded user objective or research question.
- Requires explicit in-scope and out-of-scope boundaries when the task is open
  ended.

`scope -> evidence_review`

- Requires a research context plan: what sources, repos, papers, datasets, or
  prior runs must be inspected.
- Requires declared uncertainty if the agent is starting from weak context.

`evidence_review -> hypothesis`

- Requires cited or linked evidence records.
- Requires at least one alternative hypothesis or null hypothesis for
  non-trivial scientific claims.

`hypothesis -> plan`

- Requires expected observations, falsification criteria, and likely failure
  modes.
- Requires a decision about whether implementation is allowed.

`plan -> preregister`

- Requires experiment spec, success criteria, stop condition, rollback plan,
  primary metric or qualitative rubric, and artifact targets.

`preregister -> execute`

- Requires the first hard v2 rule:

```text
No execution step may run without a recorded question, hypothesis or objective,
expected evidence, success criteria, and rollback or stop condition.
```

`execute -> analyze`

- Requires run artifacts, command/tool trace, environment snapshot, and raw
  outputs.

`analyze -> critique`

- Requires the analyst to separate observations from interpretation and record
  uncertainty.

`critique -> peer_review`

- Requires adversarial review by `Critic`, `Methodologist`, or
  `Reproducibility Auditor`.
- Requires explicit treatment of confounders, leakage, reward hacking, and
  missing controls when applicable.
- Requires a frozen artifact snapshot when the work has a manuscript, report,
  benchmark note, or other publishable output.

`peer_review -> claim_review`

- Requires at least one venue-calibrated review for publishable artifacts, or an
  explicit PI waiver for non-paper work.
- Requires a review issue ledger that separates fatal flaws, major weaknesses,
  unsupported claims, missing experiments, writing issues, and novelty concerns.
- Requires a meta-review or PI synthesis that prioritizes which objections must
  be resolved before claim promotion.
- Requires every review-driven remediation to be classified as writing-only,
  evidence-required, experiment-required, or out-of-scope.

`claim_review -> publish_or_archive`

- Requires a human or PI decision for any claim stronger than `observed`.
- Requires rejected or weak claims to be archived with reasons, not silently
  dropped.

## Evidence and Claim Ledger

Every conclusion should become a typed `ClaimRecord`.

Support levels:

- `unverified`: proposed interpretation with no executed evidence.
- `observed`: supported by one local observation or run.
- `replicated`: observed across repeated seeds, reruns, samples, or independent
  reproduction.
- `ablation_supported`: supported by an ablation, counterfactual, or controlled
  comparison.
- `externally_validated`: supported by external data, literature, independent
  benchmark, peer review, or human expert review.
- `rejected`: contradicted, failed, superseded, or withdrawn.

Rules:

- The agent may not state a claim more strongly than its support level allows.
- Claim promotion requires linked evidence records.
- `replicated` requires at least two independent supporting evidence records or
  a domain-specific replication note.
- `ablation_supported` requires a linked control, ablation, or counterfactual.
- `externally_validated` requires a linked external source or human decision.
- Rejected claims remain searchable and can seed the dead-end registry.

Minimum `ClaimRecord` fields:

```ts
interface ClaimRecord {
	id: string;
	title: string;
	statement: string;
	supportLevel: ClaimSupportLevel;
	scope: string;
	evidenceIds: string[];
	counterEvidenceIds: string[];
	sourcePaperIds: string[];
	runIds: string[];
	traceIds: string[];
	critiqueIds: string[];
	humanDecisionIds: string[];
	limitations: string[];
	updatedAt: string;
}
```

Minimum `EvidenceRecord` fields:

```ts
interface EvidenceRecord {
	id: string;
	kind: "paper" | "run" | "trace" | "artifact" | "human_review" | "external";
	summary: string;
	sourceUri: string;
	strength: "weak" | "moderate" | "strong";
	limitations: string[];
	observedAt: string;
}
```

## Tool Guardrails

V2 guardrails should run around tool calls, not only at the beginning or end of
an agent turn.

Tool risk classes:

- `read`: observes local or external state.
- `retrieve`: performs literature, web, database, or memory retrieval.
- `compute`: runs deterministic or bounded analysis.
- `mutate_workspace`: edits files or repository state.
- `mutate_external`: changes external systems, lab systems, SaaS, tickets, or
  cloud resources.
- `execute_untrusted`: runs arbitrary code, shell, notebook cells, or scripts.
- `spend_compute`: launches expensive jobs, sweeps, training runs, or paid APIs.

Required gates:

- Side-effect classification before execution.
- Human approval for `mutate_external`, high-risk `execute_untrusted`, and
  expensive `spend_compute`.
- Preregistration compatibility check for experiment execution.
- Provenance capture before and after every tool call.
- Postcondition verification for mutating tools.
- Claim/evidence linkage for any tool output used in analysis.

This matches MCP's security direction: tool and data access must be consented,
permissioned, and visible. MCP server tool descriptions should be treated as
untrusted metadata unless the server is trusted and admitted by policy.

## Orchestration Modes

All modes should share the same state store, guardrails, trace schema, and claim
ledger.

### Loop Mode

Use for tight metric loops and optimization tasks.

Shape:

```text
preregister metric -> baseline -> propose one change -> run -> analyze
  -> keep/discard -> update claim/evidence -> repeat or stop
```

This mode should wrap and eventually replace v1 `/autoresearch`. Unlike v1
autoresearch, loop mode must explicitly connect runs to claims, hypotheses,
limitations, and preregistered stop conditions.

### Pipeline Mode

Use for known scientific workflows.

Examples:

- literature review -> hypothesis generation -> critique -> synthesis
- dataset profile -> baseline -> ablation -> report
- paper ingest -> wiki page -> claim extraction -> evidence map
- benchmark audit -> contamination review -> reproducibility report

Pipeline steps are fixed, typed, and resumable. Each step declares inputs,
outputs, permitted tools, expected evidence, and transition criteria.

### Team Mode

Use for open-ended, long-running work.

Shared filesystem coordination:

```text
.sk/research/teams/
  roster.json
  forum/
  proposals/
  queues/
  critiques/
  dead-ends/
  champions/
  handoffs/
```

Team mode should borrow the strongest AutoScientists pattern:

- Agents read shared experimental state.
- Agents form teams around proposals.
- Proposals are critiqued before spending compute.
- Dead ends are recorded to avoid repeated failed directions.
- Champion results are promoted only through evidence gates.
- The PI role can pause, redirect, or require human review.

### Peer-Review Driven Research

Peer-Review Driven Research is a first-class v2 workflow for manuscript,
benchmark, report, and grant-like artifacts. It should also be callable from
loop, pipeline, and team mode.

Shape:

```text
artifact snapshot -> venue-style reviews -> meta-review -> review issue ledger
  -> prioritized remediation plan -> experiments / analysis / writing changes
  -> revised artifact -> review delta
```

This workflow treats simulated peer review as a structured adversary, not as a
score to optimize blindly. The runtime goal is to reduce legitimate reviewer
objections by adding evidence, tightening claims, changing framing, or rejecting
weak claims. It is not to produce a more flattering review.

Runtime rules:

- Reviews read a frozen artifact snapshot and linked evidence bundle, not the
  full authoring chat by default.
- Each review must cite exact manuscript/report sections or missing evidence.
- Each positive recommendation must still list remaining reasons to reject.
- Each criticism must state what evidence or revision would change the
  reviewer's mind.
- Writing-only fixes are separated from experiment-required fixes.
- A polished manuscript cannot promote a claim unless the claim ledger support
  level improves.
- Review deltas compare unresolved fatal flaws, major weaknesses, unsupported
  claims, missing baselines, missing ablations, and reproducibility concerns
  across rounds.

Minimum commands:

```bash
sk research review --venue neurips --artifact paper.tex
sk research review --round latest
sk research review-plan
sk research rebuttal-plan
sk research review-delta
sk research loop --from-review-issues
```

Minimum review issue types:

- `fatal_flaw`
- `major_weakness`
- `missing_baseline`
- `missing_ablation`
- `unsupported_claim`
- `unclear_framing`
- `methodological_concern`
- `writing_or_positioning`
- `novelty_concern`
- `related_work_gap`
- `reproducibility_gap`

Each `ReviewIssue` links to claims, evidence, artifact sections, experiments,
proposed remediations, and final resolution status.

## Research Roles

Use specialized roles rather than one general-purpose scientist.

- `PI`: owns final decisions, scope, risk, and claim promotion.
- `Scout`: gathers papers, docs, repos, datasets, and prior work.
- `Librarian`: maintains wiki, source records, citations, and retrieval quality.
- `Methodologist`: checks experimental design, controls, leakage, metrics, and
  statistical assumptions.
- `Experimenter`: implements and runs preregistered experiments.
- `Analyst`: interprets outputs and separates observation from explanation.
- `Critic`: attacks claims, identifies confounders, and forces alternatives.
- `Reviewer`: writes independent venue-calibrated reviews against frozen
  artifacts and evidence bundles.
- `Area Chair`: synthesizes independent reviews into a meta-review and
  acceptance-blocker list.
- `Rebuttal Strategist`: converts review issues into evidence, experiment,
  writing, or scope decisions.
- `Synthesizer`: writes reports, links claims, and updates wiki summaries.
- `Editor`: applies manuscript/report changes after the evidence or scope
  decision exists.
- `Reproducibility Auditor`: reruns, checks provenance, validates artifacts, and
  promotes regression cases.

Role permissions should differ. For example, `Scout` should not mutate code,
`Critic` should not promote claims, and `Experimenter` should not publish a
final conclusion without critique. `Reviewer` and `Area Chair` should not edit
the artifact they are reviewing in the same round.

## Trace Model

Keep local traces under `.sk/research/traces/`, but make them exportable to
OpenTelemetry-shaped data.

Trace event classes:

- agent invocation
- model invocation
- tool request
- tool approval or rejection
- tool execution
- MCP request
- retrieval call
- memory read/write
- research state transition
- review round
- review issue update
- claim promotion
- evidence attachment
- handoff
- guardrail result
- human decision

Useful trace-derived metrics:

- cost per supported claim
- failed hypothesis rate
- claim promotion latency
- tool error rate
- invalid tool-call rate
- human-intervention rate
- unsupported-claim prevention count
- unresolved review blocker count
- review issue resolution rate
- repeated-dead-end avoidance
- judge/critic disagreement rate
- context pressure
- memory hit rate

## PaperQA2 and Literature Integration

PaperQA2 should be integrated, not rebuilt. The default Scidekick runtime should
not require Python literature tooling to be installed. Add an optional adapter:

- MCP server or subprocess wrapper around PaperQA2.
- Local manifest that records PaperQA2 version, model, embedding model, index
  path, document sources, and citation outputs.
- Runtime output converted into `EvidenceRecord` and wiki pages.
- Failure mode captured when the adapter is unavailable, rate-limited, or has no
  indexed papers.

The same pattern should apply to other research services: BGPT, paper lookup,
database lookup, MLflow, W&B, DVC, Hugging Face, Langfuse, Braintrust, OpenAI
Evals, and LM Evaluation Harness.

## Core TypeScript Concepts

The first runtime implementation should define these public types before
implementing command behavior:

```ts
export interface ResearchSession {}
export interface ResearchState {}
export interface ResearchTransition {}
export interface ResearchObject {}
export interface ClaimRecord {}
export interface EvidenceRecord {}
export interface ResearchGate {}
export interface ResearchAgentSpec {}
export interface VerificationResult {}
export interface ResearchTraceEvent {}
export interface ReviewRecord {}
export interface ReviewIssue {}
export interface ReviewRound {}
export interface VenueRubric {}
export interface ReviewerProfile {}
export interface MetaReview {}
export interface RebuttalPlan {}
export interface ReviewDelta {}
export interface ResearchTranscriptEvent {}
export interface ResearchRenderProfile {}
export interface ResearchStatusSegment {}
export interface CopySafeRenderResult {}

export type ResearchRole =
	| "PI"
	| "Scout"
	| "Methodologist"
	| "Experimenter"
	| "Analyst"
	| "Critic"
	| "Reviewer"
	| "Area Chair"
	| "Rebuttal Strategist"
	| "Synthesizer"
	| "Editor"
	| "Reproducibility Auditor"
	| "Librarian";

export type ToolRiskClass =
	| "read"
	| "retrieve"
	| "compute"
	| "mutate_workspace"
	| "mutate_external"
	| "execute_untrusted"
	| "spend_compute";
```

The actual implementation should use concrete names and complete fields rather
than placeholder interfaces, but these are the stable concepts the rest of the
plan assumes.

## Migration Plan

### Phase 0: Architecture Artifact

Deliver this document and treat it as the v2 direction until replaced by a more
formal RFC.

Acceptance criteria:

- The document states that v2 is a Pi-level rewrite.
- It separates v2 runtime ownership from `packages/coding-agent`.
- It specifies state machine, gates, artifacts, roles, commands, and migration
  path.

### Phase 1: Runtime Package and Research Store

Add `packages/scidekick-runtime`.

Build:

- workspace discovery for `.sk/research`
- append-only `session.jsonl`
- typed `state.json`
- artifact directories
- state transition validator
- JSON/Markdown object writer

Acceptance criteria:

- `ResearchSession` can initialize and resume from disk.
- Invalid state transitions fail.
- Required fields are enforced before `execute`.
- No user home directory mutation in tests.

### Phase 2: Gated Single-Agent Research Loop

Add `sk research init`, `sk research plan`, `sk research status`, and a minimal
single-agent `sk research loop`.

Build:

- intake/scope/evidence/hypothesis/plan/preregister transitions
- execution gate
- run record
- analysis record
- critique record
- claim creation

Acceptance criteria:

- An agent cannot run experiment tools before preregistration.
- Outputs are attached to evidence records.
- Claims cannot be promoted without linked evidence.

### Phase 3: Claim Ledger and Report Flow

Add `sk research claim` and `sk research report`.

Build:

- claim support levels
- promotion rules
- rejected claim archive
- report generator from claims, evidence, critiques, and traces

Acceptance criteria:

- Unsupported claims are blocked or downgraded.
- Reports distinguish observation, interpretation, and speculation.
- Human decisions are recorded for strong claim promotion.

### Phase 3A: Copy-Friendly Research TUI Shell

Add a Scidekick-owned rendering layer for `sk research ...` commands before the
dashboard or full team UI exists.

Build:

- transcript event renderer for research states, gates, tools, reviews, claims,
  and run summaries
- display profiles: `plain`, `compact`, and `rich`
- status-line segment contract for model, mode, branch, phase, gate, queue,
  run, token/context, cost, and approval state
- transcript export to `.sk/research/transcripts/`
- compatibility adapter that leaves existing coding-agent TUI behavior intact

Acceptance criteria:

- Copied terminal output is usable Markdown-like text with minimal cleanup.
- Default `sk research ...` output does not use heavy boxes, nested borders, or
  repeated line art.
- Status-line segments remain informative without entering exported transcript
  content unless explicitly requested.
- Tool errors, diffs, claims, reviews, and evidence summaries remain readable
  after copy/paste.
- Snapshot tests cover `plain` and `compact` rendering for representative
  research events.

### Phase 4: Peer-Review Driven Research

Add `sk research review`, `sk research review-plan`,
`sk research rebuttal-plan`, and `sk research review-delta`.

Build:

- venue rubric registry
- frozen artifact snapshots
- independent reviewer runs
- area-chair meta-review
- review issue ledger
- remediation planner
- review delta comparison across rounds

Acceptance criteria:

- Reviews cite artifact sections or missing evidence.
- Review issues are linked to claims, evidence, experiments, and artifact
  sections.
- Remediations are classified as writing-only, evidence-required,
  experiment-required, or out-of-scope.
- A review improvement cannot promote a claim without stronger linked evidence.
- Review deltas show which fatal flaws and major weaknesses were resolved,
  newly introduced, or still unresolved.

### Phase 5: Literature Adapter

Add optional PaperQA2 integration.

Build:

- adapter discovery
- MCP/subprocess execution
- citation/evidence conversion
- wiki linkage

Acceptance criteria:

- Runtime works without PaperQA2 installed.
- When available, PaperQA2 outputs become evidence records with source links.
- Adapter failures are explicit and do not fabricate literature evidence.

### Phase 6: Pipeline Mode

Add typed workflow definitions for common scientific workflows.

Build:

- workflow manifest schema
- step input/output contracts
- per-step tool permissions
- resumable step execution

Acceptance criteria:

- Pipeline state resumes after interruption.
- Each step records artifacts and transition evidence.
- Failed steps can be retried without duplicating completed side effects.

### Phase 7: Team Mode

Add shared coordination primitives.

Build:

- roster
- work queues
- proposal board
- critique board
- dead-end registry
- champion registry
- handoff records

Acceptance criteria:

- Agents cannot overwrite each other's claims without critique/review.
- Proposal critique happens before expensive execution.
- Dead-end registry prevents repeated failed directions.
- Champion promotion uses the claim ledger.

### Phase 8: Observability and Dashboard

Build:

- trace inspection
- OTel export
- status dashboard
- run/claim/evidence navigation
- cost and confidence views

Acceptance criteria:

- Local trace can be inspected offline.
- OTel-shaped export includes model, tool, agent, handoff, guardrail, and
  research-object events.
- Dashboard surfaces unsupported claims and blocked gates.

### Phase 9: Compatibility Cleanup

Wrap or retire v1 surfaces.

Build:

- compatibility mapping from `/autoresearch` to `sk research loop`
- migration path from wiki/journal entries to research objects
- docs updates
- deprecation notes only after replacements are working

Acceptance criteria:

- Existing `sk wiki`, `sk journal`, `sk install-skills`, and coding sessions
  still work during migration.
- V2 commands do not depend on coding-agent prompt hacks.
- Upstream coding-agent sync becomes simpler, not harder.

## Test Plan

State-machine tests:

- invalid transitions fail
- required evidence fields are enforced
- resumed sessions continue from durable state
- `execute` is impossible before preregistration

Claim-ledger tests:

- unsupported claims cannot be promoted
- `replicated` requires repeated evidence
- `ablation_supported` requires linked control evidence
- rejected claims remain archived and searchable

Peer-review tests:

- review rounds freeze the artifact snapshot being reviewed
- reviewers receive the artifact and evidence bundle without authoring chat by
  default
- review issues cite artifact sections or missing evidence
- remediation plans classify each issue as writing-only, evidence-required,
  experiment-required, or out-of-scope
- review deltas preserve unresolved fatal flaws and major weaknesses across
  rounds
- improved review language cannot promote unsupported claims

Tool-guard tests:

- mutating tools require preregistration or explicit human approval
- tool outputs are traced and attached to evidence records
- MCP tool metadata is not trusted without policy admission
- postcondition verification runs after mutating tools

Long-running tests:

- interrupted runs resume without duplicating side effects
- queues preserve claimed work
- stale assignments are released by policy
- completed steps are not rerun on resume

Multi-agent tests:

- agents cannot overwrite each other's claims without critique/review
- dead-end registry prevents repeated failed directions
- PI-only decisions cannot be made by worker roles
- champion promotion requires evidence gates

Compatibility tests:

- `sk wiki` still works
- `sk journal` still works
- `sk install-skills` still works
- current coding-agent sessions still work during migration
- `/autoresearch` remains available until v2 loop replacement is complete

TUI and transcript tests:

- `plain` rendering contains no box-drawing glyphs, vertical borders, or
  repeated decorative dividers
- `compact` rendering preserves status-line segment values without embedding
  status chrome in exported transcript content
- copied tool errors, diffs, review issues, and claim summaries remain valid
  Markdown-like text
- transcript exports link back to trace, claim, evidence, and run identifiers
- coding-agent compatibility sessions keep their current TUI behavior until
  explicitly migrated

Verification commands:

```bash
bun check
bun --cwd=packages/scidekick-runtime test
```

Run package-local focused tests first. Run the full check before merging runtime
changes. For this document-only phase, no runtime test is required.

## Non-Goals for the First Implementation

- No enterprise server requirement.
- No mandatory vector database.
- No mandatory PaperQA2/Python installation.
- No lab robotics integration in the first local runtime.
- No wholesale replacement of the full Oh My Pi TUI before the research runtime
  exists. The first v2 UI work is a Scidekick research renderer and transcript
  contract.
- No hidden autonomous claim promotion.
- No new prompt-only promises without runtime enforcement.

## Design Risks

- Too much greenfield runtime work could delay useful behavior. Mitigation:
  reuse Pi agent core, AI providers, utilities, selected tools, and existing CLI
  compatibility where practical.
- Too much reuse of `packages/coding-agent` could preserve the coding-first
  failure mode. Mitigation: keep v2 state, gates, and roles in
  `scidekick-runtime`.
- Filesystem coordination may hit concurrency limits. Mitigation: use atomic
  writes and clear ownership records for v1; design an MCP/server adapter for
  larger teams.
- Claim gating could feel heavy for exploratory work. Mitigation: allow draft
  and `unverified` claims, but prevent unsupported strong language.
- Literature adapters can hallucinate or retrieve weak sources. Mitigation:
  convert retrieval output into evidence with strength, limitations, and source
  URIs instead of direct final claims.
- A rich TUI can undermine research reuse if it optimizes for screenshots over
  copyable text. Mitigation: make copy-friendly rendering a constitution-level
  requirement, keep display chrome out of exported transcript content, and test
  rendered output directly.

## Default Assumptions

- V2 is a Pi-level rewrite.
- Evidence gating, multi-agent scale, and durable research objects are coequal
  requirements.
- The first implementation is local-first and filesystem-backed.
- MCP/server backends are upgrade paths, not first-version requirements.
- Current v1 commands remain available until v2 has working replacements.
- The architecture should optimize for scientific caution over implementation
  speed.
