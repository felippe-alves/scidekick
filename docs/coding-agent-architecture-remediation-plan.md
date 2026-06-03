# Coding Agent Architecture Remediation Plan

## Purpose

This plan turns the code and architecture review of `packages/coding-agent` into an actionable sequence of fixes and structural improvements. The goal is to eliminate known correctness risks first, then reduce the architectural drift that made those risks likely.

## Guiding principles

- Fix user-visible correctness defects before refactoring.
- Prefer one shared runtime path over mode-specific near-duplicates.
- Make lifecycle contracts explicit: turn execution, tool registration, plugin reload, MCP reconnect, command refresh, and teardown.
- Keep compatibility where possible, but remove stale aliases or legacy active paths once migration is complete.
- Add tests for externally observable contracts, not incidental implementation details.

## Phase 1: Correctness fixes

### 1. Fix queued-turn budget isolation

**Problem:** `AgentSession.prompt()` begins a turn budget before detecting that a prompt must be queued. A queued prompt can overwrite the budget of the currently running turn.

**Target files:**

- `packages/coding-agent/src/session/agent-session.ts`
- `packages/coding-agent/src/session/session-manager.ts`

**Plan:**

1. Introduce a queued-turn payload type that stores prompt text, images/options, and parsed budget metadata.
2. Apply `beginTurnBudget()` only when that queued turn becomes active.
3. Ensure active-turn budget state cannot be modified by later queued prompts.
4. Add a test where an active turn observes its original budget after another prompt is queued with a different budget.

**Acceptance criteria:**

- Queuing a prompt does not change the active turn's budget ceiling or spend baseline.
- Immediate prompts still apply their own budget before model/tool execution.

### 2. Make aborted process execution impossible to report as success

**Problem:** `execCommand()` maps an absent exit code to `0` while also setting `killed`, allowing callers that check only `code` to treat an aborted command as successful.

**Target file:**

- `packages/coding-agent/src/exec/exec.ts`

**Plan:**

1. Replace the current result shape with a discriminated result, or preserve `code: undefined` for killed/aborted executions.
2. Update call sites to handle aborted, signaled, and exited states explicitly.
3. Add tests for timeout/user abort paths and verify they do not pass success checks.

**Acceptance criteria:**

- Aborted or timed-out commands cannot be represented as exit code `0`.
- Existing successful and non-zero exit behavior remains unchanged.

### 3. Clear stale MCP prompt commands on full disconnect

**Problem:** `disconnectAll()` clears MCP connections and tools but does not notify prompt consumers, so MCP prompt slash commands can remain after removal/reload.

**Target files:**

- `packages/coding-agent/src/mcp/manager.ts`
- `packages/coding-agent/src/sdk.ts`
- `packages/coding-agent/src/session/agent-session.ts`

**Plan:**

1. Make `disconnectAll()` notify prompt consumers after clearing connections.
2. Add a session-level method to clear MCP prompt commands directly if needed.
3. Test that disconnect/removal removes prompt-backed slash commands.

**Acceptance criteria:**

- After MCP disconnect/reload/removal, stale MCP prompt commands are no longer advertised or executable.

### 4. Expand environment variables for plugin-packaged MCP configs

**Problem:** Extension-packaged MCP configs bypass env expansion while other MCP discovery providers expand placeholders.

**Target file:**

- `packages/coding-agent/src/discovery/omp-plugins.ts`

**Plan:**

1. Apply `expandEnvVarsDeep()` to plugin MCP server configs before emitting them.
2. Validate that unresolved placeholders keep existing behavior where intentional.
3. Add a test using a plugin `.mcp.json` with an env placeholder.

**Acceptance criteria:**

- Plugin MCP configs behave consistently with built-in, Claude, Gemini, Cursor, and `.mcp.json` providers.

### 5. Make extension root discovery use the current config source

**Problem:** Extension root discovery reads only legacy `settings.json`, while current settings persist to `config.yml`.

**Target files:**

- `packages/coding-agent/src/discovery/omp-extension-roots.ts`
- `packages/coding-agent/src/config/settings.ts`

**Plan:**

1. Route extension root lookup through the same settings/config capability loader used by runtime settings.
2. Keep legacy `settings.json` as migration/input compatibility, not as the only active source.
3. Add tests for extension roots written to `config.yml` and legacy `settings.json`.

**Acceptance criteria:**

- Extensions configured through the current settings format are discovered after restart/reload.
- Legacy extension config remains supported through the migration path.

### 6. Sanitize external TUI text with control stripping

**Problem:** Some TUI paths sanitize tabs and width only, leaving ANSI/VT controls and layout-breaking newlines possible.

**Target files:**

- `packages/coding-agent/src/modes/components/mcp-add-wizard.ts`
- Shared TUI render utility module, existing or new within `packages/coding-agent/src/modes` or `packages/coding-agent/src/tools/render-utils.ts`

**Plan:**

1. Add or extend a shared `sanitizeForTui()` helper.
2. Strip ANSI and terminal control sequences.
3. Normalize newlines/carriage returns where a single-line display is expected.
4. Replace local one-off sanitizer implementations with the shared helper.
5. Add tests for URL/error strings containing tabs, newlines, ANSI escapes, and over-width content.

**Acceptance criteria:**

- External strings cannot inject terminal control sequences into TUI render paths.
- Truncation remains width-aware.

## Phase 2: Runtime reload unification

### 7. Define a single reload contract

**Problem:** TUI, ACP, and slash-command paths each refresh different subsets of runtime state. Plugin and MCP mutations can report success while live tools/commands remain stale.

**Target files:**

- `packages/coding-agent/src/session/agent-session.ts`
- `packages/coding-agent/src/sdk.ts`
- `packages/coding-agent/src/slash-commands/builtin-registry.ts`
- `packages/coding-agent/src/slash-commands/helpers/mcp.ts`
- `packages/coding-agent/src/modes/acp/acp-agent.ts`

**Plan:**

1. Introduce a runtime reload API with explicit options:

   ```ts
   interface RuntimeReloadOptions {
     slashCommands?: boolean;
     extensions?: boolean;
     customTools?: boolean;
     hooks?: boolean;
     skills?: boolean;
     mcp?: boolean;
     ssh?: boolean;
   }
   ```

2. Implement one authoritative reload pipeline on the session/runtime boundary.
3. Make `/reload-plugins`, marketplace install/uninstall/upgrade, plugin enable/disable, and MCP reload/mutation paths call it.
4. Remove or reduce mode-specific reload logic.

**Acceptance criteria:**

- A plugin install/enable/disable/remove updates live commands, tools, hooks, skills, and MCP contributions consistently across TUI and ACP.
- `/mcp reload` reconnects MCP servers and refreshes MCP tools/prompts.
- All reload paths have one shared implementation or a thin adapter to the shared implementation.

### 8. Add a dedicated MCP live reload hook

**Problem:** ACP `/mcp reload` currently refreshes command advertisements, not MCP connections/tools.

**Target files:**

- `packages/coding-agent/src/slash-commands/types.ts`
- `packages/coding-agent/src/slash-commands/helpers/mcp.ts`
- `packages/coding-agent/src/modes/acp/acp-agent.ts`
- TUI runtime adapter for MCP commands

**Plan:**

1. Add `reloadMcp()` to the slash-command runtime contract.
2. Implement it by disconnecting current MCP manager state, rediscovering configs, reconnecting servers, and refreshing tools/prompts.
3. Call `reloadMcp()` after `/mcp add`, `/mcp remove`, `/mcp enable`, `/mcp disable`, and `/mcp reload`.

**Acceptance criteria:**

- MCP config mutations affect the active session immediately.
- MCP tool and prompt lists match the current config after reload.

## Phase 3: Discovery, registry, and metadata normalization

### 9. Normalize discovered capabilities early

**Problem:** Discovery providers return partially normalized values, and consumers repeat env expansion, path resolution, source metadata attachment, and enabled-state handling.

**Target directories:**

- `packages/coding-agent/src/discovery`
- `packages/coding-agent/src/capability`
- `packages/coding-agent/src/extensibility`

**Plan:**

1. Introduce a common normalized capability envelope:

   ```ts
   interface DiscoveredCapability<T> {
     kind: CapabilityKind;
     id: string;
     value: T;
     source: SourceMeta;
     scope: "project" | "user" | "builtin" | "plugin";
     trust: TrustLevel;
   }
   ```

2. Move env expansion, path resolution, and source metadata into provider-level normalization.
3. Make downstream registries consume only normalized capabilities.
4. Add validation tests for each provider family.

**Acceptance criteria:**

- Consumers no longer need provider-specific parsing rules.
- Provider outputs have consistent source/scope/trust metadata.

### 10. Introduce source-aware runtime registries

**Problem:** Commands, tools, prompts, and plugin contributions are mutated through arrays/maps without a uniform source lifecycle. This makes stale entries likely after reload/disconnect.

**Target areas:**

- Slash command registry/state
- Tool registry/state
- MCP prompt command state
- Plugin/custom tool registration

**Plan:**

1. Add source-aware registry primitives:

   ```ts
   interface SourceRegistry<T> {
     replaceSource(sourceId: string, items: readonly T[]): void;
     removeSource(sourceId: string): void;
     snapshot(): readonly T[];
   }
   ```

2. Register built-ins, project commands, user commands, MCP prompts, plugins, and custom tools by source ID.
3. Replace ad hoc clear/set methods with `replaceSource()` and `removeSource()`.
4. Test that removing a source removes only that source's entries.

**Acceptance criteria:**

- Reload/disconnect/uninstall removes stale entries deterministically.
- Built-in and user-defined entries coexist without accidental overwrites.

### 11. Normalize tool descriptors before indexing/rendering

**Problem:** Tool discovery indexes MCP and built-in schemas differently; built-in Zod parameter names are often not visible to the discovery index.

**Target files:**

- `packages/coding-agent/src/tool-discovery/tool-index.ts`
- Built-in tool registration path
- MCP/custom tool registration path

**Plan:**

1. Define a single internal `ToolDescriptor`:

   ```ts
   interface ToolDescriptor {
     name: string;
     summary: string;
     description: string;
     inputSchema: JsonSchema;
     parametersText: string;
     source: ToolSource;
     loadMode: ToolLoadMode;
   }
   ```

2. Convert Zod schemas to JSON Schema at registration time.
3. Use `parametersText` for BM25/indexing, rendering, and diagnostics.
4. Add tests proving built-in tool parameter names are indexed.

**Acceptance criteria:**

- Built-in, MCP, and custom tools have equivalent searchable metadata.
- Tool rendering and discovery consume the same descriptor shape.

### 12. Unify search regex semantics

**Problem:** Filesystem searches use native Rust regex while virtual/internal-resource searches use JavaScript `RegExp`, so accepted syntax differs by path type.

**Target file:**

- `packages/coding-agent/src/tools/search.ts`

**Plan:**

1. Validate patterns against the native regex dialect before dispatching to either backend.
2. Prefer using the same native engine for virtual resources if feasible.
3. If native virtual matching is not practical, reject unsupported JS-only regex syntax up front.
4. Add tests covering lookbehind/backreferences and valid Rust regex syntax across filesystem and virtual resources.

**Acceptance criteria:**

- The same `search` request has the same regex acceptance rules regardless of path type.

## Phase 4: Session and command architecture cleanup

### 13. Split `AgentSession` into narrower controllers

**Problem:** `AgentSession` owns turn lifecycle, queueing, model state, tool registry, MCP refresh, slash commands, warnings, and UI-facing state. This concentrates unrelated responsibilities and makes global-state bugs easier.

**Target files:**

- `packages/coding-agent/src/session/agent-session.ts`
- New focused modules under `packages/coding-agent/src/session` as needed

**Plan:**

1. Extract `TurnRunner` for prompt queueing, active turn state, cancellation, and budget lifecycle.
2. Extract `ToolRegistryController` for built-in/custom/MCP tool activation and refresh.
3. Extract `CommandRegistryController` for slash commands, MCP prompts, and skill commands.
4. Keep `AgentSession` as the public facade while moving implementation detail into controllers.
5. Add focused lifecycle tests for each controller.

**Acceptance criteria:**

- Per-turn mutable state is owned by a turn object/controller, not by unrelated global session fields.
- Public `AgentSession` behavior remains compatible.

### 14. Reduce mode-specific command implementations

**Problem:** Slash command business logic is duplicated or partially duplicated between TUI, ACP, and other runtime adapters.

**Target files:**

- `packages/coding-agent/src/slash-commands/builtin-registry.ts`
- `packages/coding-agent/src/slash-commands/helpers`
- Mode adapters under `packages/coding-agent/src/modes`

**Plan:**

1. Define one command execution contract with a stable runtime adapter.
2. Keep UI-only behavior, such as selectors and OAuth/browser flows, behind optional runtime capabilities.
3. Move duplicated switch logic into shared handlers.
4. Add parity tests for ACP and TUI command effects where both modes support the command.

**Acceptance criteria:**

- Supported command mutations have the same side effects in TUI and ACP.
- Unsupported mode-specific actions fail with explicit capability errors.

### 15. Validate file inputs before persistent session creation

**Problem:** Invalid file arguments can create persistent session artifacts before the command fails.

**Target file:**

- `packages/coding-agent/src/main.ts`

**Plan:**

1. Pre-parse and validate `@file` inputs before creating a persistent `SessionManager`.
2. Defer new session initialization until after input validation succeeds.
3. Add a regression test with a missing `@file` and assert no new session artifact is created.

**Acceptance criteria:**

- Failed input validation does not create new persisted sessions or breadcrumbs.

## Phase 5: Plugin trust and lifecycle hardening

### 16. Make plugin capability permissions explicit

**Problem:** Plugins can contribute high-impact capabilities, including hooks, tools, commands, MCP servers, skills, and agents, without one clearly enforced permission model.

**Target directories:**

- `packages/coding-agent/src/extensibility`
- `packages/coding-agent/src/discovery`
- Plugin/marketplace management code

**Plan:**

1. Require plugin manifests to declare contributed capability types.
2. Record enabled capability subsets per plugin and scope.
3. Treat hooks, MCP, and process-spawning tools as high-risk capabilities.
4. Surface source/trust/capability information in diagnostics and plugin listing.
5. Add tests for enabling/disabling individual capability groups.

**Acceptance criteria:**

- A plugin cannot silently activate a high-risk capability outside its enabled capability set.
- Users can inspect which plugin contributed each runtime capability.

### 17. Fix linked-plugin lifecycle consistency

**Problem:** Linked plugins are written into runtime config but not necessarily listed because listing enumerates `package.json.dependencies`; replacing real directories with symlinks is also fragile.

**Target file:**

- `packages/coding-agent/src/extensibility/plugins/manager.ts`

**Plan:**

1. List the union of dependencies and runtime plugin config entries.
2. Distinguish dependency-installed plugins from linked plugins in metadata.
3. Use safe removal semantics for symlinks, files, and directories.
4. Add tests for link, list, unlink/remove, and relink behavior.

**Acceptance criteria:**

- Linked plugins appear in plugin listing and can be managed reliably.
- Existing directories are not removed with file-only APIs.

## Phase 6: Tests and maintainability guardrails

### 18. Add contract-level lifecycle tests

**Test contracts:**

- Queued prompt budgets do not affect active turns.
- Plugin install/enable/disable/remove updates live commands/tools.
- MCP add/remove/enable/disable/reload updates live tools/prompts.
- Full MCP disconnect clears MCP prompt slash commands.
- Aborted command execution cannot be treated as success.
- Current-format config is visible to extension discovery after reload.
- Search regex syntax behaves consistently across filesystem and virtual resources.
- TUI sanitizer strips control sequences and preserves width constraints.

**Acceptance criteria:**

- Each test protects an externally observable behavior or lifecycle invariant.
- Tests are safe to run in the full package suite.

### 19. Add concise architecture notes near load-bearing code

**Target docs/comments:**

- Turn lifecycle and budget ownership.
- Runtime reload lifecycle.
- Discovery/config precedence.
- MCP connection/tool/prompt lifecycle.
- Plugin capability lifecycle.

**Plan:**

1. Keep notes close to code where possible.
2. Document invariants, not implementation history.
3. Avoid broad prose that will rot; focus on ownership, refresh, teardown, and postconditions.

**Acceptance criteria:**

- Maintainers can identify the owner and teardown path for each major runtime surface.

## Recommended implementation order

1. Fix queued-turn budget isolation.
2. Fix aborted process execution result semantics.
3. Clear stale MCP prompt commands on disconnect.
4. Expand env vars for plugin MCP configs.
5. Make extension roots use current config.
6. Add shared TUI sanitizer.
7. Define and adopt shared runtime reload pipeline.
8. Add live MCP reload hook and wire MCP mutations to it.
9. Normalize tool descriptors and discovery metadata.
10. Introduce source-aware registries.
11. Split `AgentSession` controllers.
12. Harden plugin trust and linked-plugin lifecycle.
13. Add/expand architecture docs after code contracts stabilize.

## Done definition

This plan is complete when:

- All correctness defects from the review are fixed with focused tests.
- Plugin and MCP runtime mutations update live session state consistently across supported modes.
- Discovery providers emit normalized, source-aware capability metadata.
- Runtime registries can replace/remove entries by source without stale commands/tools/prompts.
- `AgentSession` no longer owns unrelated lifecycle concerns directly.
- Package-local verification passes with `bun run check` and the relevant focused tests.
