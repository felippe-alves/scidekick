---
title: "RO-Crate"
type: note
created: 2026-05-31T23:59:00.000Z
updated: 2026-05-31T23:59:00.000Z
tags: [infrastructure, provenance, standards, reproducibility, json-ld]
---

# RO-Crate

A community standard for packaging research data with structured metadata.

- **Site**: https://www.researchobject.org/ro-crate/
- **Key features**: JSON-LD based, aligned with W3C PROV, implemented by multiple workflow systems, interoperable

## Variants

- **Process Run RO-Crate**: For individual training runs, eval jobs, and agent rollouts
- **Workflow Run Crate**: For multi-step pipelines, multi-agent evaluations, and reproduction studies

## Relevance to Scidekick

Scidekick should use RO-Crate for portable provenance while using OpenTelemetry for operational traces. Starting with Process Run RO-Crate, later supporting Workflow Run Crates.
