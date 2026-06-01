---
title: "Puppeteer"
type: note
created: 2026-05-31T23:59:00.000Z
updated: 2026-05-31T23:59:00.000Z
tags: [tool, browser-automation, testing, chrome]
---

# Puppeteer

Headless Chrome automation library for Node.js.

- **Site**: https://pptr.dev/
- **Key features**: Page automation, screenshot capture, PDF generation, form interaction, network interception

## Relevance to Scidekick

Scidekick's `browser` tool (`packages/coding-agent/src/tools/browser/`) uses `puppeteer-core` to drive headless Chromium with stealth patches. The browser tool launches local Chromium, applies anti-detection patches, and exposes a `tab` helper API for agent-driven web interaction.
