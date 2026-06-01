---
title: "Pi (original coding agent)"
type: note
created: 2026-05-31T23:59:00.000Z
updated: 2026-05-31T23:59:00.000Z
tags: [repo, coding-agent, upstream, typescript]
---

# Pi (original coding agent)

The original Pi coding agent by Mario Zechner (@mariozechner), from which Scidekick/omp was forked.

- **Repo**: https://github.com/badlogic/pi-mono
- **Author**: Mario Zechner
- **Language**: TypeScript, Rust

## Relevance

Scidekick's `packages/coding-agent` was originally built on Pi. The core architecture — session management, tool infrastructure, prompt system — descends from Pi's design. Scidekick adds 40+ providers, hashline editing, TTSR, DAP debugging, subagents, LSP integration, and the science surface.
