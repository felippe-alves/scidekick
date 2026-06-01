---
title: "tree-sitter"
type: note
created: 2026-05-31T23:59:00.000Z
updated: 2026-05-31T23:59:00.000Z
tags: [tool, parsing, ast, incremental, rust]
---

# tree-sitter

Incremental parsing library for building fast and robust syntax trees.

- **Site**: https://tree-sitter.github.io/
- **Key features**: Incremental parsing, error recovery, 50+ language grammars, WASM compilation

## Relevance to Scidekick

Scidekick's `read` tool uses tree-sitter for structural code summarization — signatures kept, bodies elided. The hashline edit format uses tree-sitter-based anchor resolution for `replace block` operations.
