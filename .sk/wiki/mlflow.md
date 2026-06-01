---
title: "MLflow"
type: note
created: 2026-05-31T23:59:00.000Z
updated: 2026-05-31T23:59:00.000Z
tags: [infrastructure, mlops, experiment-tracking, model-registry]
---

# MLflow

Open-source platform for the ML lifecycle: tracking, projects, models, registry.

- **Docs**: https://mlflow.org/docs/latest/ml/tracking/
- **Key features**: Experiment tracking, run logging, model registry, metric comparison, artifact storage
- **MLflow 3**: Links metrics to model checkpoints and datasets

## Relevance to Scidekick

Referenced in the science surface as a system Scidekick should integrate with, not duplicate. MLflow Tracking is organized around runs, models, and experiments, and logs parameters, code versions, metrics, and output files. Scidekick should link to MLflow runs rather than reinvent run tracking.
