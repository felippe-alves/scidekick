# Scidekick Science Surface for AI/ML and Agentic AI Researchers

Scidekick should be a research workbench for AI/ML teams building models, evaluations, datasets, benchmarks, and agentic systems. It should not be a science-themed chat wrapper. The surface should center on durable research artifacts: papers, questions, hypotheses, experiments, training runs, sweeps, ablations, datasets, checkpoints, metrics, eval suites, traces, leaderboards, model cards, dataset cards, agent cards, a research wiki, and an append-only research journal.

Agentic AI should be an additional first-class layer on top of the AI/ML surface, not a replacement for it. Agent research adds objects that normal ML tracking does not capture well: agents, harnesses, task environments, sandboxes, tool calls, MCP servers, trajectories, rollouts, graders, judge rubrics, policies, memories, human approvals, failure taxonomies, and benchmark audits.

The product goal:

> Every research claim has a trace: claim → result → eval → run or rollout → config → code commit → dataset/taskset snapshot → model checkpoint or agent version → environment → trace → journal decision → wiki synthesis.

For agentic claims, the trace becomes:

> claim → taskset → environment → rollout → trajectory → tool calls → judge/grader → result → harness config → model/prompt/tool versions → sandbox state → human review → journal decision → wiki synthesis.

## Core research objects

Scidekick should expose first-class CLI nouns for AI/ML research:

```bash
sk wiki
sk journal
sk paper
sk question
sk hypothesis
sk experiment
sk run
sk sweep
sk ablation
sk dataset
sk model
sk checkpoint
sk eval
sk benchmark
sk leaderboard
sk trace
sk card
sk review
```

It should also expose first-class nouns for agentic AI research:

```bash
sk agent
sk harness
sk taskset
sk environment
sk sandbox
sk tool
sk mcp
sk prompt
sk memory
sk policy
sk rollout
sk trajectory
sk judge
sk grader
sk failure
sk guardrail
sk redteam
```

Use AI/ML objects as the base layer:

- `experiment`, `run`, `sweep`, and `ablation` for model and method research.
- `dataset`, `model`, `checkpoint`, and `eval` for standard ML reproducibility.
- `benchmark`, `leaderboard`, `card`, and `review` for research communication.

Use agentic objects when the system acts over time through tools or environments:

- `rollout`, `trajectory`, and `trace` instead of only `run`.
- `taskset`, `environment`, and `sandbox` instead of only `dataset`.
- `harness`, `tool`, `mcp`, `memory`, and `policy` instead of only `config`.
- `grader`, `judge`, and `human review` instead of only scalar metrics.

## Project layout

Use one durable `.sk/` workspace per research repo:

```text
.sk/
  wiki/
  journal/
  papers/
  questions/
  hypotheses/
  experiments/
  runs/
  sweeps/
  ablations/
  datasets/
  models/
  checkpoints/
  evals/
  benchmarks/
  leaderboards/
  traces/
  agents/
  harnesses/
  tasksets/
  environments/
  sandboxes/
  tools/
  mcp/
  prompts/
  memories/
  policies/
  rollouts/
  trajectories/
  judges/
  graders/
  failures/
  guardrails/
  redteam/
  cards/
  reviews/
```

This layout should coexist with common infrastructure rather than replacing it. Scidekick should link to MLflow runs, W&B runs, DVC data versions, Hugging Face repos, local checkpoints, OpenTelemetry exports, LangSmith traces, Langfuse traces, Braintrust evals, GitHub issues, SWE-bench submissions, OpenReview pages, MCP servers, sandbox artifacts, CI logs, and benchmark leaderboards.

## Wiki surface

Ship:

```bash
sk wiki init
sk wiki ingest <paper|repo|run|trace|eval|dataset|model|agent|benchmark|tool|mcp-server>
sk wiki page <name>
sk wiki query <question>
sk wiki link
sk wiki lint
sk wiki export
```

The wiki should store curated, non-chronological research knowledge:

```text
.sk/wiki/
  index.md
  papers/
  methods/
  architectures/
  datasets/
  benchmarks/
  evals/
  baselines/
  models/
  agents/
  harnesses/
  tools/
  mcp-servers/
  environments/
  tasksets/
  judges/
  graders/
  policies/
  memories/
  failure-modes/
  guardrails/
  claims/
  open-questions/
  reproductions/
  reports/
```

Minimum behavior:

- Every ingested paper gets a canonical page with contributions, assumptions, datasets, metrics, limitations, implementation details, related work, and benchmark claims.
- Every dataset page records source, license, version, preprocessing, splits, known leakage risks, and supported claims.
- Every model page records base model, architecture, training data, checkpoint lineage, eval results, intended use, limitations, and deployment constraints.
- Every benchmark page records task definition, splits or environments, metrics, graders, known saturation, contamination risks, and leaderboard caveats.
- Every agent page records model, prompt stack, context builder, memory design, tool router, available tools, guardrails, approval policy, cost profile, and known failure modes.
- Every tool and MCP server page records schema, permissions, side effects, trust boundary, test fixtures, and security notes.
- Every claim links to the exact result, run or rollout, eval config, dataset or taskset snapshot, trace, grader or metric, and journal decision that support it.
- Wiki lint checks orphan pages, broken links, uncited claims, stale benchmark notes, missing dataset cards, missing model cards, missing agent cards, unlinked traces, and unclassified failures.

## Research journal surface

Ship:

```bash
sk journal init
sk journal add
sk journal today
sk journal timeline
sk journal summarize
sk journal link <entry> <object>
sk journal export
```

The journal is the chronological research memory:

```text
.sk/journal/
  2026/
    2026-05-31.md
  index.md
```

Journal entries should capture:

- research question being pursued
- hypothesis or design change
- run IDs, sweep IDs, rollout IDs, and trace IDs
- configs, prompts, tools, memory, or policy versions changed
- datasets, tasksets, checkpoints, and environments used
- surprising metrics
- failed runs, failed trajectories, and dead ends
- error-analysis notes
- judge disagreements and human review decisions
- safety or permission concerns
- cost and latency surprises
- reviewer feedback
- decisions made
- open questions
- links to wiki pages, papers, runs, rollouts, evals, traces, plots, cards, and failure reports

The journal should be append-first. Agents may summarize, index, and cross-link entries, but should not silently erase the research trail.

## Experiment, run, sweep, and ablation surface

Ship:

```bash
sk experiment init
sk experiment plan
sk run launch
sk run status
sk run inspect
sk run compare
sk sweep launch
sk sweep status
sk ablation plan
sk ablation run
sk experiment promote
sk experiment report
```

Minimum experiment directory:

```text
.sk/experiments/<slug>/
  question.md
  hypothesis.md
  experiment-spec.md
  baseline.md
  configs/
  runs/
  sweeps/
  ablations/
  evals/
  plots/
  tables/
  traces/
  checkpoints/
  failures.md
  champion.md
  model-card.md
  dataset-card.md
  journal-links.md
  wiki-links.md
  ro-crate-metadata.json
```

Promotion should require explicit criteria:

- primary metric
- secondary metrics
- confidence interval or repeated-seed result when practical
- baseline comparison
- ablation support
- regression check
- contamination or leakage check for benchmark claims
- human review when the metric is subjective

## Data, model, and artifact versioning

Ship:

```bash
sk dataset init
sk dataset snapshot
sk dataset card
sk model register
sk model card
sk checkpoint list
sk artifact link
```

Scidekick should not duplicate DVC, MLflow, W&B, or Hugging Face. It should integrate with them and keep the scientific index.

Record:

- Git commit
- DVC or content-addressed dataset version
- preprocessing code version
- train/validation/test split IDs
- random seeds
- framework versions
- hardware summary
- checkpoint URI
- artifact URI
- MLflow or W&B run URI
- Hugging Face model or dataset repo URI

MLflow Tracking is organized around runs, models, and experiments, and logs parameters, code versions, metrics, and output files for later comparison. MLflow 3 also links metrics to model checkpoints and datasets. Hugging Face model cards document intended uses, limitations, training parameters, datasets, and evaluation results; dataset cards document dataset metadata, responsible-use context, license, task categories, and discoverability metadata.

## Evaluation and benchmark surface

Ship:

```bash
sk eval init
sk eval run
sk eval compare
sk eval regressions
sk eval contamination
sk eval report
sk benchmark ingest
sk benchmark audit
sk leaderboard update
```

Evaluation should be treated as a research object, not just a command output. NeurIPS 2026 explicitly reframed evaluation as a scientific object of study: evaluation design, assumptions, tools, metrics, benchmarks, auditing, red-teaming, and documentation shape what claims are justified.

For every eval, record:

- task definition
- dataset or taskset version
- split or environment snapshot
- prompt or input template
- decoding parameters
- metric implementation
- deterministic grader when available
- judge model and rubric when using LLM-as-judge
- number of seeds, samples, trials, or rollouts
- confidence intervals when available
- cost
- latency
- failure cases
- contamination notes

Support common AI/ML evaluation modes:

- classic supervised metrics
- generative metrics
- LLM benchmark harnesses
- agent traces
- human preference review
- red-team evals
- regression suites
- benchmark audits
- leaderboard reproduction

For LLM work, Scidekick should integrate with tools like OpenAI Evals and EleutherAI's Language Model Evaluation Harness rather than inventing a private benchmark runner. OpenAI Evals is a framework for evaluating LLMs and LLM systems and supports private custom evals. The LM Evaluation Harness provides a unified framework for testing generative language models on many benchmarks with reproducible prompts and custom metrics.

## Agent, harness, and environment surface

Ship:

```bash
sk agent init
sk agent run
sk agent inspect
sk agent compare
sk agent card
sk harness init
sk harness inspect
sk environment init
sk sandbox init
sk sandbox reset
sk sandbox snapshot
```

Minimum agent directory:

```text
.sk/agents/<agent-slug>/
  agent-spec.md
  model.md
  prompts/
  tools.md
  mcp.md
  memory.md
  policy.md
  guardrails.md
  harness.md
  evals/
  traces/
  failures.md
  agent-card.md
  journal-links.md
  wiki-links.md
```

Minimum harness directory:

```text
.sk/harnesses/<harness-slug>/
  harness-spec.md
  context-builder.md
  tool-router.md
  execution.md
  sandbox.md
  tracing.md
  eval.md
  governance.md
  adapters/
  fixtures/
  tests/
```

Minimum environment directory:

```text
.sk/environments/<env-slug>/
  environment-spec.md
  setup/
  initial-state/
  gold-state/
  tools/
  secrets-policy.md
  network-policy.md
  reset.md
  verifier.md
```

Agent research should make the harness visible. Terminal-Bench highlights why: task outcomes depend on the model, scaffold, container, tool interface, tests, and anti-cheat design, not only on the underlying LLM. WebArena and OSWorld likewise show that realistic web and desktop environments require task setup, executable environments, and execution-based evaluation rather than static QA.

## Taskset and agent benchmark surface

Ship:

```bash
sk taskset init
sk taskset validate
sk taskset audit
sk taskset run-oracle
sk benchmark ingest
sk benchmark run
sk benchmark compare
sk benchmark audit
sk leaderboard update
```

Minimum taskset directory:

```text
.sk/tasksets/<taskset-slug>/
  taskset-card.md
  tasks/
  environments/
  graders/
  oracle-solutions/
  rubrics/
  fixtures/
  anti-cheat.md
  contamination.md
  audit-log.md
```

Every task should record:

- instruction
- environment initialization
- available tools
- hidden or visible state
- gold outcome
- deterministic verifier when available
- LLM judge rubric when deterministic verification is impossible
- timeout and budget
- allowed network and filesystem access
- oracle solution or human reference
- known exploit paths
- reviewer notes

Agentic benchmarks should be outcome-driven. Terminal-Bench tasks include an instruction, containerized environment, tests, reference solution, and time limit; the tests verify final state rather than command text. τ-bench evaluates tool-agent-user interaction by comparing final database state with an annotated goal state and reports pass@k because consistency across trials matters. These are better patterns for Scidekick than one-shot answer matching.

The benchmark set should include suites relevant to agentic research: SWE-bench for GitHub issue resolution, WebArena for realistic web tasks, OSWorld for desktop computer-use, GAIA for general assistant tasks requiring reasoning, browsing, file parsing, and multimodality, τ-bench for tool-agent-user interaction with policy adherence, AgentBench for multi-environment decision-making, and Terminal-Bench for long-horizon terminal tasks.

## Rollout, trajectory, and trace surface

Ship:

```bash
sk rollout run
sk rollout replay
sk rollout compare
sk trajectory inspect
sk trajectory diff
sk trace ingest
sk trace inspect
sk trace export --otel
sk trace failure-modes
```

Minimum rollout directory:

```text
.sk/rollouts/<rollout-id>/
  rollout.json
  agent.json
  harness.json
  environment.json
  task.json
  transcript.jsonl
  spans.jsonl
  tool-calls.jsonl
  artifacts/
  screenshots/
  final-state/
  grader-result.json
  judge-result.json
  failure-labels.json
  cost.json
  journal-links.md
```

For every trajectory, record:

- model calls
- prompts and prompt versions
- context windows and retrieved memories
- tool calls
- tool inputs and outputs
- MCP server and tool schema versions
- observations
- intermediate plans when available
- inter-agent messages and handoffs
- human approvals or interventions
- screenshots or GUI observations
- command outputs
- final state
- grader result
- judge result
- cost, token, latency, and retry data

Trace-based evaluation should be first-class because agent behavior is not captured by the final answer. An agent can produce a correct final answer while using brittle tools, unsafe actions, excessive budget, invalid recovery behavior, or hidden policy violations.

## Observability and OpenTelemetry surface

Ship:

```bash
sk observe init
sk observe status
sk trace export --otel
sk trace import --otel
sk trace metrics
sk trace dashboard
```

Scidekick should use OpenTelemetry-shaped traces as the neutral interchange format. OpenTelemetry’s GenAI work is explicitly trying to standardize telemetry for model calls, vector databases, agent applications, and agent frameworks, so Scidekick should not invent a private trace schema unless necessary.

Record these span classes:

- training or eval run
- agent rollout
- model invocation
- tool call
- MCP request
- retrieval call
- memory read/write
- environment observation
- sandbox command
- browser action
- GUI action
- grader execution
- judge execution
- human approval
- inter-agent handoff

Useful trace-derived metrics:

- task success
- pass@k
- cost-per-success
- token-per-success
- latency-per-success
- tool-call count
- invalid tool-call rate
- recovery rate after tool failure
- human-intervention rate
- policy-violation rate
- unsafe-action rate
- judge disagreement rate
- context-window pressure
- memory hit rate

## Tool, MCP, and permission surface

Ship:

```bash
sk tool list
sk tool inspect <tool>
sk tool test <tool>
sk tool replay <call-id>
sk mcp list
sk mcp inspect <server>
sk mcp test <server>
sk policy check <trace>
```

Every tool and MCP server should have:

- schema
- examples
- permission class
- side effects
- idempotency notes
- timeout behavior
- retry behavior
- sandbox requirement
- trust boundary
- allowed roots
- secret access policy
- audit log
- fixture tests

MCP defines a standardized protocol for hosts, clients, and servers to expose resources, prompts, and tools over JSON-RPC, with explicit security principles around user consent, data privacy, tool safety, and sampling controls. Scidekick should treat tool descriptions as untrusted unless they come from a trusted server, and it should make user approvals and side effects visible in traces.

## Prompt, memory, and policy surface

Ship:

```bash
sk prompt version
sk prompt diff
sk prompt eval
sk memory inspect
sk memory replay
sk policy init
sk policy test
sk policy audit
```

Agentic systems need durable versions for more than source code:

- system prompt
- developer prompt
- task prompt
- few-shot examples
- tool descriptions
- context-builder rules
- memory retrieval policy
- memory write policy
- planning policy
- delegation policy
- approval policy
- refusal policy
- escalation policy

Policy changes should be evaluated like code changes. A prompt that improves task success but increases unsafe tool calls or human overrides should not be promoted silently.

## Judge, grader, and human-review surface

Ship:

```bash
sk grader init
sk grader run
sk grader validate
sk judge init
sk judge calibrate
sk judge compare
sk review queue
sk review adjudicate
```

Scidekick should separate deterministic graders from LLM judges:

- Use deterministic graders for final state, database state, tests, exact outputs, schema validity, and policy violations whenever possible.
- Use LLM judges for subjective quality, helpfulness, plan quality, explanation quality, trajectory labeling, and failure-mode annotation.
- Require calibration datasets for LLM judges before using them to support claims.
- Record judge model, prompt, rubric, examples, temperature, and disagreement against human labels.
- Route borderline or high-impact judgments to human review.

Human review should feed the eval loop: correction → reasoning → test case → future regression. This is especially important for agent failures that are valid actions syntactically but wrong in context.

## Failure taxonomy surface

Ship:

```bash
sk failure label
sk failure cluster
sk failure taxonomy
sk failure report
sk regression add <failure-id>
```

AI/ML and agentic research need failure objects, not just failed scores.

Initial taxonomy:

- data leakage
- benchmark contamination
- metric bug
- baseline mismatch
- seed sensitivity
- regression
- task misunderstanding
- invalid plan
- context loss
- memory retrieval failure
- tool selection error
- invalid tool arguments
- tool execution failure
- environment grounding failure
- GUI grounding failure
- browser navigation failure
- sandbox setup failure
- dependency or package failure
- policy violation
- unsafe action
- refusal error
- hallucinated state
- premature stop
- loop or thrash
- poor recovery
- verifier gaming
- benchmark exploit
- judge error
- human handoff failure
- multi-agent coordination failure

Every failed run or trajectory should be labelable, clusterable, and promotable into a regression test.

## Reliability and research-quality guardrails

Ship:

```bash
sk result verify
sk result replicate
sk claim trace
sk claim audit
sk seed run
sk leakage check
sk regression check
sk redteam run
sk redteam replay
sk guardrail init
sk guardrail test
sk guardrail audit
sk permission audit
```

For AI/ML research, guardrails should focus on:

- seed sensitivity
- train/test leakage
- benchmark contamination
- overfitting to evals
- missing baselines
- missing ablations
- missing confidence intervals
- cherry-picked runs
- hardware or batch-size confounds
- non-comparable metrics
- unpinned dependencies
- unrecorded prompts
- LLM judge drift

Agentic systems add risks beyond normal LLM output quality:

- prompt injection through tools, web pages, files, and MCP resources
- malicious tool descriptions
- unsafe shell commands
- destructive filesystem operations
- credential exfiltration
- hidden network calls
- unauthorized data access
- tool-result spoofing
- benchmark hacking
- verifier gaming
- privilege escalation across agents
- human approval bypass

The system should refuse to mark a claim as supported when the required run, rollout, dataset, taskset, checkpoint, trace, eval config, grader, judge rubric, or metric implementation is missing.

## Literature, review, and reproduction surface

Ship:

```bash
sk paper search
sk paper ingest
sk paper compare
sk paper prior-art
sk paper claims
sk reproduce init <paper|benchmark>
sk reproduce run
sk reproduce compare
sk review draft
sk review rebuttal-notes
```

Paper ingestion should update both the wiki and the journal:

- Wiki: canonical paper page, method summary, agent architecture when relevant, benchmark claims, assumptions, limitations, implementation details, task environments, failure modes, and related work graph.
- Journal: what was read, why it mattered, what changed in the current research direction, and what experiments, evals, or traces it suggests.

AI/ML-specific paper workflows:

- track claimed SOTA separately from reproduced SOTA
- extract baselines and compute requirements
- record whether code, data, and checkpoints are available
- map paper claims to local experiments
- draft reviewer-style critiques
- prepare rebuttal notes linked to evidence

Agentic reproduction should capture:

```text
.sk/reproductions/<slug>/
  paper.md
  claimed-results.md
  available-artifacts.md
  harness.md
  environment.md
  taskset.md
  agent-config.md
  deviations.md
  runs/
  rollouts/
  traces/
  comparison.md
  report.md
```

A reproduction is successful only if Scidekick can explain what matched, what diverged, and whether differences came from the model, harness, environment, dataset, taskset, grader, judge, or execution budget.

## Cards and reports

Ship:

```bash
sk card model
sk card dataset
sk card agent
sk card eval
sk card benchmark
sk card tool
sk report trace
sk report failure
sk report leaderboard
```

Model card:

- intended use
- base model and architecture
- training data
- training procedure
- eval summary
- limitations
- safety notes
- deployment constraints

Dataset card:

- source
- license
- schema
- preprocessing
- splits
- leakage risks
- intended use
- limitations

Agent card:

- intended use
- non-goals
- model and provider
- prompt stack
- tool set
- MCP servers
- memory policy
- permissions
- sandbox assumptions
- evaluation summary
- cost and latency profile
- known failure modes
- safety limitations

Eval card:

- dataset or taskset
- environment
- metric or grader
- judge when applicable
- metrics
- number of trials
- pass@k when applicable
- confidence interval
- contamination notes
- human-review procedure
- limitations

Benchmark card:

- task source
- task construction
- task naturalness
- environment reproducibility
- anti-cheat controls
- oracle availability
- hidden/public split
- saturation risk
- leaderboard caveats

## Provenance as default infrastructure

Scidekick should record provenance for every meaningful run and rollout by default.

Start with Process Run RO-Crate for individual training runs, eval jobs, and agent rollouts. Later support richer Workflow Run Crates for multi-step pipelines, multi-agent evaluations, and reproduction studies.

For every AI/ML run, record:

- command or tool executed
- agent, model, and version when applicable
- code commit
- config
- parameters and hyperparameters
- random seeds
- input dataset snapshot
- output artifacts
- checkpoint URI
- metrics
- plots and tables
- trace files
- environment and hardware
- status or error
- timestamps
- linked hypothesis
- linked eval
- linked journal entry
- linked wiki pages
- linked claim and result objects

For every agent rollout, additionally record:

- harness invocation
- prompt versions
- tool and MCP versions
- policy versions
- memory snapshot
- environment snapshot
- sandbox image or VM state
- task ID
- trace ID
- grader result
- judge result
- human-review result
- screenshots
- cost, token, and latency data

RO-Crate is interoperable, JSON-LD based, aligned with W3C PROV, and implemented by multiple workflow systems. Scidekick should use it for portable provenance while using OpenTelemetry for operational traces.

## Immediate engineering sequence

1. Wire current packages into the CLI:
   - `sk install-skills`
   - `sk wiki`
   - `sk guard`
   - root changelog

2. Add the research journal:
   - append-only dated entries
   - links to papers, questions, hypotheses, experiments, runs, sweeps, evals, agents, harnesses, tasksets, rollouts, traces, and wiki pages
   - summary command

3. Add the AI/ML wiki object model:
   - pages for papers, methods, architectures, datasets, benchmarks, evals, baselines, models, claims, reproductions, and open questions
   - backlink and lint support
   - ingestion from papers, repos, eval reports, and run artifacts

4. Add experiment/run tracking:
   - experiment directory layout
   - run log
   - sweep log
   - ablation log
   - champion record
   - failures and dead ends
   - wiki and journal links

5. Add model and dataset cards:
   - generate Hugging Face-compatible `model-card.md`
   - generate `dataset-card.md`
   - lint missing intended use, limitations, license, training data, evals, and metrics

6. Add eval integrations:
   - OpenAI Evals adapter
   - LM Evaluation Harness adapter
   - generic command adapter for custom eval scripts
   - regression and comparison reports

7. Add the agentic wiki object model:
   - pages for agents, harnesses, tools, MCP servers, environments, tasksets, judges, graders, policies, failures, and guardrails
   - ingestion from traces, eval reports, and benchmark artifacts

8. Add trace and rollout storage:
   - rollout directory layout
   - trajectory transcript
   - tool-call log
   - span log
   - artifact capture
   - grader and judge outputs
   - failure labels

9. Add taskset and benchmark support:
   - taskset card
   - task validator
   - oracle runner
   - anti-cheat audit
   - deterministic grader adapter
   - LLM judge adapter

10. Add OpenTelemetry import/export:
   - export agent, model, tool, MCP, memory, sandbox, grader, and judge spans
   - import LangSmith/Langfuse/MLflow traces where possible
   - compute trace-derived metrics

11. Add agent eval matrices:
   - compare model, prompt, tool, memory, policy, and harness variants
   - report success, pass@k, cost-per-success, latency, tool errors, recovery rate, and failure distribution

12. Add provenance export:
   - start with Process Run RO-Crate
   - later support Workflow Run Crate
   - include ML metadata: config, seed, dataset snapshot, checkpoint, hardware, metric implementation
   - include agent metadata: harness, prompts, tools, MCP servers, taskset, sandbox, grader, judge, trace

13. Add regression loop:
   - failed run or trace → label → cluster → regression case
   - human correction → rationale → test case
   - promote only when success improves without worsening cost, safety, or policy adherence beyond declared thresholds

## Sources

- [NeurIPS 2026 Evaluations & Datasets Track](https://blog.neurips.cc/2026/03/23/introducing-the-evaluations-datasets-track-at-neurips-2026/)
- [MLflow Tracking documentation](https://mlflow.org/docs/latest/ml/tracking/)
- [DVC documentation](https://doc.dvc.org/)
- [Hugging Face Model Cards](https://huggingface.co/docs/hub/model-cards)
- [Hugging Face Dataset Cards](https://huggingface.co/docs/hub/datasets-cards)
- [OpenAI Evals](https://github.com/openai/evals)
- [EleutherAI Language Model Evaluation Harness](https://github.com/EleutherAI/lm-evaluation-harness)
- [Workflow Run RO-Crate](https://pmc.ncbi.nlm.nih.gov/articles/PMC11386446/)
- [OpenTelemetry AI Agent Observability](https://opentelemetry.io/blog/2025/ai-agent-observability/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [SWE-bench Leaderboards](https://www.swebench.com/)
- [Terminal-Bench 2.0](https://arxiv.org/html/2601.11868v1)
- [τ-bench](https://arxiv.org/abs/2406.12045)
- [WebArena](https://arxiv.org/abs/2307.13854)
- [OSWorld](https://arxiv.org/abs/2404.07972)
- [AgentBench](https://arxiv.org/abs/2308.03688)
- [GAIA](https://arxiv.org/abs/2311.12983)