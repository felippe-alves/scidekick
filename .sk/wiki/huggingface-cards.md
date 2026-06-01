---
title: "Hugging Face Model & Dataset Cards"
type: note
created: 2026-05-31T23:59:00.000Z
updated: 2026-05-31T23:59:00.000Z
tags: [infrastructure, model-cards, dataset-cards, documentation, hugging-face]
---

# Hugging Face Model & Dataset Cards

Standardized documentation formats for ML models and datasets.

- **Model Cards**: https://huggingface.co/docs/hub/model-cards — intended uses, limitations, training parameters, datasets, evaluation results
- **Dataset Cards**: https://huggingface.co/docs/hub/datasets-cards — dataset metadata, responsible-use context, license, task categories, discoverability metadata

## Relevance to Scidekick

Referenced in the science surface. Scidekick's `sk card model` and `sk card dataset` commands should generate Hugging Face-compatible cards. Wiki lint checks for missing model cards, missing dataset cards, and missing agent cards.
