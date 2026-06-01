---
title: "Bun"
type: note
created: 2026-05-31T23:59:00.000Z
updated: 2026-05-31T23:59:00.000Z
tags: [tool, runtime, javascript, typescript, bundler]
---

# Bun

Fast JavaScript runtime, bundler, and package manager.

- **Site**: https://bun.sh/
- **Key features**: Native TypeScript/JSX, bundler, test runner, package manager, SQLite client, file APIs
- **Version requirement**: >= 1.3.14

## Relevance to Scidekick

Scidekick runs on Bun as its primary runtime. The codebase uses Bun APIs throughout — `Bun.file()`, `Bun.write()`, `Bun.spawn()`, `Bun.sleep()`, Bun Shell (`$`), `bun:sqlite`, `Bun.password`, `Bun.hash`, WebCrypto — with `node:*` fallbacks only where Bun doesn't cover. The binary is compiled with `bun build --compile`.
