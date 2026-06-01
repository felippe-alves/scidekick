---
title: "ripgrep"
type: note
created: 2026-05-31T23:59:00.000Z
updated: 2026-05-31T23:59:00.000Z
tags: [tool, search, rust, performance]
---

# ripgrep

Line-oriented search tool that recursively searches the current directory for a regex pattern.

- **Repo**: https://github.com/BurntSushi/ripgrep
- **Author**: Andrew Gallant (BurntSushi)
- **Key features**: Fast regex search, `.gitignore` awareness, colored output, UTF-8/BOM handling

## Relevance to Scidekick

Scidekick embeds ripgrep as an in-process native module via `crates/pi-natives` (Rust). The `search` tool uses the in-process ripgrep engine instead of forking `rg` — no fork-exec round-trips. Same for glob and find.
