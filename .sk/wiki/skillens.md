---
title: "SkillLens"
type: paper
status: read
authors: ""
journal: ""
year: "2026"
doi: ""
url: ""
tags: [paper, skill-validation, agent-safety, model-tier, msr]
---

# SkillLens

Per-model validation metadata framework for agent skills from Microsoft Research.

## Key contributions

- Tracks per-model validation metadata for agent skills
- Warns when unvalidated skills load against untested models
- Provides a gating mechanism for safe skill deployment

## Relevance to Scidekick

Referenced in the Scidekick system context as the basis for the skill validation gate. Scidekick's model-tier guard tracks which skills have been validated against which models and warns/blocks when unvalidated skills load against untested models.
