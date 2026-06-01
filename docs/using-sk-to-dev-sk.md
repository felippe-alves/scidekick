# Using Scidekick to Develop Scidekick

Scidekick can help this project most by being used as its own engineering and research instrument. The goal is not just to add more features, but to keep the product vision grounded in behavior that is implemented, tested, documented, and observable.

## 1. Turn the product vision into verified slices

Scidekick has a large science-surface vision. Use Scidekick to convert that vision into small, shippable, testable increments.

High-leverage work:

- audit what is implemented vs documented;
- identify overstated docs or missing runtime wiring;
- produce implementation plans with exact files, commands, tests, and acceptance criteria;
- build vertical slices such as:
  - `sk experiment init`;
  - `sk run record`;
  - `sk eval record`;
  - `sk card model`;
  - `sk trace export --otel`;
  - wiki/journal cross-linking;
  - RO-Crate export.

The important discipline is that every slice must keep code, CLI behavior, docs, tests, and examples aligned.

## 2. Use Scidekick's research workflow on Scidekick itself

This repository is a strong dogfooding target. Scidekick can use its own wiki, journal, Python/JavaScript eval cells, web search, subagents, and artifact tracking to run structured research on the agent.

Useful investigations:

- benchmark tool-call reliability;
- analyze session traces;
- compare model/provider behavior;
- investigate time-traveling stream rule effectiveness;
- mine `~/.omp/stats.db` or `~/.sk/stats.db` for failure modes;
- generate wiki pages from incidents and experiments;
- produce reproducible reports under `reports/`;
- turn findings into implementation tickets.

Example prompts:

```text
Measure how often edit failures come from stale hashes vs malformed patches.
```

```text
Analyze tool-call latency by provider, model, and tool, then write a report.
```

```text
Mine failed sessions for the top recurring failure classes and propose time-traveling stream rules.
```

This makes Scidekick both the instrument and the subject of the research workflow.

## 3. Improve user trust and adoption

Scidekick can systematically improve the surfaces that make users trust the tool:

- user documentation;
- tutorials;
- CLI help consistency;
- install path verification;
- smoke tests;
- website accuracy;
- changelog discipline;
- honest current-status notes;
- onboarding flows;
- examples that actually run.

Good documentation and tutorial targets:

- First 10 minutes with Scidekick;
- using Scidekick on an existing TypeScript repo;
- using wiki + journal for reproducible ML experiments;
- model configuration cookbook;
- MCP server setup;
- writing a custom tool or extension;
- debugging with Scidekick;
- subagents for large refactors.

Scidekick should also check documentation against code so the site never drifts into aspirational marketing.

## 4. Harden architecture and security boundaries

Scidekick can act as a staff-level reviewer across unfamiliar subsystems.

High-value review work:

- trace feature claims to code;
- check exported symbols and callers through LSP;
- find risky abstractions;
- remove dead code;
- identify race conditions and state leaks;
- verify install and release paths;
- check generated files and binary compile constraints;
- review security boundaries around MCP, browser, bash, eval, secrets, and memory.

High-value audits:

- MCP trust boundary and prompt-injection resistance;
- browser tool sandbox and stealth assumptions;
- wiki/journal path safety and link handling;
- model/provider fallback correctness;
- extension loading security;
- stats database privacy and sanitization;
- binary release smoke coverage;
- generated docs/site drift.

## 5. Best immediate uses

Good next prompts:

```text
Audit the Scidekick docs against implementation and produce a prioritized gap report. Do not edit.
```

```text
Design the first real `sk experiment` vertical slice with exact CLI contract, storage format, tests, and migration path. Do not implement.
```

```text
Use the wiki to create a roadmap page that turns the science surface into six verified milestones. Do not implement.
```

```text
Review the docs site deployment for correctness, security, and GitHub Pages assumptions. Do not edit.
```

```text
Analyze this repo for dogfooding opportunities where Scidekick can measure itself. Return the top 10 experiments.
```

The strongest contribution is not merely adding features. It is keeping Scidekick's ambitious research-agent surface grounded in runnable, tested, user-visible behavior.
