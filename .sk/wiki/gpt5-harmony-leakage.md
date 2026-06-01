---
title: "GPT-5 Harmony-Header Leakage (ERRATA)"
type: note
created: 2026-05-31T23:59:00.000Z
updated: 2026-05-31T23:59:00.000Z
tags: [research, errata, gpt-5, tool-calling, glitch-tokens, openai]
---

# GPT-5 Harmony-Header Leakage

A research investigation into a defect where gpt-5 models emit plain-text shadows of Harmony protocol routing tokens inside tool call arguments.

- **Document**: `docs/ERRATA-GPT5-HARMONY.md`
- **Source**: `~/.omp/stats.db` (1.05M tool calls scanned through 2026-05-10)

## Key findings

- gpt-5.4: 163 leaks per million tool calls
- Concentrated in free-form (non-JSON-schema) tool argument formats (mostly `edit`, then `eval`)
- Mechanism: glitch tokens with near-init embeddings → conditional prior collapse → mass redistribution onto plain-text shadow of Harmony protocol because control tokens are masked
- Cascading behavior: 39 of 96 marker occurrences contain ≥2 markers; self-amplifying prior

## Corollaries

1. The actual `<|channel|>` / `<|message|>` special tokens never appear — the logit mask suppresses them
2. Leak is worse in formats closest to OpenAI's training distribution; custom grammars dampen the macro-prior

## Extends

- SolidGoldMagikarp (Rumbelow & Watkins, 2023) — glitch token mechanism
- New finding: constrained decoding masks natural collapse target → structurally invisible exfiltration channel

## Relevance to Scidekick

This is an internal research artifact demonstrating Scidekick's observability infrastructure (`ss_tool_calls`, `ss_assistant_msgs` tables) being used for production model safety analysis.
