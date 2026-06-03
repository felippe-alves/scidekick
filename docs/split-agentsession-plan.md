# Split AgentSession — Multi-Session Refactor Plan

Item 13 from the deferred architecture plan. `packages/coding-agent/src/session/agent-session.ts` is ~9550 lines and owns turn lifecycle, queueing, model state, tool registry, MCP refresh, slash commands, warnings, and UI-facing state — all in one class. This plan breaks the split into five sessions, each with concrete deliverables and a clean cut-over.

---

## Session 1: Extract `TurnRunner`

### Target

Extract prompt queuing, active turn state, cancellation, and budget lifecycle from `AgentSession` into a new `TurnRunner` controller.

### Files

| File | Action |
|---|---|
| `packages/coding-agent/src/session/turn-runner.ts` | **Create** — new controller |
| `packages/coding-agent/src/session/agent-session.ts` | **Refactor** — delegate to TurnRunner, keep public API |
| `packages/coding-agent/test/turn-runner.test.ts` | **Create** — lifecycle tests |

### Public API of TurnRunner

```ts
class TurnRunner {
  constructor(sessionManager: SessionManager);
  
  /** True when a turn is actively streaming (tool calls, model output). */
  get isStreaming(): boolean;
  
  /**
   * Queue a steer message for delivery to the running agent. Budget is NOT
   * applied here — the steered message inherits the active turn's budget.
   */
  queueSteer(text: string, images?: ImageInput[]): Promise<void>;
  
  /**
   * Queue a follow-up message. Budget is NOT applied here.
   */
  queueFollowUp(text: string, images?: ImageInput[]): Promise<void>;
  
  /**
   * Cancel the active turn. Returns when the agent has stopped processing.
   */
  cancel(): Promise<void>;
  
  /**
   * Mark a turn as started. Call before the first model request in a turn.
   */
  beginTurn(budgetTotal?: number | null, budgetHard?: boolean): void;
  
  /**
   * Mark a turn as ended. Call after the model response completes.
   */
  endTurn(): void;
}
```

### What moves

| From `AgentSession` | To `TurnRunner` |
|---|---|
| `#steeringMessages: string[]` | `#steerQueue` |
| `#followUpMessages: string[]` | `#followUpQueue` |
| `#isStreaming` / `#streamingPromise` | `#active` / `#done` |
| `#cancelController` | owned internally |
| `#queueSteer()` / `#queueFollowUp()` | `queueSteer()` / `queueFollowUp()` |
| `#waitForTurn()` | `cancel()` |

### What stays on `AgentSession`

- `prompt()` — the public entry point; delegates queuing and streaming check to `TurnRunner`.
- Budget calls — `beginTurnBudget` / `endTurnBudget` are called by `TurnRunner` but the `SessionManager` reference stays on `AgentSession` (passed in constructor).
- The `isStreaming` getter remains on `AgentSession` as a delegation through `TurnRunner`.

### Acceptance criteria

- `AgentSession.prompt()` behavior is identical: immediate turns execute, concurrent calls queue or throw `AgentBusyError`.
- A queued steer message does not change the active turn's budget.
- `TurnRunner` can be tested in isolation with a mock `SessionManager`.
- Package typecheck passes.

---

## Session 2: Extract `ToolRegistryController`

### Target

Extract built-in tool map, MCP tool refresh, active tool selection, and force-tool state into a new `ToolRegistryController`.

### Files

| File | Action |
|---|---|
| `packages/coding-agent/src/session/tool-registry-controller.ts` | **Create** |
| `packages/coding-agent/src/session/agent-session.ts` | **Refactor** |
| `packages/coding-agent/test/tool-registry-controller.test.ts` | **Create** |

### Public API of ToolRegistryController

```ts
class ToolRegistryController {
  constructor();
  
  /** Register built-in tools. Replaces the entire built-in set. */
  setBuiltinTools(tools: Map<string, AgentTool>): void;
  
  /** Replace MCP tool contributions. Old MCP tools are removed. */
  setMcpTools(tools: AgentTool[]): void;
  
  /** Register or remove the SSH tool. */
  setSshTool(tool: AgentTool | undefined): void;
  
  /** Force-activate specific tools by name (overrides auto-selection). */
  forceTools(names: string[]): void;
  
  /** Get the currently active tool set. */
  getActiveTools(): Map<string, AgentTool>;
  
  /** Get all registered tools (including inactive). */
  getAllTools(): Map<string, AgentTool>;
  
  /** Invalidate discovery caches — next `getActiveTools()` re-evaluates which tools to load. */
  invalidateDiscoveryCaches(): void;
}
```

### What moves

| From `AgentSession` | To `ToolRegistryController` |
|---|---|
| `#toolRegistry: Map<string, AgentTool>` | `#builtinTools` |
| `#mcpTools: AgentTool[]` | `#mcpTools` |
| `#sshTool: AgentTool \| undefined` | `#sshTool` |
| `#requestedToolNames: string[]` | `#forcedNames` |
| `#activeToolNamesCache` / `#activeToolNamesCacheValid` | `#activeCache` / `#cacheValid` |
| `refreshMCPTools(tools)` | `setMcpTools(tools)` |
| `refreshSshTool({ activateIfAvailable })` | `setSshTool(tool)` |
| `#applyActiveToolsByName()` | `getActiveTools()` |
| `#invalidateDiscoveryCaches()` | `invalidateDiscoveryCaches()` |

### What stays

- `AgentSession` keeps public wrappers `refreshMCPTools`, `refreshSshTool` that delegate.
- Force-tool state set via `AgentSession.updateSettings()` continues to call `controller.forceTools()`.

### Acceptance criteria

- `refreshMCPTools([])` followed by `refreshMCPTools([...mcpTools])` restores the full tool set.
- Forcing a tool name makes it active regardless of auto-selection state.
- Invalidate-discovery-caches triggers re-evaluation on next `getActiveTools()`.
- Controller is testable in isolation.

---

## Session 3: Extract `CommandRegistryController`

### Target

Extract slash command state, MCP prompt commands, and custom commands into a new `CommandRegistryController` backed by the `SourceRegistry` primitive (already built in item 10).

### Files

| File | Action |
|---|---|
| `packages/coding-agent/src/session/command-registry-controller.ts` | **Create** |
| `packages/coding-agent/src/session/agent-session.ts` | **Refactor** — delegate to controller, remove legacy arrays |
| `packages/coding-agent/test/command-registry-controller.test.ts` | **Create** |

### Public API of CommandRegistryController

```ts
class CommandRegistryController {
  constructor();
  
  /** Replace file-based slash commands. */
  setFileCommands(commands: FileSlashCommand[]): void;
  
  /** Replace custom TypeScript commands. */
  setCustomCommands(commands: LoadedCustomCommand[]): void;
  
  /** Replace MCP prompt-backed commands. */
  setMcpPromptCommands(commands: LoadedCustomCommand[]): void;
  
  /** All active custom commands (custom + MCP prompts). */
  getCustomCommands(): readonly LoadedCustomCommand[];
  
  /** All active file-based slash commands. */
  getFileCommands(): readonly FileSlashCommand[];
  
  /** Find a command by name. */
  findCommand(name: string): LoadedCustomCommand | undefined;
  
  /** SourceRegistry-backed snapshot of all registered commands. */
  snapshot(): readonly LoadedCustomCommand[];
}
```

### What moves

| From `AgentSession` | To `CommandRegistryController` |
|---|---|
| `#slashCommands: FileSlashCommand[]` | `#fileCommands` (via `SourceRegistry`, source `"file-commands"`) |
| `#customCommands: LoadedCustomCommand[]` | `#customCommands` (source `"custom-commands"`) |
| `#mcpPromptCommands: LoadedCustomCommand[]` | `#mcpPromptCommands` (source `"mcp:prompts"`) |
| `#commandRegistry: SourceRegistry<FileSlashCommand>` | owned by controller |
| `#customCommandRegistry: SourceRegistry<LoadedCustomCommand>` | owned by controller |
| `setSlashCommands()` | `setFileCommands()` |
| `setMCPPromptCommands()` | `setMcpPromptCommands()` |
| `customCommands` getter | `getCustomCommands()` |
| `#tryExecuteCustomCommand()` | stays on `AgentSession` but delegates lookup to controller |

### Legacy array removal

This session removes the dual-write pattern (arrays + SourceRegistry) introduced in item 10. After this session:

- `#slashCommands` array is gone — only `SourceRegistry` backed.
- `#customCommands` array is gone — only `SourceRegistry` backed.
- `#mcpPromptCommands` array is gone — only `SourceRegistry` backed.
- `commandRegistrySnapshot` getter on `AgentSession` delegates to `controller.snapshot()`.

### Acceptance criteria

- All existing callers of `setSlashCommands`, `setMCPPromptCommands`, `customCommands` work via delegation.
- `controller.removeSource("mcp:prompts")` removes only MCP prompt commands.
- `controller.removeSource("custom-commands")` removes only custom TypeScript commands.
- Package compiles without the legacy arrays.

---

## Session 4: Wire contollers into `AgentSession` facade

### Target

`AgentSession` becomes a thin facade that delegates to `TurnRunner`, `ToolRegistryController`, and `CommandRegistryController`. Public API unchanged; internal implementation detail moved to controllers.

### Steps

1. **Instantiate controllers in constructor:**

   ```ts
   this.#turnRunner = new TurnRunner(this.sessionManager);
   this.#toolRegistryController = new ToolRegistryController();
   this.#commandRegistryController = new CommandRegistryController();
   ```

2. **Replace internal method bodies with delegation:**

   ```ts
   // Before
   async prompt(text, images, options) {
     // 200 lines of queuing, budget, streaming logic
   }
   
   // After
   async prompt(text, images, options) {
     const expandedText = await this.#expandPrompt(text, options);
     const keywordNotices = this.#computeKeywordNotices(expandedText, options);
     if (this.#turnRunner.isStreaming) {
       await this.#turnRunner.queueSteer(expandedText, images);
       return;
     }
     this.#turnRunner.beginTurn();
     await this.#promptWithMessage(expandedText, images, options);
   }
   ```

3. **Remove moved private fields** — `#steeringMessages`, `#followUpMessages`, `#cancelController`, `#toolRegistry`, `#mcpTools`, `#sshTool`, `#requestedToolNames`, `#slashCommands`, `#customCommands`, `#mcpPromptCommands`, `#commandRegistry`, `#customCommandRegistry`.

4. **Verify public API compatibility** — every method on `AgentSession` that callers use must have the same signature and behavior.

### Acceptance criteria

- `bun run check` passes.
- All 21 existing focused tests still pass.
- No public method signature changed.

---

## Session 5: Add focused lifecycle tests

### Target

Add tests for each controller in isolation, plus integration tests proving controller delegation works end-to-end.

### Test files

| File | What it tests |
|---|---|
| `test/turn-runner.test.ts` | Queueing, cancellation, streaming state, budget isolation |
| `test/tool-registry-controller.test.ts` | Tool registration, MCP replacement, force-tool, cache invalidation |
| `test/command-registry-controller.test.ts` | Source-based registration, removal isolation, find-by-name |

### Test contracts

**TurnRunner:**
- Queuing a steer during active turn does not affect budget
- Cancel during streaming resolves the active promise
- `isStreaming` transitions correctly across beginTurn / endTurn
- Concurrent calls to `queueSteer` are serialized

**ToolRegistryController:**
- `setMcpTools` replaces, does not accumulate
- `forceTools` overrides auto-selection
- `invalidateDiscoveryCaches` forces re-evaluation
- SSH tool set/unset round-trips correctly

**CommandRegistryController:**
- `setMcpPromptCommands` with empty array clears MCP commands but leaves custom commands
- `findCommand` returns MCP prompt command by name
- `setFileCommands` replaces, does not accumulate with prior file commands
- Snapshot order matches source registration order

### Integration tests

- Create a minimal `AgentSession` with all three controllers wired
- Call `prompt()` and verify streaming behavior
- Call `refreshMCPTools()` and verify active tool set
- Call `setMCPPromptCommands()` and verify `customCommands` getter

### Acceptance criteria

- All controller tests pass in isolation.
- Integration tests pass against the wired `AgentSession`.
- `bun test packages/coding-agent/test/` passes the full suite.

---

## Risk mitigation

- **Never change public signatures.** Every refactor preserves the exact same method names, parameter types, and return types.
- **Keep the old code until tests pass.** Each session introduces the new controller alongside the old code. Old code is removed only after delegation is verified.
- **One controller per session.** No multi-controller changes in a single session — each has its own commit and verification step.
- **Use `bun run check` after every file change.** No accumulating changes without type verification.
- **Commit after each session.** Each session produces one working commit.

---

## Execution order

1. Session 1 — TurnRunner (least coupling to other AgentSession internals)
2. Session 2 — ToolRegistryController (independent of Session 1)
3. Session 3 — CommandRegistryController (depends on Session 1+2 foundation, uses SourceRegistry from item 10)
4. Session 4 — Facade wiring (depends on Sessions 1-3)
5. Session 5 — Tests (depends on Session 4)

## Done definition

- `agent-session.ts` is under ~3000 lines (down from ~9550).
- Three new controller files exist under `packages/coding-agent/src/session/`.
- Three new test files exist under `packages/coding-agent/test/`.
- Public `AgentSession` API is unchanged.
- `bun run check` and `bun test` pass.
- All existing callers (sdk.ts, main.ts, builtin-registry.ts, acp-agent.ts, modes/*) work without modification.
