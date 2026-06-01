---
title: "SolidGoldMagikarp (glitch tokens)"
type: paper
status: read
authors: "Rumbelow & Watkins"
journal: ""
year: "2023"
doi: ""
url: ""
tags: [paper, glitch-tokens, llm, vocabulary, safety]
---

# SolidGoldMagikarp

Analysis of anomalous tokens in GPT models' vocabulary that cause unpredictable behavior.

## Key contributions

- Identified that rare/near-init tokens in the BPE vocabulary cause prior-collapse behavior
- Named after `SolidGoldMagikarp` token — a GPT-2 token from GitHub corpus residue with near-init embeddings
- Mechanism: when a glitch token is sampled, its near-noise embedding fails to steer the residual → conditional prior over continuations collapses

## Relevance to Scidekick

Referenced in the GPT-5 Harmony-Header Leakage errata document (docs/ERRATA-GPT5-HARMONY.md). The glitch-token mechanism was extended to explain control-token-masked leakage in gpt-5 models: when the logit mask suppresses control tokens, mass redistributes onto the plain-text shadow of the protocol, creating structurally invisible exfiltration channels in tool arguments.
