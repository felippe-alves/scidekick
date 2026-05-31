# Scidekick Vertical Slice Implementation Plan

## Current truth

Scidekick is currently an Oh My Pi fork with a small runtime-name/config-dir override and several standalone Scidekick prototype packages. The prototypes have passing focused tests after the native addon is built, but they are not wired into the CLI. The architecture document overstates implementation status.

The current GitHub workflow has a failing `test` job. Release binaries should no longer depend on that job, but the test failure still needs to be inspected and classified as either an upstream flaky test or a real regression.

## Goal

Ship one honest, working Scidekick slice:

- `sk` is the default binary/product identity.
- `.sk` is the default config root.
- Scidekick prompt/theme can be activated without manual hidden setup.
- The implemented science packages are reachable from the CLI.
- Wiki and skill installation flows work end-to-end against local fixtures.
- Model-tier guard warns only in scientific contexts.
- Documentation reflects actual implementation state.

## Non-goals for this slice

Do not implement these until the foundational slice is working:

- `loop`
- `pipeline`
- `team`
- `extract`
- `evolve`
- PaperQA2 integration
- BGPT integration
- autonomous experiment orchestration
- skill self-optimization

## Phase 0 — CI and release baseline

### Tasks

1. Inspect the failed GitHub Actions `test` job logs once they are available.
2. Classify the failure:
   - real Scidekick regression: fix it before continuing;
   - inherited Oh My Pi flaky test: document it and keep release binaries independent from it.
3. Confirm `release_binary` jobs are not gated on `test`.
4. Confirm `v1.0.0` release artifacts are produced, or fix the next release blocker.

### Acceptance criteria

- Failed test job has a named root cause.
- Release binaries either complete successfully or have a specific next blocker recorded.
- No release condition relies on the flaky full test suite.

## Phase 1 — Correct the architecture document

### Tasks

1. Update `docs/scidekick-architecture.md` to separate:
   - implemented and wired;
   - implemented but not wired;
   - planned;
   - false/obsolete assumptions.
2. Replace “vendor submodule” language with “direct Oh My Pi fork”.
3. Uncheck Phase 1 items that are not actually product features.
4. Add a short status table matching the current code.

### Acceptance criteria

- The architecture document no longer claims that `install-skills`, wiki, model-tier enforcement, visual identity, or science prompt are product-ready unless they are wired and tested.
- The document states that current package identity is still mostly `@oh-my-pi/*` except standalone private Scidekick packages.

## Phase 2 — Product identity cutover

### Tasks

1. Make the compiled binary output `sk`, not `omp`.
2. Make release artifacts use `sk-*` names.
3. Make default app identity `sk` without requiring `SK_APP_NAME=sk`.
4. Make default config directory `.sk` without requiring `SK_CONFIG_DIR=.sk`.
5. Update high-visibility help text and install/release paths that currently say `omp` for Scidekick builds.
6. Keep upstream compatibility localized: avoid broad source renames.

### Acceptance criteria

- `bun run packages/coding-agent/src/cli.ts --version` prints `sk/<version>` by default in this fork.
- CLI help says `sk` in examples and user-facing command names.
- Release binary artifact names are `sk-linux-x64`, `sk-darwin-arm64`, etc.
- Existing internal package/crate names remain unchanged unless required for artifact identity.

## Phase 3 — Wire `install-skills`

### Tasks

1. Fix `packages/scidekick-skills/install-skills.ts` import error by importing `getAgentDir` from `@oh-my-pi/pi-utils`.
2. Export or move pure helpers so tests exercise the real implementation instead of duplicated test-local copies.
3. Register the command in the coding-agent CLI command map.
4. Ensure command output uses `sk`, not `omp`.
5. Install skills into the actual Scidekick skill discovery directory under `.sk`.
6. Add a local fixture repository for tests; do not rely on network for tests.

### Acceptance criteria

- `sk install-skills --list --from <local-fixture>` lists fixture skills.
- `sk install-skills --from <local-fixture>` installs skills into a temp `.sk` config dir during tests.
- Registry records installed skills.
- No network access is required for tests.

## Phase 4 — Add a real `wiki` command

### Tasks

1. Add a coding-agent CLI command that wraps `FilesystemWikiBackend`.
2. Support minimum commands:
   - `sk wiki new <type> <title>`
   - `sk wiki list`
   - `sk wiki show <slug>`
   - `sk wiki lint <slug>`
3. Use existing schema templates for `new`.
4. Store entries under `.sk/wiki` by default.
5. Keep markdown files human-editable and deterministic.

### Acceptance criteria

- `sk wiki new paper "Example Paper"` creates a markdown file with valid frontmatter.
- `sk wiki list` prints the created slug.
- `sk wiki show example-paper` prints frontmatter/body content.
- `sk wiki lint example-paper` returns useful validation output.
- Tests use a temp config dir and do not touch the user home directory.

## Phase 5 — Activate prompt and theme deliberately

### Tasks

1. Add a bundled Scidekick system prompt append or default `.sk/SYSTEM.md` installation path.
2. Do not overwrite user custom prompts.
3. Make violet-teal-amber theme discoverable and selectable.
4. Decide whether the theme is default for Scidekick builds or installed as a named theme.
5. Keep changes localized so upstream merges remain manageable.

### Acceptance criteria

- A fresh Scidekick run can load scientific capability instructions without manual file copying.
- Theme can be selected through existing theme mechanisms.
- Existing Oh My Pi theme loading remains intact.

## Phase 6 — Wire model-tier guard only in science contexts

### Tasks

1. Identify science contexts:
   - `wiki` command;
   - `install-skills` scientific skill path;
   - sessions with Scidekick science prompt/skills loaded.
2. Warn on Haiku-tier models in those contexts.
3. Add config for `warn` vs `block`.
4. Avoid globally blocking lightweight models for normal coding tasks.

### Acceptance criteria

- Haiku-tier warning appears for science workflows.
- No warning appears for ordinary coding sessions without science mode active.
- Config can switch warning to hard block.
- Tests assert behavior at the context boundary.

## Phase 7 — Focused verification suite

### Tests to add or fix

1. CLI identity:
   - version output uses `sk`;
   - help examples use `sk`.
2. `install-skills`:
   - local fixture list;
   - local fixture install;
   - registry updated;
   - missing repo/skill errors are clear.
3. `wiki`:
   - new/list/show/lint round trip;
   - slug sanitization;
   - validation errors for bad entity metadata.
4. model-tier guard:
   - warns in science context;
   - does not warn in normal context;
   - block mode exits/fails predictably.
5. config paths:
   - default config dir is `.sk` for this fork;
   - temp config env override works in tests.

### Acceptance criteria

- Focused Scidekick tests pass without network access.
- Tests do not mutate the real user config directory.
- Full suite failure is either fixed or documented as inherited flaky behavior with release binaries still unblocked.

## Phase 8 — Release readiness

### Tasks

1. Run focused Scidekick tests.
2. Run package-local type checks for changed TypeScript packages.
3. Build native addon if required by tests.
4. Build one local binary smoke if feasible.
5. Push release workflow only after local verification passes.

### Acceptance criteria

- `sk --version` works from source.
- `sk --help` lists `install-skills` and `wiki`.
- focused Scidekick tests pass.
- release workflow produces `sk-*` artifacts.

## Implementation order

1. CI release/test classification.
2. Architecture document correction.
3. Product identity cutover.
4. `install-skills` wiring.
5. `wiki` command wiring.
6. Prompt/theme activation.
7. model-tier science-context enforcement.
8. focused verification and release.
