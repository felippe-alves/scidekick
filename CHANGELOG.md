# Changelog

## [Unreleased]

### Added

- Added `sk acp-install <target>` command for one-command ACP setup in Zed and VS Code (user and workspace).
- Added skill validation gate: session start warns when loaded skills have not been validated with the current model.
- Added thinking intensity display to the Scidekick status line preset.

### Changed

- Rewrote README.md for Scidekick branding, added ACP editor setup docs for Zed and VS Code.
- Changed Scidekick status line preset to `powerline-thin` with mode, context usage, session name, and thinking level segments.

## [1.1.0] - 2026-05-31

### Added

- Added project-local research wiki commands for durable AI/ML research memory:
  - `sk wiki init`
  - `sk wiki page`
  - `sk wiki query`
  - `sk wiki ingest`
- Added append-only research journal commands:
  - `sk journal init`
  - `sk journal add`
  - `sk journal today`
  - `sk journal link`
- Store science-surface memory under the current project's `.sk/wiki` and `.sk/journal` directories.

### Changed

- Bumped Scidekick package metadata to version 1.1.0.
