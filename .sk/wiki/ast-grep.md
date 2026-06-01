---
title: "ast-grep"
type: note
created: 2026-05-31T23:59:00.000Z
updated: 2026-05-31T23:59:00.000Z
tags: [tool, code-analysis, ast, structural-search, rust]
---

# ast-grep

Structural code search and rewrite tool based on AST matching.

- **Site**: https://ast-grep.github.io/
- **Key features**: AST-aware search, structural rewrite, 50+ tree-sitter grammars, preview-before-apply

## Relevance to Scidekick

Scidekick's `ast_grep` and `ast_edit` tools use ast-grep for structural code search and codemods. The `ast_edit` tool returns proposed replacements with previews; the agent calls `resolve` to apply them atomically.
