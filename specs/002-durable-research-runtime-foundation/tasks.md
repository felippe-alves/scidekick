# Tasks: Durable Research Runtime Foundation

**Input**: Design documents from `/specs/002-durable-research-runtime-foundation/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, quickstart.md

**Tests**: Required for runtime contracts and CLI behavior.

## Phase 1: Runtime State Foundation

- [X] T001 Add `packages/scidekick-runtime/src/research-state/types.ts` with workflow phases, session/project state, plan, claim, and evidence record contracts
- [X] T002 Add `packages/scidekick-runtime/src/research-state/validation.ts` with session and plan gate validation
- [X] T003 Add `packages/scidekick-runtime/src/research-state/state-store.ts` with `.sk/research/` path helpers and state read/write APIs
- [X] T004 Export research-state APIs from `packages/scidekick-runtime/src/research-state/index.ts`, `packages/scidekick-runtime/src/index.ts`, and `packages/scidekick-runtime/package.json`

## Phase 2: Runtime Behavior

- [X] T005 Implement `createResearchSession` with project/session persistence and initialization event append
- [X] T006 Implement `recordResearchPlan` with required expected evidence, success criteria, stop condition, and rollback plan gates
- [X] T007 Add runtime contract tests in `packages/scidekick-runtime/test/research-state.test.ts`

## Phase 3: CLI Adapter

- [X] T008 Extend `packages/scidekick-cli/src/commands/research.ts` to route `init`, `status`, and `plan`
- [X] T009 Add CLI command contract tests in `packages/scidekick-cli/test/research-runtime-command.test.ts`
- [X] T010 Keep existing `research export --session` behavior working from event logs

## Phase 4: Validation

- [X] T011 Run `bun --cwd=packages/scidekick-runtime test`
- [X] T012 Run `bun --cwd=packages/scidekick-cli test`
- [X] T013 Run `bun --cwd=packages/scidekick-runtime run check`
- [X] T014 Run `bun --cwd=packages/scidekick-cli run check`

## Remaining Work

- [X] T015 Run root `bun check`
- [X] T016 Run affected coding-agent compatibility tests
