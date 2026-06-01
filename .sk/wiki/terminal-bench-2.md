---
title: "Terminal-Bench 2.0"
type: paper
status: read
authors: ""
journal: ""
year: "2025"
doi: ""
url: "https://arxiv.org/html/2601.11868v1"
tags: [paper, benchmark, agentic-ai, terminal, long-horizon]
---

# Terminal-Bench 2.0

Long-horizon terminal tasks for agent evaluation.

## Key contributions

- Tasks include instruction, containerized environment, tests, reference solution, and time limit
- Tests verify **final state** rather than command text — outcome-driven evaluation
- Highlights that task outcomes depend on the model, scaffold, container, tool interface, tests, and anti-cheat design, not only on the underlying LLM

## Relevance to Scidekick

Referenced in the science surface as an exemplary pattern for agent benchmark design. The outcome-driven (state-based) evaluation approach is recommended over one-shot answer matching for agentic benchmarks.
