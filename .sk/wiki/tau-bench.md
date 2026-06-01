---
title: "τ-bench"
type: paper
status: read
authors: ""
journal: ""
year: "2024"
doi: ""
url: "https://arxiv.org/abs/2406.12045"
tags: [paper, benchmark, agentic-ai, tool-use, database]
---

# τ-bench

A benchmark for tool-agent-user interaction.

## Key contributions

- Evaluates tool-agent-user interaction by comparing **final database state** with an annotated goal state
- Reports **pass@k** because consistency across trials matters for agent reliability
- State-based evaluation rather than command-text matching

## Relevance to Scidekick

Referenced in the science surface as a preferred evaluation pattern. The pass@k reporting and final-state comparison are recommended as better patterns than one-shot answer matching for agentic benchmarks.
