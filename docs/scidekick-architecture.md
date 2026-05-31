# Scidekick Architecture & Direction

Analysis of the landscape for converting Scidekick into a science/research agent harness. Last updated 2026-05-31. Scidekick is currently a direct fork of Oh My Pi, not a vendor submodule and not a deep-rename fork.

---

## Current Implementation Status

This document is partly aspirational. The checked roadmap below has been corrected to distinguish code that exists from product behavior that is actually wired into the CLI.

### Implemented and working

- Direct Oh My Pi fork with localized Scidekick product identity defaults in `packages/utils/src/dirs.ts`.
- Source CLI identifies as `sk` by default and uses `.sk` as the default config directory.
- Standalone Scidekick packages exist:
  - `packages/scidekick-science`
  - `packages/scidekick-guard`
  - `packages/scidekick-skills`
- `packages/scidekick-guard` provides tested model-tier classification helpers and a SQLite skill registry.
- `packages/coding-agent` now wires `sk install-skills` and `sk wiki` into the CLI with focused command tests.
- The release workflow builds and publishes GitHub release binaries named `sk-*`.
- The full workspace TypeScript test suite currently passes locally after the Scidekick identity cutover and command wiring.

### Implemented but not fully wired into science workflows

- The skill registry records metadata, but no validation benchmark/gate runs before skills are used.
- Violet-teal-amber theme files exist under `.sk/`, but they are not the default active theme.

### Planned, not implemented

- Theme activation/discoverability as the default Scidekick visual identity.
- Theme activation/discoverability as the default Scidekick visual identity.
- Loop, pipeline, team, extract, and evolve modes.

---

## Landscape Survey: Science AI Systems in 2026

The field has matured rapidly. Below is a structured survey of every major system, what it does, and what scidekick can learn from it.

### 1. Fully Automated Discovery Systems

These systems aim for end-to-end autonomy — from hypothesis to paper.

#### The AI Scientist (Sakana AI, 2024–2026)
- **What it does**: Fully automated ML research. Generates ideas, writes code, runs experiments, writes papers, conducts peer review. v1 (Aug 2024) used human-authored templates; v2 (Mar 2026) removes templates, uses agentic tree search, and produced the first fully AI-generated paper accepted at a peer-reviewed workshop.
- **Architecture**: Single-agent pipeline with LLM-driven ideation → code generation → experiment execution → paper writing → automated review. v2 adds an Experiment Manager agent that guides tree search across research directions.
- **Key insight**: Template-driven workflows (v1) have higher success rates than fully exploratory ones (v2). The right abstraction level matters — too much freedom reduces reliability.
- **Cost**: $6–$15 per paper.
- **Repo**: [github.com/SakanaAI/AI-Scientist-v2](https://github.com/SakanaAI/AI-Scientist-v2)
- **What scidekick learns**: The ideation → code → experiment → paper pipeline is a core workflow. The lesson about template vs. exploration tradeoff applies to our experiment orchestration. A science harness should support both: structured templates for known workflows, free-form exploration for novel domains.

#### Robin (FutureHouse, 2025–2026)
- **What it does**: First multi-agent system that fully automates hypothesis generation AND data analysis for experimental biology. Applied to dry AMD, it identified ripasudil (a ROCK inhibitor) as a novel therapeutic candidate — all hypotheses, experiment choices, and data analyses were generated autonomously. Published in *Nature*.
- **Architecture**: Three specialized agents: Crow (concise literature search, built on PaperQA2), Falcon (deep literature synthesis), Finch (scientific data analysis — RNA-seq, flow cytometry). Orchestrated as a workflow using the Aviary framework. Uses OpenAI o4-mini for literature synthesis, Claude 3.7 Sonnet for complementary tasks.
- **Key insight**: Specialization beats generality. Three narrowly-scoped agents with clear interfaces outperform a single generalist. The literature search agent (PaperQA2) achieves superhuman accuracy — better than PhD/postdoc biologists at retrieving information.
- **Repo**: [github.com/Future-House/robin](https://github.com/Future-House/robin)
- **What scidekick learns**: The three-agent pattern (literature → synthesis → analysis) maps directly onto our Phase 2–3 architecture. PaperQA2 is a component we should integrate, not rebuild. The Aviary framework (open-source gymnasium for training language agents on scientific tasks) is worth studying — it enabled open-source 8B models to beat frontier models on specific scientific tasks through specialized tooling and task-specific training.

#### Coscientist (CMU, 2023)
- **What it does**: GPT-4-driven system that autonomously designs, plans, and executes chemical reactions. Successfully executed Suzuki-Miyaura coupling (Nobel Prize-winning reaction) on first try with 50% yield. Published in *Nature*.
- **Architecture**: Modular multi-LLM agent: internet search → documentation retrieval → code execution → robotic experimentation APIs. Chemical reasoning includes reagent selection with justifications based on reactivity and selectivity.
- **Key insight**: Tool integration is the multiplier. GPT-4 alone can't do chemistry. GPT-4 + web search + documentation + code execution + lab robotics can. The value is in the integration, not the model.
- **What scidekick learns**: Lab integration isn't a "Phase 4 nice-to-have" — it's the difference between a paper-writing assistant and a real scientist. Opentrons, Benchling, and OMERO skills exist; the challenge is wiring them into a coherent experiment loop.

#### Lila Sciences (Flagship Pioneering, 2025–2026)
- **What it does**: "Scientific superintelligence" platform. AI Science Factories — unified facilities where AI, robotics, and custom hardware close the loop between reasoning and real-world verification. $550M funding, $1.3B+ valuation. Claims hundreds of thousands of experiments across biology, chemistry, and materials. CRISPR pioneer George Church is chief scientist.
- **Architecture**: Closed-loop ecosystem: AI models design experiments → direct robotic instruments (liquid handlers, robotic arms, high-throughput screening, imaging, spectroscopy) → interpret readouts → decide what to test next. Domain-specific instrumentation per science area. Operates as a platform provider: partners get access to AI models and robotic labs, not individual discoveries.
- **Key insight**: The "AI Science Factory" concept — three feedback loops. Inner loop: AI → robot → measurement → AI (minutes). Middle loop: experiment results → model retraining → improved hypotheses (hours). Outer loop: human scientists review, redirect, set new goals (days/weeks). This is the right abstraction for scidekick's eventual lab integration.
- **What scidekick learns**: The three-loop model is worth adopting even for purely computational work. Inner loop = code → run → measure. Middle loop = results → analysis → next experiment. Outer loop = human review and direction. The orchestrator architecture in Phase 3 should support this nesting.

### 2. Multi-Agent Research Platforms

#### Google Co-Scientist (DeepMind, 2025–2026)
- **What it does**: Multi-agent AI system built with Gemini that generates, debates, and evolves hypotheses. Validated across three biomedical applications: drug repurposing for AML, target discovery for liver fibrosis, and antimicrobial resistance mechanisms. Published in *Nature*. Available to researchers through Gemini for Science.
- **Architecture**: Coalition of specialized agents in three phases: Generation agent (proposes hypotheses) → Debate/Reflection agents (critique and refine) → Meta-review agent (synthesizes insights, optimizes system). Supervisor agent acts as adaptive planner — breaks down research goals into executable steps, coordinates parallel exploration. "Tournament of ideas" approach explores thousands of research directions.
- **Key insight**: The generate → debate → evolve cycle, scaled by test-time compute, is the core innovation. It's not about a smarter single agent — it's about structured adversarial reasoning between agents. The tournament mechanism (competing hypotheses, ranked by evidence) prevents premature convergence on weak ideas.
- **Open-source implementation**: [github.com/conradry/open-coscientist-agents](https://github.com/conradry/open-coscientist-agents) (LangGraph + GPT Researcher)
- **What scidekick learns**: The debate/tournament pattern should be a first-class orchestration primitive in Phase 3, not an afterthought. The AutoScientists pattern already has a discussion phase — Co-Scientist's tournament shows how to make it systematic and scaled.

#### AutoScientists (MIMS Harvard, 2026)
- **What it does**: Self-organizing agent teams for long-running computational experiments. Decentralized — agents form teams around promising hypotheses, critique proposals before spending compute, share successes and failures. 74.4% mean leaderboard percentile on BioML-Bench (+8.33% over prior AI agents), 1.9× faster on training optimization. Published at arXiv.
- **Architecture**: Covered in detail in the original analysis (Section: Multi-Agent Orchestration). Key additions from further research: uses Claude Code + ClawInstitute for coordination. Empirical finding that Haiku-class models fail catastrophically at analyst work ("describe instead of do" — hallucinate that no API is available). Always use Sonnet or Opus for analysts.
- **What scidekick learns**: The model-tier finding is actionable — scidekick should warn or prevent Haiku-tier models from being used for scientific reasoning tasks. The ClawInstitute dependency is a design choice, not a requirement — the coordination primitives (workshops, workspaces, message boards) are straightforward to implement or replace.

#### ClawdLab / Beach.Science (OpenClaw ecosystem, 2026)
- **What it does**: Two complementary platforms for autonomous scientific research. ClawdLab: structured laboratory where agents collaborate under PI governance with hard role restrictions, structured adversarial critique, and evidence requirements enforced through external tool verification. Beach.Science: free-form public research commons where heterogeneous agents discover and contribute. Published at arXiv.
- **Architecture**: Three-tier taxonomy: Tier 1 (single-agent pipelines), Tier 2 (predetermined multi-agent workflows), Tier 3 (fully decentralized — foundation models, capabilities, governance, verification, inter-lab coordination all independently modifiable). ClawdLab/Beach.Science instantiate Tier 3 — composable components that improve as the AI ecosystem advances.
- **Key insight**: Role restrictions + adversarial critique + external verification produce emergent Sybil resistance as a structural property. You don't need to detect bad agents — the architecture makes it impossible for them to succeed. This is the right security model for autonomous science.
- **Repo**: [clawdlab.xyz](https://www.clawdlab.xyz/)
- **What scidekick learns**: The three-tier taxonomy is a design framework. scidekick should aim for Tier 2 now (predetermined workflows with human-designed agent roles), with an architecture that can evolve to Tier 3 (composable, independently upgradeable components). The governance model — PI-led, evidence-gated — should be baked into experiment mode from day one. Don't trust agent output; verify it against external tools.

### 3. Autonomous Research Loops

#### Karpathy's Autoresearch (March 2026)
- **What it does**: Autonomous optimization loop. Agent edits code → runs short training experiment → evaluates result → keeps or discards change → repeats. 66K GitHub stars in one month. Ran 700 experiments in 2 days, discovered 20 optimizations. Shopify CEO reported 19% performance gain overnight on internal data.
- **Architecture**: Dead simple. A coding agent (Claude Code, Codex, or equivalent) pointed at a minimal LLM training setup with a Markdown instruction file. No multi-agent complexity, no coordination server, no message boards. Just: propose → test → measure → decide → repeat.
- **Key insight**: "The goal is not to emulate a single PhD student, it's to emulate a research community of them." Also: "*any* metric you care about that is reasonably efficient to evaluate can be autoresearched by an agent swarm." The simplicity is the point — this works because the evaluation loop is tight (minutes, not hours).
- **Repo**: [github.com/karpathy/autoresearch](https://github.com/karpathy/autoresearch)
- **What scidekick learns**: The "tight loop" pattern should be a first-class experiment mode. Not every experiment needs multi-agent coordination. For optimization problems with fast evaluation, a simple propose → test → measure loop beats complex orchestration. scidekick should support both: simple loop mode and full multi-agent mode.

### 4. Literature & Knowledge Tools

#### PaperQA2 (FutureHouse, 2024)
- **What it does**: RAG system for scientific literature that achieves superhuman accuracy — better than PhD/postdoc biologists at retrieving and summarizing information. Produces Wikipedia-style summaries more accurate than actual Wikipedia articles (judged by blinded experts).
- **Architecture**: Multi-stage pipeline: document ingestion/parsing → semantic chunking/embedding → agentic search with LLM-driven query expansion → iterative evidence gathering → LLM-based answer synthesis with citations. Two key innovations: agentic workflows (LLM iteratively searches and restructures answers) and re-ranking with contextual summarization (RCS). Apache 2.0 licensed.
- **Key insight**: Agentic search (LLM decides what to search for, iteratively refines based on results) dramatically outperforms single-pass retrieval. This is the right approach for scientific literature — scientific questions require exploration, not just lookup.
- **Repo**: [github.com/Future-House/paper-qa](https://github.com/Future-House/paper-qa)
- **What scidekick learns**: PaperQA2 should be a core dependency, not an optional skill. Its accuracy on scientific literature retrieval is the best available. Integration with the wiki ingest pipeline (paper → PaperQA2 extract → wiki) is a high-priority Phase 2 task.

#### FutureHouse Platform
- **What it does**: Specialized AI agents for scientific tasks. Crow (literature Q&A), Falcon (deep literature synthesis), Owl (prior-work detection), Phoenix (experimental chemistry), Robin (end-to-end discovery). Platform is backed by Eric Schmidt, uses the Aviary framework for agent training.
- **Architecture**: Language Decision Process (LDP) — theoretical framework plus software implementation using stochastic computation graphs. Enables training of language agent components (LLM weights, prompts, memories, sampling parameters). Aviary provides domain-specific environments with tools relevant to each scientific domain.
- **Key insight**: Specialized agents + domain-specific training environments + open-source models → can beat frontier models on specific tasks. The agent architecture (LDP) is worth studying — it's a principled approach to making agents trainable rather than prompt-engineered.
- **What scidekick learns**: The agent specialization pattern (Crow/Falcon/Owl/Phoenix/Robin) is a template for scidekick's own agent roles in Phase 3. Not every agent needs to be general-purpose.

### 5. Knowledge Management & Wiki Systems

#### LLM Wiki (Karpathy's pattern, April 2026)
- **What it does**: Abstract design pattern for LLM-maintained wikis. Three layers: raw sources → wiki → schema. Three operations: ingest, query, lint. Covered in depth in the original analysis.
- **Implementations**:
  - **nashsu/llm_wiki** (9.9K stars): Full desktop app (Tauri + React). Two-step chain-of-thought ingest (analysis → generation), 4-signal knowledge graph with Louvain community detection, multimodal image ingestion from PDFs, vector semantic search via LanceDB, Chrome web clipper, Obsidian-compatible, deep research (LLM-optimized search → web search → auto-ingest). Built-in HTTP API + agent skill for Claude Code/Codex integration.
  - **sage-wiki** (528 stars): Go binary. Tiered compilation for 100K+ documents. Typed entity-relation graph with BFS traversal and cycle detection. Enhanced search (chunk-level FTS5 + vector indexing + LLM query expansion + LLM re-ranking + RRF fusion). MCP server for LLM agent integration. Output trust system (grounding verification, consensus, promotion/demotion). Agent memory layer with read-capture-evolve loop. Team deployment patterns (git-synced, shared server, hub federation).
  - **atomicstrata/llm-wiki-compiler**: Knowledge compiler — raw sources in, interlinked wiki out.
  - **Pratiyush/llm-wiki**: Session-based — captures knowledge from Claude Code/Codex/Copilot/Cursor/Gemini sessions.
- **Key insights from implementations**:
  - Two-step ingest (analyze then generate) produces significantly better quality than single-pass.
  - Knowledge graphs (with relevance scoring and community detection) surface non-obvious connections.
  - Tiered compilation (index everything, compile only what matters) is essential for scale.
  - Typed entity systems prevent LLM from creating duplicate concepts.
  - Output trust/verification is necessary — LLMs sometimes hallucinate connections.
  - MCP integration lets any LLM agent use the wiki as a tool.
- **What scidekick learns**: We should not build yet another wiki app. We should integrate with existing ones (nashsu/llm_wiki, sage-wiki) via MCP or filesystem compatibility. The wiki is infrastructure, not product. The key scidekick-specific addition is the scientific schema layer — templates for papers, hypotheses, experiments, evidence chains — that works on top of any compatible wiki backend.

#### ELF (Eli's Lab Framework)
- **What it does**: Scientific research wiki mixing PARA organization with wiki architecture. Uses "base-delta protocol" for incremental experiments — ensures total data traceability while minimizing documentation fatigue. Designed specifically for rigorous scientific workflows.
- **Key insight**: The base-delta protocol solves a real problem: scientists hate documentation. By making each experiment a delta against a base state rather than requiring full documentation each time, the overhead drops dramatically while traceability is preserved.
- **What scidekick learns**: The base-delta protocol should be part of our experiment result page template. Every experiment page references a base protocol, then describes only the changes.

### 6. Infrastructure & Standards

#### Agent Skills Standard (agentskills.io)
- 30+ agent adopters including Claude Code, Codex, Cursor, Gemini CLI, OpenCode, GitHub Copilot, VS Code, Goose, Roo Code, Letta, and OpenHands. Scidekick is listed as a compatible agent ("sk").
- `npx skills add <repo>` for installation. `gh skill install` for GitHub-native workflow. Version pinning. Provenance metadata for supply chain integrity.
- **What scidekick learns**: The ecosystem is large and growing. scidekick should be a consumer and contributor to this ecosystem, not a parallel one. Any skill we build should be published as an Agent Skills-compatible repo.

#### MCP (Model Context Protocol, Anthropic)
- Crossed 97 million installs in March 2026. Linux Foundation taking it under open governance. Every major AI provider ships MCP-compatible tooling.
- **What scidekick learns**: MCP is the right protocol for tool integration. Scientific databases, lab equipment, and wiki systems should all be accessible via MCP servers. This is already scidekick's architecture (Scidekick supports MCP) — lean into it.

#### Open Research Knowledge Graph (ORKG)
- Semantic scholarly knowledge infrastructure. Moves beyond document-centric search to structured, machine-actionable research contributions.
- **What scidekick learns**: Long-term, the wiki should export to structured knowledge graph formats. This enables integration with the broader scientific knowledge infrastructure.

### 7. Skill Lifecycle & Evolution (Microsoft Research, 2026)

#### SkillLens: Systematic Study of Model-Generated Skills
- **What it does**: Comprehensive empirical study of domain-level, model-generated agent skills across the full lifecycle: experience generation → skill extraction → skill consumption. Evaluates 6 targets × 5 extractors across 5 domains (embodied, productivity, coding, web search, tool calling). Published at arXiv (MSR + Fudan + SJTU).
- **Architecture**: Three-stage lifecycle. Stage 1 (Raw Experience): target agent executes tasks to form an experience pool. Stage 2 (Skill Extraction): extractor model distills the pool into a reusable domain-level skill. Stage 3 (Skill Consumption): skill is injected into the target agent's prompt and evaluated on held-out tasks.
- **Key findings**:
  - **75/25 rule**: Skills improve performance in 75% of extractor–target pairs, but 25% suffer *negative transfer* — the skill actively harms performance. Domain-dependent: embodied tasks (ALFWorld) show 47% negative transfer; coding (SWE-bench) shows near-universal improvement.
  - **Extraction ≠ execution**: The best task-executing model is rarely the best skill extractor. On SpreadsheetBench, lightweight Gemini-3.1-FL leads extraction efficacy; the strongest executor (GPT-5.4) ranks last. Choosing a skill extractor is a compatibility problem, not a strength contest.
  - **Utility is target-dependent**: The same skill helps one model and harms another. On ALFWorld, GPT-5.4 gains +4.93 from skills while Qwen-9B drops to −1.69 — consuming the same artifact.
  - **Experience pool composition matters**: The success–failure ratio in the experience pool has a domain-specific optimum. All-failure pools produce the worst skills. ALFWorld benefits from failure-heavy mixes; SpreadsheetBench peaks with success-heavy ones.
  - **Surface plausibility is deceptive**: LLM judges asked to compare two skills pick the better one only 46.4% of the time — *worse than chance* — and accuracy drops as the utility gap widens. Format changes (rewriting the same skill with different surface structure) produce statistically indistinguishable downstream results (p > 0.34).
  - **What actually works**: Three textual dimensions predict utility: **failure-mechanism encoding** (concrete failure modes with root-cause analysis), **actionable specificity** (executable remedies, not generic advice), and a **high-risk action blacklist** (explicitly forbidding known-bad behaviors). Each dimension alone raises pairwise-judge accuracy above 64%.
  - **Meta-skill intervention**: Compiling these dimensions into a compact meta-skill prepended to the extractor's prompt yields a +1.55pp average gain across all domains and extractors — a drop-in improvement requiring no pipeline changes.
- **Paper**: [arxiv.org/abs/2605.23899](https://arxiv.org/abs/2605.23899)
- **What scidekick learns**: Skills are not safe by default — 25% cause harm. Scidekick MUST validate skills against the target model and domain before deploying them in scientific workflows. The meta-skill rubric (failure mechanisms + actionable specificity + blacklist) is a template for scientific skill quality standards. Skill extraction should use a separate, possibly smaller model than the task executor — the best executor is rarely the best extractor.

#### SkillOpt: Self-Evolving Agent Skills
- **What it does**: Treats natural-language agent skills as trainable artifacts — not prompt-engineering them, but optimizing them through a structured rollout → reflect → edit → gate loop. Delivers consistent gains across 7 target models, 3 harnesses, and 6 benchmarks. Published at arXiv (MSR).
- **Architecture**: Four-phase loop with a frozen target model and a separate optimizer model:
  1. **Rollout**: Target model executes tasks with the current skill, recording scored trajectories (messages, tool calls, verifier feedback, final scores).
  2. **Reflect**: Optimizer analyzes success and failure minibatches separately — failures identify errors to fix, successes preserve working behavior.
  3. **Edit**: Optimizer proposes add/delete/replace operations on the skill text, merged and ranked under a **bounded edit budget** (textual learning rate). Prevents destructive rewrites.
  4. **Gate**: Candidate skill is accepted only if it improves held-out selection performance. Turns reflection into propose-and-test optimization rather than unconditional self-editing.
- **Key mechanisms**:
  - **Bounded edits as textual learning rate**: Without bounds, useful rules get overwritten by broad rewrites. With bounds, skill quality improves continuously.
  - **Rejected edit buffer**: Failed edits become negative feedback, helping the optimizer avoid repeating harmful directions.
  - **Slow update + optimizer meta-skill**: Longer-horizon feedback without bloating the deployment skill. The target model consumes only the final skill, not optimizer memory.
  - **Cross-model transfer**: Skills optimized for one model transfer to other models (+15.2 on LiveMathBench from GPT-5.4 → GPT-5.4-nano).
  - **Cross-harness transfer**: Skills optimized in Codex transfer to Claude Code (+31.8 on SpreadsheetBench).
  - **Self-optimization**: Even when the target model serves as its own optimizer, the loop discovers useful edits (+10.4 on SpreadsheetBench) — it's not merely distillation from a stronger model.
- **Paper**: [arxiv.org/abs/2605.23904](https://arxiv.org/abs/2605.23904)
- **What scidekick learns**: Skills should evolve, not remain static. The rollout → reflect → edit → gate loop is a concrete design for self-improving scientific skills. For Scidekick: scientific protocols, experiment templates, and analysis workflows can self-optimize as the agent accumulates experience in a domain. The bounded-edit mechanism is critical — without it, skill optimization can destroy useful procedures. The validation gate (held-out selection) prevents regressions. This is how Scidekick's experiment mode graduates from static templates to living, improving scientific knowledge.

---

## Revised Analysis: The Five Pillars

The landscape survey confirms and refines the original framework.
### 1. Domain Skills

**Status**: SOLVED at the skill level. The ecosystem is mature.

**Key change from original analysis**: The 140+ skills from Scientific Agent Skills are sufficient for launch. What we missed: the integration depth between skills matters more than the skills themselves. Robin's power comes from Crow → Falcon → Finch integration, not from any individual agent. Co-Scientist's power comes from the generate → debate → evolve pipeline, not from any individual model.

**Revised recommendation**: Bundle skill composition recipes, not just individual skills. `research-ingest` chains paper-lookup → PaperQA2 → database-lookup → wiki. `hypothesis-workflow` chains literature-review → scientific-brainstorming → hypothesis-generation → critical-thinking. These compositions are the product; individual skills are the ingredients.

**Skill quality dimension (new from SkillLens/SkillOpt)**:
- Skills are not safe by default. SkillLens shows 25% of skill–target pairs suffer negative transfer — the skill actively harms performance. This is unacceptable for scientific workflows where incorrect results propagate.
- Skill utility is target-dependent: the same skill helps one model and harms another. A skill validated on Claude might damage GPT's scientific reasoning.
- Surface plausibility is deceptive: LLM judges cannot distinguish good skills from bad ones (46.4% accuracy). You cannot eyeball skill quality.
- Skill extraction is a distinct capability from task execution. The best executor is rarely the best extractor — choosing extraction models requires empirical validation, not model-tier heuristics.
- **Meta-skill rubric**: SkillLens identifies three textual dimensions that predict utility: failure-mechanism encoding, actionable specificity, and high-risk action blacklists. This rubric is directly applicable as a quality standard for scientific skills.
- **Skill evolution matters**: SkillOpt shows that skills can self-improve through rollout → reflect → edit → gate loops. Static skills leave performance on the table. Scientific protocols should evolve with experience.

### 2. Persistent Wiki / Knowledge Base

**Status**: Pattern is validated by multiple implementations. Implementation options have expanded significantly.

**Key change from original analysis**: We should not build a wiki from scratch. The ecosystem now has:
- **nashsu/llm_wiki**: Best for desktop users who want a polished GUI + knowledge graph
- **sage-wiki**: Best for power users who want CLI + MCP + scale (100K+ docs)
- **llm-wiki-manager skill**: Best for agent-native workflows (the wiki is a tool, not an app)

**Revised recommendation**: Adopt a "wiki backend" abstraction. scidekick's wiki operations (ingest, query, lint) work against any compatible backend. Default: filesystem-based (markdown directory) for zero-dependency operation. Optional: MCP integration with nashsu/llm_wiki or sage-wiki for advanced features. The scientific schema layer (paper templates, hypothesis tracking, evidence chains) is scidekick's unique contribution — it sits on top of whatever backend the user chooses.

**Key additions from landscape**:
- Two-step ingest (analyze → generate) from nashsu/llm_wiki
- Typed entity system from sage-wiki (prevents duplicate concepts)
- Base-delta protocol from ELF (traceable experiments with minimal overhead)
- Output trust/verification from sage-wiki (LLM output needs verification)
- Community detection from nashsu/llm_wiki (surprising connections between research areas)

### 3. Multi-Agent Orchestration

**Status**: Multiple proven patterns exist. The design space is richer than originally assessed.

The landscape reveals a spectrum:

| System | Complexity | Coordination | Best For |
|---|---|---|---|
| Karpathy's Autoresearch | Minimal | Single agent, tight loop | Optimization with fast eval |
| Robin | Low | 3 specialized agents, linear workflow | Hypothesis → experiment → analysis |
| Co-Scientist | Medium | Tournament of ideas, debate | Hypothesis generation |
| AutoScientists | High | Self-organizing teams, queues | Long-running exploration |
| ClawdLab | High | PI-governed, evidence-gated | Rigorous multi-team research |

**Revised recommendation**: Support the full spectrum. Not every scientist needs multi-agent coordination. A grad student optimizing hyperparameters wants the tight loop. A PI running a lab wants PI-governed teams. Build the harness to support all levels, let the user choose.

**Architecture revision**: Three modes, one harness:
1. **Loop mode**: `scidekick loop <task>` — single agent, propose → test → measure → repeat. Inspired by Karpathy's autoresearch. Good for optimization, parameter search, ablation studies.
2. **Pipeline mode**: `scidekick pipeline <workflow>` — predefined multi-step workflow with specialized agents. Fixed roles, fixed handoffs. Good for established protocols (literature review, RNA-seq analysis, docking pipeline).
3. **Team mode**: `scidekick team <task>` — self-organizing agent teams with discussion, team formation, queues. The AutoScientists pattern. Good for open-ended exploration.

All three modes share the same infrastructure: RPC spawning, session persistence, coordination primitives, monitoring dashboard. The difference is the orchestrator logic, not the harness.

**Coordination primitive decision**: Use the filesystem for MVP (markdown files + atomic writes, like AutoScientists). This is simpler, more portable, and auditable (everything is a file in the experiment directory). Graduate to an MCP coordination server if/when filesystem concurrency becomes a bottleneck. Do NOT adopt ClawInstitute as a dependency — its functionality is straightforward to replicate in pure filesystem operations.

**Model-tier guard**: The harness MUST warn or prevent sub-Sonnet models from being used for scientific reasoning tasks. AutoScientists' empirical finding (Haiku hallucinates API unavailability) is serious. Add a model-tier configuration that maps task types to minimum model requirements.

### 4. Scientific Databases & Literature

**Status**: Mostly solved. Integration depth is the remaining gap.

**Key addition from landscape**: PaperQA2 should be a core dependency, not an optional skill. Its superhuman accuracy on scientific literature retrieval is the best available. The BGPT paper search (structured experimental data extraction) is complementary — PaperQA2 for retrieval, BGPT for structured extraction.

**Revised recommendation**:
- PaperQA2: core dependency for literature retrieval (Apache 2.0, can embed)
- BGPT: integration for structured data extraction from full-text
- database-lookup: stays as skill for 78+ database APIs
- Build `research-ingest` composite that chains all three + wiki ingest


### 5. Skill Lifecycle & Evolution

**Status**: NEW. Not addressed in the original four-pillar framework. SkillLens and SkillOpt (MSR, 2026) provide the empirical foundation and design patterns.

The landscape survey revealed a critical gap: skill quality and evolution were assumed, not designed. SkillLens proved that skills cause harm in 25% of cases and that surface plausibility is useless for quality assessment. SkillOpt proved that skills are optimizable artifacts — not static prompts, but trainable procedures that improve through structured feedback loops.

**Five design principles from the research**:

1. **Validate, don't trust**. Every skill must be validated against the target model and domain before deployment. Scidekick's skill installer should include a validation step: run the skill on a small held-out task set, measure performance delta, warn on negative transfer.

2. **Extract with the right model, not the strongest model**. Skill extraction (distilling experience into reusable skills) is a distinct capability from task execution. Scidekick should support a configurable extractor model separate from the execution model. A fast, cheap model (e.g., GPT-5.4-mini, Gemini Flash) may produce better skills than a frontier model. The default extractor should be empirically validated per domain, not assumed.

3. **Use the meta-skill rubric**. SkillLens's three quality dimensions — failure-mechanism encoding, actionable specificity, high-risk action blacklist — should be built into Scidekick's skill extraction prompt as a meta-skill. This is a +1.55pp average gain with zero pipeline changes.

4. **Skills should evolve**. SkillOpt's rollout → reflect → bounded-edit → gate loop is the design for self-improving skills. For Scidekick: when an agent runs an experiment protocol repeatedly, it should accumulate experience, reflect on what worked and failed, propose bounded edits to the protocol, and accept edits only when they improve held-out performance. The protocol becomes a living artifact.

5. **Bounded edits prevent destruction**. Without constraints, skill optimization can overwrite useful procedures. SkillOpt's bounded edit budget — a textual learning rate — prevents this. Scidekick should enforce edit budgets on skill evolution, especially for scientific protocols where correctness is critical.

**Architecture implications**:
- **Skill registry with validation metadata**: Each installed skill carries: which models it was validated on, measured performance delta, extraction model used, and the meta-skill rubric score. The CLI warns when you load a skill onto an untested model.
- **Skill extraction mode**: `scidekick extract <domain>` — runs target agent on tasks, collects experience pool, runs extractor model (configurable, not necessarily the main model), applies meta-skill rubric, and outputs a validated domain skill.
- **Skill evolution mode**: `scidekick evolve <skill>` — runs the rollout → reflect → edit → gate loop, producing iteratively improved versions of a skill. Git-backed so every version is recoverable.
- **Skill validation gate**: Before any skill is used in a scientific experiment, a lightweight validation step measures its effect on a held-out task set and blocks or warns on negative transfer.
---

## Revised Phased Roadmap
### Phase 1: Honest Scidekick Vertical Slice — IN PROGRESS
- [x] Architecture document with corrected implementation status
- [x] Direct Oh My Pi fork baseline
- [x] Localized app-name/config-dir override hook in `packages/utils/src/dirs.ts`
- [x] GitHub release workflow builds platform binaries
- [x] Standalone model-tier guard library with focused tests
- [x] Standalone SQLite skill registry library with focused tests
- [x] Standalone filesystem wiki backend with focused tests
- [x] Scientific wiki schema templates (paper/hypothesis/experiment/evidence/insight)
- [x] Default product identity: `sk` app name, `.sk` config dir, `sk-*` release artifact configuration
- [x] CLI help and user-facing examples updated from `omp` to `sk`
- [x] `sk install-skills` registered and working against local fixture repositories
- [x] Skill install registry updates verified end-to-end
- [x] `sk wiki new/list/show/lint` command wired to `FilesystemWikiBackend`
- [x] Scidekick scientific system-prompt content active by default
- [ ] Violet-teal-amber theme discoverable and selectable through the existing theme mechanism
- [x] Model-tier guard warns/blocks in scientific contexts
- [x] Focused Scidekick CLI tests pass without network access or user-home mutation

### Phase 2: Experiment Workflows
- [ ] Loop mode: `scidekick loop <task>` (tight optimization loop)
- [ ] Pipeline mode: `scidekick pipeline <workflow>` (fixed multi-step workflows)
- [ ] Coordination primitives: filesystem-based queues, rosters, message boards
- [ ] Experiment lifecycle: setup → execute → analyze → promote → cleanup
- [ ] Session persistence and resumption for long-running experiments
- [ ] `scidekick extract <domain>`: skill extraction with configurable extractor model + meta-skill rubric
- [ ] Monitoring dashboard (experiment status, agent activity, results)

### Phase 3: Multi-Agent Teams (Weeks 6–10)
- [ ] Team mode: `scidekick team <task>` (self-organizing agent teams)
- [ ] Discussion phase: agents propose hypotheses, critique each other
- [ ] Team formation: monitor agent reads discussion, forms teams
- [ ] Queue-based work distribution with health checks and stale claim release
- [ ] Champion promotion: best results → canonical paths
- [ ] Shared failure knowledge: agents learn from others' failures
- [ ] Debate/tournament pattern (inspired by Co-Scientist)
- [ ] `scidekick evolve <skill>`: rollout → reflect → bounded-edit → gate loop (SkillOpt pattern)
- [ ] Skill evolution with edit budget enforcement and rejected-edit buffer

### Phase 4: Lab & Reproducibility (Ongoing)
- [ ] Lab integration workflows (Benchling, Opentrons, OMERO)
- [ ] Reproducibility: environment capture, workflow versioning, result provenance
- [ ] Protocol management: agent reads/writes/executes experimental protocols
- [ ] Base-delta protocol for experiment documentation (inspired by ELF)
- [ ] Three-loop model: inner (code→run→measure), middle (results→analysis→next), outer (human review)
---

## What We Deliberately Avoid (Updated)

### Don't build a wiki app
nashsu/llm_wiki and sage-wiki exist and are good. Integrate with them, don't compete. scidekick's value is the scientific schema layer and agent-native wiki operations, not yet another markdown editor.

### Don't build a new agent framework
LangGraph, CrewAI, AutoGen, and OpenClaw exist. Scidekick's agent runtime is already production-quality. The innovation is scientific workflow orchestration on top of it, not a new agent framework.

### Don't rebundle scientific-agent-skills
Consume via install command + skill compositions. Contribute improvements upstream. The Agent Skills ecosystem is large and growing — fragmenting it helps no one.

### Don't depend on proprietary coordination infrastructure
ClawInstitute, while open-source, adds a dependency. Filesystem-based coordination (markdown + atomic writes) is simpler, more portable, and sufficient for MVP. Graduate to MCP server if needed.

### Don't let weak models do science
AutoScientists empirically proved Haiku-class models fail at scientific reasoning. Enforce model-tier minimums in scientific contexts. A science harness that silently produces garbage is worse than no harness at all.

### Don't trust skills without validation
SkillLens proved 25% of skill–target pairs cause negative transfer. Shipping skills without per-model validation is shipping bugs. Every skill in Scidekick's registry MUST carry validation metadata — which models it was tested on, what the performance delta was, and whether the meta-skill rubric was applied.

### Don't use the strongest model as the default skill extractor
Skill extraction is a distinct capability from task execution. The best executor is rarely the best extractor. Scidekick should not default to the user's main model for skill extraction — it should recommend or select an extractor model based on the domain, not the model tier.

### Don't let skills stagnate
SkillOpt showed that skills can self-improve through structured feedback loops. Static skills are a missed opportunity. Scidekick's experiment mode should capture experience and feed it back into skill evolution — bounded, gated, and version-controlled.

---

## Open Questions (Updated)

1. **Wiki backend**: Should the default be sage-wiki (Go binary, MCP-native, scales to 100K docs) or nashsu/llm_wiki (desktop app, knowledge graph, polished UX)? Or should we go filesystem-only and let users pick their own? Leaning toward: filesystem as default, MCP integration with both as opt-in.

2. **PaperQA2 integration**: Embed as library dependency, spawn as subprocess, or call via API? PaperQA2 is Python (Apache 2.0). Embedding adds a Python dependency to a TypeScript/Rust codebase. Subprocess via RPC is cleaner but adds latency. Leaning toward: MCP server wrapping PaperQA2, called as a tool.

3. **Coordination primitives for teams**: Filesystem-based (markdown files + atomic writes, validated by AutoScientists) vs. lightweight MCP coordination server. The filesystem approach has been proven at AutoScientists' scale (3 teams, ~10 agents, hour-long experiments). For larger scale (100+ agents, real-time coordination), MCP is better. Leaning toward: filesystem for MVP, MCP as upgrade path.

4. **Model-tier enforcement**: Should it be a hard block (refuse to run) or a soft warning? Hard block prevents footguns but limits flexibility (user might have a good reason). Soft warning with override is more practical. Leaning toward: warning by default, configurable to hard block.

5. **Scientific domains**: Biology and chemistry are well-covered by existing skills. What about physics, materials science, climate science, social science? Do we need domain-specific wiki schemas for each? Leaning toward: start with a general scientific schema, add domain-specific extensions as needed.

6. **Security model for autonomous experiments**: ClawdLab's insight — role restrictions + adversarial critique + external verification produce Sybil resistance as a structural property. Should scidekick's experiment mode enforce this from day one? What's the minimum viable governance? Leaning toward: PI agent as mandatory reviewer for any experiment that writes results. All results must be verified against external tools (re-run analysis, check statistics, validate against known benchmarks).

7. **Single-user vs. lab/team**: Is scidekick a personal research assistant or a lab-wide platform? robsk is team-scale (single GitHub bot, many repos). Lila is enterprise-scale ($550M funding). Where should scidekick aim? Leaning toward: personal-first (one scientist, one machine), team-capable (shared wiki, shared experiment queue), not enterprise (that's a different product).


8. **Skill validation benchmark**: How do we build a held-out validation set for scientific skills? SkillLens evaluated skills on domain benchmarks (ALFWorld, SWE-bench, SpreadsheetBench). For scientific domains, what's the validation task? Leaning toward: a small curated set of representative scientific tasks per domain, shipped with each skill pack. The cost of validation must be low — a few minutes, not hours.

9. **Extractor model selection**: SkillLens showed that extraction efficacy varies dramatically by model within the same domain. Should Scidekick ship with pre-computed extraction efficacy tables per domain? Or let users discover empirically? Leaning toward: ship with recommended extractor models per domain based on published SkillLens data (coding → GPT-5.4-mini, productivity → Gemini Flash, etc.), allow override.

10. **Skill evolution in single-user mode**: SkillOpt's loop requires scored trajectories and a held-out validation set. For a personal Scidekick user running 5–10 experiments, is there enough data for meaningful skill evolution? Or does evolution only become useful at team/lab scale? Leaning toward: evolution is opt-in per skill, requires a minimum experience pool size (e.g., 20 trajectories), and warns below that threshold.

11. **Edit budget for scientific protocols**: SkillOpt's bounded edits prevent destructive rewrites. For scientific protocols, the edit budget should be even tighter — a protocol that worked once is precious. Should protocol edits require human review (outer loop) before acceptance? Leaning toward: protocol edits are gated by human review by default; code-generation skills can auto-evolve. Different skill types get different evolution safety levels.