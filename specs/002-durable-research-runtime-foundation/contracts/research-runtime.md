# Contract: Durable Research Runtime

## Runtime APIs

- `createResearchSession({ workspacePath, sessionId, objective, now })`
  - Creates project and session state.
  - Starts the session in `intake`.
  - Appends an initialization transcript event.

- `recordResearchPlan({ workspacePath, sessionId, plan, now })`
  - Requires expected evidence, success criteria, stop condition, and rollback plan.
  - Persists a draft plan.
  - Moves phase to `plan`.
  - Appends a transcript-compatible plan event.

- `readResearchProjectState({ workspacePath })`
  - Returns `null` when state does not exist.

- `readResearchSessionState({ workspacePath, sessionId })`
  - Returns `null` when state does not exist.

## CLI Commands

```bash
sk research init --session <id> --objective <text>
sk research status --session <id>
sk research plan --session <id> --title <text> --evidence <text> --success <text> --stop <text> --rollback <text>
```

Commands print plain text and read/write `.sk/research/` state through `@scidekick/runtime`.
