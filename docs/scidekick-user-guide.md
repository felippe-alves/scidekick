# Scidekick User Guide

Scidekick is a terminal-first AI coding and research assistant. It is the Scidekick build of Oh My Pi, which itself began as a fork of Mario Zechner's Pi. That lineage matters: Scidekick includes the mature coding-agent features from Pi and Oh My Pi, then adds a scientific research layer for AI/ML work.

This guide is written for users. It explains what Scidekick can do today, how to use it, and how to run a small research workflow with the Iris dataset using the current wiki, journal, tools, and Python execution features.

> Current status: the coding agent is production-ready. The research wiki, research journal, scientific skill installation, scientific prompts/themes, and model-tier warnings are wired into the CLI. Higher-level research commands such as `sk experiment`, `sk run`, `sk loop`, `sk pipeline`, and `sk team` are planned but not yet product features. Until those land, use the wiki, journal, normal files, Python execution, and the agent's existing tools to carry research workflows.

## 1. Mental model

Think of Scidekick as four layers:

1. **Pi foundation** — an interactive terminal agent with sessions, tools, file editing, shell execution, and a TypeScript SDK.
2. **Oh My Pi coding harness** — more providers, stronger tools, LSP, debugger control, subagents, browser automation, web search, memory, extensions, MCP, and native Rust acceleration.
3. **Scidekick identity** — `sk`/`scidekick`, `.sk` config/workspace directories, Scidekick theme, scientific prompt additions, and scientific command surfaces.
4. **Research layer** — project wiki, research journal, scientific skills, model-tier guard, and a roadmap toward experiments, runs, evaluations, traces, rollouts, and reproducible research objects.

Use Scidekick when you want the agent to operate in the same workspace you do: reading files, editing code, running commands, using a language server, debugging processes, searching the web, keeping notes, and leaving durable research artifacts behind.

## 2. Install and start

### Install

macOS and Linux:

```sh
curl -fsSL https://omp.sh/install | sh
```

With Bun:

```sh
bun install -g @oh-my-pi/pi-coding-agent
```

Windows PowerShell:

```powershell
irm https://omp.sh/install.ps1 | iex
```

Depending on how you installed the current Scidekick build, the binary may be exposed as `sk` or `scidekick`. The examples below use `sk`; if your install exposes `scidekick`, substitute that name.

Check the install:

```sh
sk --version
sk doctor
```

### Configure a model

Scidekick supports many providers. The simplest setup is to export one provider key:

```sh
export ANTHROPIC_API_KEY=...
# or
export OPENAI_API_KEY=...
# or
export GEMINI_API_KEY=...
```

Then start:

```sh
sk
```

You can also choose a model for a single session:

```sh
sk --model opus
sk --model gpt-5.2
sk --model openai/gpt-5.2
```

Scidekick uses role-based model routing:

- `default` — normal work
- `smol` — cheap/lightweight work, including some subagent fan-out
- `slow` — deeper reasoning
- `plan` — planning/architecture work
- `commit` — commit messages and changelog work

Override roles at launch:

```sh
sk --smol haiku --slow opus --plan gemini-pro
```

Or cycle configured models inside the TUI with `Ctrl+P`.

## 3. Main ways to use Scidekick

### Interactive mode

```sh
sk
```

Use this for normal work. The TUI renders tool calls, file reads, diffs, shell commands, browser actions, subagents, todos, and ask/approval cards.

Start with an initial prompt:

```sh
sk "Explain this repository and identify the main entry points"
```

Include files in the prompt with `@`:

```sh
sk @README.md @docs/scidekick-architecture.md "Summarize the current implementation status"
```

### One-shot mode

```sh
sk -p "List the packages and explain their purpose"
```

Use one-shot mode for automation, scripts, or quick questions. It processes the prompt and exits.

### Resume or continue a session

```sh
sk --continue "What did we decide last time?"
sk --resume
sk --resume <session-id-prefix>
```

Sessions are stored under the Scidekick agent directory, normally `~/.sk/agent`.

### Export a session

```sh
sk --export ~/.sk/agent/sessions/<path>/session.jsonl
```

This converts a saved session to shareable HTML.

### Editor integration through ACP

```sh
sk acp
```

ACP is the Agent Client Protocol used by editors such as Zed. In ACP mode, editor file writes, terminal output, and permission prompts route through the editor instead of only the terminal UI.

### RPC mode

```sh
sk --mode rpc --no-session
```

RPC mode exposes the agent over stdio using NDJSON frames. Use it when embedding Scidekick from a non-Node host or when you want process isolation.

## 4. Everyday coding features

### Read, search, and inspect code

Scidekick has first-class file tools. It does not need to shell out to `cat`, `grep`, or `find`.

Ask naturally:

```text
Find where model routing is configured and explain the fallback behavior.
```

Under the hood, the agent can use:

- `read` — reads files, directories, archives, SQLite databases, PDFs, notebooks, images, and URLs through one path-shaped interface.
- `find` — finds files by glob.
- `search` — searches file content with regex.
- `ast_grep` — syntax-aware structural search.
- `lsp` — definitions, references, diagnostics, code actions, renames, and type info.

The `read` tool summarizes large source files structurally: declarations stay visible and large bodies are elided until the agent asks for the specific range it needs. This keeps context focused.

### Edit safely

Scidekick has several editing paths:

- `edit` — hashline patches anchored to a content snapshot. Stale anchors are rejected before corrupting files.
- `write` — create or replace a file.
- `ast_edit` — structural rewrites through ast-grep, previewed before application.
- `lsp rename` / `lsp code_actions` — symbol-aware edits when a language server is available.

Good prompts:

```text
Rename the exported function parseModelId to parseConcreteModelId using LSP and update all callers.
```

```text
Replace console.log calls in src/ with logger.debug, but use ast_edit so string contents are preserved.
```

```text
Fix the failing test in packages/coding-agent/src/scidekick without changing public behavior.
```

### Use the shell without losing context

Scidekick can run commands and keep track of their outputs:

```text
Run the focused tests for the wiki command and fix any failures.
```

The bash tool supports persistent sessions, PTY mode when needed, background jobs, and aborts. Scidekick's native shell stack is backed by Rust and a vendored brush shell, so it works consistently across platforms.

### Use language servers

When a language server is available, Scidekick can use your IDE's knowledge:

```text
Find all references to FilesystemWikiBackend and explain which commands depend on it.
```

```text
Move this file and update imports with LSP rename_file.
```

This is safer than text search for exported symbol changes, renames, and code actions.

### Debug real programs

The `debug` tool drives Debug Adapter Protocol sessions. Scidekick can launch or attach debuggers, set breakpoints, step code, inspect variables, and pause hung programs.

Typical uses:

```text
Attach to the Python process that is hanging, pause it, and inspect the stack.
```

```text
Run this C binary under lldb and find where it segfaults.
```

Supported adapters depend on local binaries, commonly `lldb-dap`, `gdb`, `debugpy`, and `dlv`.

### Run Python and JavaScript cells

The `eval` tool provides persistent Python and JavaScript kernels. Use it for analysis, plots, quick parsers, data inspection, and experiments.

Inside cells, the agent can call helpers such as `read`, `write`, `tree`, `diff`, `llm`, and `agent`. State persists across cells in a session.

Good prompts:

```text
Use Python eval to load data/metrics.csv, summarize it with pandas, and write a plot to reports/metrics.png.
```

```text
Use JavaScript eval to parse package.json and list workspace packages by dependency count.
```

### Browse the web and web apps

Scidekick includes two distinct web capabilities:

- `web_search` — search the web, including technical and research sources, then cite sources.
- `browser` — drive a real Chromium tab or attach to an Electron/Chrome app through CDP.

Examples:

```text
Search for the current OpenTelemetry GenAI semantic conventions and summarize what trace spans Scidekick should export.
```

```text
Open the local dashboard in a browser, inspect the page, and verify the settings form works.
```

For static web content, the agent should normally use `read` on a URL or `web_search`. Use `browser` when JavaScript execution or interaction is required.

### Delegate with subagents

The `task` tool fans work out to subagents. Use it for independent investigation, code review, decomposable refactors, and parallel context gathering.

Good prompts:

```text
Have subagents inspect the eval, task, and mcp subsystems in parallel. Return a concise map of the entry points and risks.
```

```text
Split this migration by package and have each subagent update one package. I will run the final tests once they finish.
```

Subagents can coordinate through IRC, return structured outputs, and run in isolated worktrees when configured.

### Review changes

The `/review` workflow runs dedicated reviewer agents over branches, commits, or uncommitted changes. It reports issues by priority and confidence, so you can fix release blockers first.

Typical prompt:

```text
/review the uncommitted changes for correctness, security, and missing tests.
```

### Use memory

Scidekick has memory features inherited from Oh My Pi:

- `retain` — queue facts into a durable Hindsight bank.
- `recall` — retrieve raw memories.
- `reflect` — synthesize an answer over stored memories.

Memory backends are configured through `memory.backend`:

- `off` — no memory.
- `local` — local rollout summaries and artifacts.
- `hindsight` — Hindsight server-backed memory.

Use memory for stable project facts, recurring conventions, and decisions that should survive session compaction.

## 5. Research features available today

### Project wiki

Initialize a wiki in a project:

```sh
sk wiki init
```

Create pages:

```sh
sk wiki new paper "Terminal-Bench 2.0"
sk wiki new hypothesis "Linear models are enough for Iris"
sk wiki new experiment "Iris baseline classification"
sk wiki page baseline-eval
```

List, show, query, and lint pages:

```sh
sk wiki list
sk wiki show iris-baseline-classification
sk wiki query benchmark
sk wiki lint iris-baseline-classification
```

Ingest an existing Markdown file:

```sh
sk wiki ingest notes.md "Baseline notes"
```

The current wiki backend is filesystem-first: Markdown files with YAML frontmatter under `.sk/wiki/`. This makes it easy to commit, diff, edit by hand, and review.

### Research journal

Initialize the journal:

```sh
sk journal init
```

Add dated entries:

```sh
sk journal add "Started Iris baseline. Goal: compare a linear classifier and a tree model."
sk journal today
```

Link entries to research objects:

```sh
sk journal link 2026-05-31-140455 wiki:iris-baseline-classification
```

Use the journal for chronological memory: what you tried, why it mattered, what failed, what surprised you, and what you decided.

### Scientific skills

List or install skills from a repository:

```sh
sk install-skills --list --from felippe-alves/scientific-agent-skills
sk install-skills --from felippe-alves/scientific-agent-skills --skill literature-review
sk install-skills --project --from ./skills-repo
```

Skills are natural-language procedures the agent can load into context for a domain. Scidekick's long-term design follows SkillLens and SkillOpt: skills need validation metadata, model compatibility, and evolution through rollout → reflect → edit → gate loops. Today, install skills deliberately and treat unvalidated skills as advice, not proof.

### Model-tier guard

Scidekick warns in scientific contexts when a weak model tier is likely to be unsafe for scientific reasoning. This is based on the AutoScientists finding that Haiku-class models can fail catastrophically at analyst work. Use stronger models for tasks that require experimental design, statistical interpretation, literature synthesis, or claims about evidence.

### Research surface roadmap

Planned commands include:

```sh
sk experiment init
sk run record
sk eval record
sk dataset snapshot
sk model card
sk trace ingest
sk rollout record
sk taskset init
sk grader run
sk judge calibrate
```

Until those commands exist, the recommended pattern is:

1. Keep source code and notebooks in normal project files.
2. Use `eval`/`bash` to run analysis.
3. Write artifacts under a clear directory such as `reports/<experiment>/`.
4. Record decisions with `sk journal`.
5. Create durable pages with `sk wiki`.
6. Commit the project state when a result matters.

## 6. Extensibility

### Plugins and extensions

Extensions are TypeScript modules that can register tools, slash commands, and event handlers.

Install or link packages:

```sh
sk plugin install <package-or-repo>
sk install <package-or-repo>
```

Load a local extension for one session:

```sh
sk --extension ./my-extension.ts
```

Extensions can add LLM-callable tools, slash commands, event hooks, custom UI, and packaged capability directories.

### MCP servers

Scidekick supports Model Context Protocol servers. MCP lets external processes expose resources, prompts, and tools over JSON-RPC. Use MCP for scientific databases, lab systems, custom evaluators, private APIs, and other tools that should remain outside the core binary.

Typical use cases:

- expose a lab inventory or ELN API as tools;
- expose a paper search server;
- connect a local knowledge base;
- make a private benchmark runner available to the agent.

### Custom providers and local models

Custom providers go in `models.yml`. Scidekick supports OpenAI-compatible servers, Ollama, LM Studio, llama.cpp, vLLM, LiteLLM, and many hosted providers.

Examples of local-model setups:

```yaml
providers:
  local-ollama:
    api: openai-completions
    baseUrl: http://localhost:11434/v1
    auth: none
    discovery:
      type: ollama
```

Use local models for low-risk summarization, title generation, or cheap background work. Use stronger models for scientific reasoning and high-impact edits.

## 7. Tutorial: simple ML research on the Iris dataset

This tutorial uses Scidekick as a lightweight research harness for a classic question:

> Can a simple model classify Iris species well enough, and what does the result tell us about the dataset?

You will use the current Scidekick features:

- wiki pages for research objects;
- journal entries for chronological decisions;
- Python execution for analysis;
- file writing for artifacts;
- agent review for interpretation;
- optional web/literature lookup;
- a final wiki summary.

The tutorial does not require future `sk experiment` or `sk run` commands.

### Step 0 — Create or enter a project

```sh
mkdir iris-scidekick-demo
cd iris-scidekick-demo
sk
```

Inside the session, tell Scidekick:

```text
We are doing a small ML research workflow on the Iris dataset. Keep a concise research trail in .sk/wiki and .sk/journal. Use Python eval for analysis and write reusable artifacts under reports/iris-baseline/.
```

### Step 1 — Initialize research memory

In a shell, or by asking Scidekick to do it:

```sh
sk wiki init
sk journal init
sk wiki new hypothesis "Iris linear separability baseline"
sk wiki new experiment "Iris baseline classification"
sk journal add "Started Iris baseline classification. Goal: compare simple classifiers and record whether a linear model is sufficient."
```

The hypothesis page should capture the idea:

```text
Hypothesis: Because Iris setosa is linearly separable and versicolor/virginica are close but structured, a simple standardized logistic regression should reach high cross-validation accuracy. A tree-based model may improve slightly but should not be necessary for a strong baseline.
```

Ask Scidekick:

```text
Open the Iris hypothesis and experiment wiki pages, fill them with the hypothesis, planned metrics, expected artifacts, and links to today's journal entry.
```

### Step 2 — Ask Scidekick to plan the analysis

Prompt:

```text
Plan a small but rigorous Iris dataset analysis. Keep it simple: load sklearn's Iris dataset, inspect class balance and feature distributions, compare LogisticRegression and RandomForestClassifier with stratified 5-fold cross-validation, hold out a test split, compute accuracy and macro-F1, write a confusion matrix plot, and summarize limitations. Do not overclaim.
```

A good plan should include:

- dataset source (`sklearn.datasets.load_iris`);
- target labels and feature names;
- class balance check;
- stratified train/test split;
- baseline model;
- comparison model;
- cross-validation;
- held-out metrics;
- plots and JSON/Markdown artifacts;
- limitations: tiny clean dataset, no deployment claim, no leakage beyond bundled toy data.

### Step 3 — Run the analysis in Python eval

Ask Scidekick:

```text
Use Python eval to run the Iris analysis. Save artifacts under reports/iris-baseline/: metrics.json, summary.md, confusion-matrix.png, and feature-pairplot.png if seaborn is available. Use deterministic seeds. Show the key metrics in the conversation.
```

A representative Python analysis looks like this:

```python
from pathlib import Path
import json

import numpy as np
import pandas as pd
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

out = Path("reports/iris-baseline")
out.mkdir(parents=True, exist_ok=True)

iris = load_iris(as_frame=True)
X = iris.data
y = iris.target
labels = list(iris.target_names)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

models = {
    "logistic_regression": make_pipeline(
        StandardScaler(),
        LogisticRegression(max_iter=1000, random_state=42),
    ),
    "random_forest": RandomForestClassifier(
        n_estimators=200,
        random_state=42,
    ),
}

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
results = {}

for name, model in models.items():
    cv_scores = cross_validate(
        model,
        X_train,
        y_train,
        cv=cv,
        scoring=["accuracy", "f1_macro"],
    )
    model.fit(X_train, y_train)
    pred = model.predict(X_test)
    results[name] = {
        "cv_accuracy_mean": float(cv_scores["test_accuracy"].mean()),
        "cv_accuracy_std": float(cv_scores["test_accuracy"].std()),
        "cv_f1_macro_mean": float(cv_scores["test_f1_macro"].mean()),
        "cv_f1_macro_std": float(cv_scores["test_f1_macro"].std()),
        "test_accuracy": float(accuracy_score(y_test, pred)),
        "test_f1_macro": float(f1_score(y_test, pred, average="macro")),
        "confusion_matrix": confusion_matrix(y_test, pred).tolist(),
        "classification_report": classification_report(
            y_test,
            pred,
            target_names=labels,
            output_dict=True,
        ),
    }

metrics = {
    "dataset": {
        "name": "sklearn Iris",
        "n_rows": int(len(X)),
        "n_features": int(X.shape[1]),
        "target_names": labels,
        "class_counts": pd.Series(y).value_counts().sort_index().to_dict(),
    },
    "models": results,
}

(out / "metrics.json").write_text(json.dumps(metrics, indent=2))
```

Scidekick can write and run the script for you instead of keeping it only in a cell:

```text
Turn the Python analysis into experiments/iris_baseline.py, run it, and compare the script output to the eval-cell result.
```

### Step 4 — Generate plots

Ask:

```text
Create a confusion matrix plot for the better model and a feature scatter/pair plot. Save them under reports/iris-baseline/ and mention any package that is unavailable instead of faking a plot.
```

If a plotting dependency is missing, Scidekick should either install it with your approval or fall back to a simpler matplotlib plot.

### Step 5 — Interpret the result carefully

Prompt:

```text
Read reports/iris-baseline/metrics.json and summary.md. Interpret whether the hypothesis was supported. Be precise about the limits of the evidence: small dataset, simple train/test split, cross-validation variance, no external validation. Update the experiment wiki page with the result, artifacts, and limitations.
```

A good conclusion might be:

```text
The hypothesis is supported for this toy dataset: standardized logistic regression reaches high cross-validation and held-out accuracy, so a linear baseline is sufficient for a strong result. Random forest may match or slightly exceed it, but the difference is not meaningful without repeated evaluation. This does not support claims about real-world botanical classification because the dataset is tiny, curated, and bundled.
```

### Step 6 — Record the decision

```sh
sk journal add "Iris baseline complete. Logistic regression was sufficient for high accuracy; random forest did not justify added complexity. See wiki:iris-baseline-classification and reports/iris-baseline/."
sk wiki query iris
```

Ask Scidekick:

```text
Update the Iris experiment wiki page with: hypothesis, dataset, methods, metrics, artifacts, conclusion, limitations, and next questions. Then show me the page.
```

### Step 7 — Optional: use web/literature search

For a toy dataset, this is optional. If you want context:

```text
Search the web for the original Iris dataset citation and add a short source note to the wiki. Cite the source URL.
```

This uses `web_search` or URL `read`, then folds the citation into the wiki.

### Step 8 — Commit the research state

When the analysis is reproducible and the wiki/journal are updated:

```sh
git add .sk/wiki .sk/journal reports/iris-baseline experiments/iris_baseline.py
git commit -m "docs: record iris baseline research workflow"
```

You can ask Scidekick to do this:

```text
Review the Iris artifacts for reproducibility, then commit only the wiki, journal, reports, and experiment script with a concise message.
```

## 8. Suggested prompt patterns

### Repository understanding

```text
Explain this repository. Start with the package map, then identify the main runtime entry points and the first files a new contributor should read.
```

### Safe refactor

```text
Refactor this exported API. First run LSP references, then update callsites, then run the focused tests that cover the changed package.
```

### Research ingest

```text
Read docs/scidekick-science-surface.md and create wiki pages for the papers, benchmarks, tools, and standards it references. Use concise summaries and link each page to Scidekick's design decision.
```

### Experiment analysis

```text
Use Python eval to analyze this CSV, write metrics and plots to reports/<name>/, update the wiki experiment page, and add a journal entry with the decision.
```

### Review before publishing

```text
Review the uncommitted changes as release-blocking. Prioritize correctness, missing tests, data loss, and user-facing documentation drift.
```

## 9. What Scidekick deliberately does not do yet

Scidekick is not yet a full MLflow replacement, LangSmith replacement, DVC replacement, or lab notebook app. It should link to those systems and keep the scientific index.

The current science surface does not yet provide first-class commands for:

- experiment/run object stores;
- sweep launch and comparison;
- model and dataset card generation;
- trace import/export;
- rollout storage;
- taskset validation;
- judge calibration;
- automatic skill evolution.

Those features are in the architecture and science-surface plans. The current way to get the same practical value is to combine normal project files, `eval`, `bash`, the wiki, the journal, and commits.

## 10. Where to go next

- `docs/scidekick-architecture.md` — current architecture and roadmap.
- `docs/scidekick-science-surface.md` — long-term research object model.
- `docs/scidekick-implementation-plan.md` — implementation order.
- `docs/tools/` — individual tool references.
- `docs/models.md` — provider and model configuration.
- `docs/mcp-config.md` — MCP setup.
- `docs/skills/` — extension and skill authoring.
- `.sk/wiki/index.md` — local project wiki, including papers and systems that informed Scidekick.
