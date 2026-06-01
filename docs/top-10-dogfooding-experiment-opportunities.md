# Top 10 Dogfooding Experiment Opportunities

These experiments use Scidekick as its own engineering and research instrument. Each opportunity is designed to produce measurable evidence about Scidekick's reliability, usability, cost, safety, or scientific workflow quality.

## 1. Edit-tool reliability audit

**Question:** When edits fail, why?

**Use existing surface:** `scripts/session-stats/analyze.py edits`, `ss_edit_calls`, `ss_edit_sections`.

**Measure:**

- edit success rate by model;
- malformed patch rate;
- stale hash rate;
- repeated-anchor / duplicate-anchor rate;
- failures by file type;
- retries required per successful change.

**Output:** `reports/edit-reliability/` with failure taxonomy and recommended time-traveling stream rules or renderer changes.

**Why high value:** Editing correctness is core to user trust.

## 2. Tool-call latency and cost-per-success

**Question:** Which tools/models are slow, expensive, or error-prone?

**Use existing surface:** `packages/stats`, `~/.omp/stats.db`, `ss_tool_calls`, `ss_tool_results`.

**Measure:**

- latency by tool;
- tokens per tool call;
- error rate by tool/model;
- cost by model/tool/session folder;
- tool-call count per completed task.

**Output:** dashboard additions or `reports/tool-economics/`.

**Why high value:** Shows where Scidekick feels slow or expensive.

## 3. Read-tool selector efficiency

**Question:** Does structural summarization reduce wasted context without hurting correctness?

**Use existing surface:** `scripts/session-stats/analyze_selector_reads.py`, `read_optimizer.py`, `optimize_read_config.py`.

**Measure:**

- full-file reads vs ranged reads;
- repeated reads of the same file;
- bytes/tokens saved by selectors;
- cases where summarization forced extra reads;
- downstream edit success after summarized reads.

**Output:** recommended read summarizer thresholds and selector policy.

**Why high value:** Read behavior controls context pressure and model cost.

## 4. Search relevance benchmark

**Question:** Do `search`, `find`, `ast_grep`, and LSP get the agent to the right code quickly?

**Use existing surface:** `search`, `find`, `ast_grep`, `lsp`, `scripts/session-stats/analyze_search_relevance.py`.

**Measure:**

- first relevant result rank;
- irrelevant-result rate;
- search-to-edit distance;
- number of searches before first correct file;
- AST/LSP vs regex success cases.

**Experiment design:** Create a small internal taskset from real repo questions:

- Where is wiki backend path resolution?
- Where does docs index generation happen?
- Where are browser workers spawned?
- Where are model-tier warnings applied?

**Output:** `reports/search-relevance/` plus recommended tool-routing rules.

**Why high value:** Better retrieval means fewer wrong edits.

## 5. Docs-vs-implementation drift audit

**Question:** Which documented Scidekick features are implemented, partial, or aspirational?

**Use existing surface:** `docs/`, `.sk/wiki`, CLI `--help`, command files in `packages/coding-agent/src/commands`.

**Measure:**

- documented command exists? yes/no;
- command help matches docs? yes/no;
- tests exist for command? yes/no;
- site/README/wiki agreement;
- aspirational claims clearly labeled?

**Output:** `.sk/wiki/docs-implementation-drift.md` or `reports/docs-drift/`.

**Why high value:** Prevents the website and docs from overpromising.

## 6. Wiki/journal research-loop usability test

**Question:** Can a user complete a small research loop using only current Scidekick features?

**Use existing surface:** `sk wiki`, `sk journal`, `eval`, `write`, `bash`.

**Task:** Run the Iris tutorial from `docs/scidekick-user-guide.md`.

**Measure:**

- number of commands/prompts required;
- missing affordances;
- broken links or awkward slugs;
- whether artifacts are easy to commit;
- whether the final claim is traceable to metrics/artifacts.

**Output:** `reports/iris-dogfood/` plus a wiki page with friction points.

**Why high value:** Tests the actual science surface users see today.

## 7. Subagent coordination benchmark

**Question:** Do subagents improve throughput without increasing inconsistency?

**Use existing surface:** `task`, IRC coordination, reviewer agents.

**Experiment design:** Run paired tasks:

- single-agent repo architecture audit;
- subagent fan-out architecture audit.

**Measure:**

- wall-clock time;
- files inspected;
- duplicate work;
- contradictions in outputs;
- missed subsystem count;
- final reviewer score.

**Output:** guidance for when to delegate vs stay single-agent.

**Why high value:** Subagents are a differentiator, but uncontrolled fan-out can waste effort.

## 8. Model-tier guard calibration

**Question:** Are model-tier warnings useful, too strict, or too weak for scientific workflows?

**Use existing surface:** `model-tier.ts`, `command-tier-warning.ts`, skills, wiki/journal commands.

**Measure:**

- which commands trigger warnings;
- user override frequency;
- task outcome by model tier;
- failure types by tier;
- false positives where small models are fine;
- false negatives where weak models produce bad analysis.

**Experiment design:** Run the same small scientific tasks across `smol`, `default`, and `slow`.

**Output:** recommended warning thresholds and allowlist/denylist by command/task.

**Why high value:** Scientific credibility depends on not using weak models for high-impact reasoning.

## 9. Browser-tool reliability and safety audit

**Question:** How reliably and safely can Scidekick interact with web apps?

**Use existing surface:** `browser`, `web_search`, browser workers, Puppeteer stealth patches.

**Measure:**

- navigation success rate;
- element-observation usefulness;
- screenshot fallback frequency;
- JS-heavy page failure modes;
- external network use;
- dialog/permission behavior;
- accidental destructive action risk.

**Experiment design:** Fixed local test pages plus a few public docs pages.

**Output:** browser failure taxonomy and safety recommendations.

**Why high value:** Browser automation is powerful but risky and brittle.

## 10. Release/install smoke-path reproducibility

**Question:** Can a new user install Scidekick and reach the documented first success path?

**Use existing surface:** install scripts, `doctor`, `--smoke-test`, `site/`, README, CI workflows.

**Measure:**

- macOS/Linux/Windows install success;
- binary vs source install differences;
- `sk doctor` clarity;
- `sk wiki init` success after install;
- `sk --help` accuracy;
- docs site links from install flow.

**Output:** install friction report plus missing smoke cases.

**Why high value:** Adoption fails if installation or first-run docs fail.

## Suggested priority order

1. Edit-tool reliability
2. Docs-vs-implementation drift
3. Wiki/journal Iris usability test
4. Tool-call latency and cost-per-success
5. Read selector efficiency
6. Search relevance benchmark
7. Release/install reproducibility
8. Subagent coordination
9. Model-tier guard calibration
10. Browser reliability/safety
