---
title: "OpenTelemetry"
type: note
created: 2026-05-31T23:59:00.000Z
updated: 2026-05-31T23:59:00.000Z
tags: [infrastructure, observability, tracing, telemetry, standards]
---

# OpenTelemetry

Open observability framework for traces, metrics, and logs.

- **AI Agent Observability**: https://opentelemetry.io/blog/2025/ai-agent-observability/
- **GenAI work**: Standardizing telemetry for model calls, vector databases, agent applications, and agent frameworks

## Relevance to Scidekick

Referenced extensively in the science surface. Scidekick should use OpenTelemetry-shaped traces as the neutral interchange format for spans (model invocation, tool call, MCP request, retrieval call, memory read/write, sandbox command, browser action, grader, judge, human approval, inter-agent handoff) rather than inventing a private trace schema. `sk trace export --otel` and `sk trace import --otel` are planned.
