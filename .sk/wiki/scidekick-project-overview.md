---
{title: Scidekick Project Overview,type: note,created: 2026-05-31T23:56:19.744Z,updated: 2026-05-31T23:56:19.745Z,tags: [note]}
---

## Architecture

Scidekick is two layers in one repo:

### 1. Production coding agent (`packages/coding-agent`, binary `sk`)

Fork of Pi by Mario Zechner. 40+ LLM providers, 32 built-in tools, LSP integration, DAP debugger support, subagents with IRC coordination, hashline editing, time-traveling stream rules, hindsight memory, and more. ~27k lines of Rust core for in-process ripgrep/glob/find.

### 2. AI/ML research workbench (science surface)

A `.sk/` directory with a research wiki, journal, experiments, runs, sweeps, evaluations, and agentic research objects (agents, harnesses, rollouts, trajectories). Every research claim traces back to its provenance.

## Key packages

| Package | Role |
|---|---|
| `packages/coding-agent` | Main CLI, binary `sk` |
| `packages/ai` | Multi-provider LLM client with model catalog |
| `packages/agent` | Agent runtime with tool calling |
| `packages/tui` | Terminal UI rendering library |
| `packages/natives` | Bindings for native text/image/grep |
| `packages/scidekick-skills` | Agent skill marketplace |
| `packages/swarm-extension` | Multi-agent swarm orchestration |
| `python/robomp` | Python worker pool for sandboxed execution |
| `python/omp-rpc` | RPC bridge between TypeScript and Python |
| `crates/pi-natives` | Rust crate for perf-critical operations |

## Key tools

- `read` / `edit` / `write` / `bash` / `search` / `find`
- `lsp` — code intelligence (diagnostics, navigation, renames, code actions)
- `debug` — DAP debugger (lldb, dlv, debugpy)
- `task` — parallel subagents with IRC coordination
- `eval` — persistent Python/JS cells with tool loopback
- `browser` — headless Chromium with stealth patches
- `web_search` — 14-provider search chain
- `retain` / `recall` / `reflect` — hindsight memory

## Status

The coding agent is production-quality (v1.1.0). The science surface is in early implementation — wiki/journal are working; experiments, runs, sweeps, and agentic objects are planned.