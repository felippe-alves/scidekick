# Deferred Architecture Plan: Coding Agent

Items dropped from the initial remediation round because they are multi-file restructures
each needing dedicated planning, migration strategy, and testing. This plan breaks each into
concrete steps with files, contracts, and acceptance criteria.

---

## 1. Normalize discovered capabilities (item 9)

**Target dirs:** `packages/coding-agent/src/discovery`, `packages/coding-agent/src/capability`, `packages/coding-agent/src/extensibility`

### Problem

Discovery providers return partially normalized values. Consumers repeat env expansion, path
resolution, source metadata attachment, and enabled-state handling inconsistently. The current
providers are: builtin, Claude, Gemini, `.mcp.json`, Cursor IDE, plugin MCP, agent-definition.

### Plan

1. **Define the normalized envelope** in `packages/coding-agent/src/capability/types.ts`:

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

2. **Audit every provider** for repeated logic:
   - `builtin.ts`: env expansion, tildes, frontmatter parsing, path resolution
   - `gemini.ts`: JSON parsing, path resolution
   - `mcp-json.ts`: env expansion, path resolution
   - `omp-plugins.ts`: env expansion, path resolution, source metadata
   - `agent-definition.ts`: YAML parsing, path resolution

3. **Move normalization into providers.** Each provider should emit `DiscoveredCapability<T>[]`
   with env expansion, path resolution, and source metadata already applied.

4. **Update consumers:**
   - `capability/index.ts`: `loadProvider` should wrap/validate the envelope
   - `sdk.ts` extension loading pipeline
   - `discovery/builtin.ts` capability aggregator

5. **Add validation tests** per provider family — verify source/scope/trust after normalization.

### Acceptance

- Consumers no longer call `expandEnvVarsDeep`, `resolvePath`, or `createSourceMeta` directly.
- Every capability has source/scope/trust metadata visible in diagnostics/debug output.
- Provider outputs are comparable — same capability from different sources has the same shape.

---

## 2. Source-aware runtime registries (item 10)

**Target areas:** Slash command state, tool registry, MCP prompt commands, plugin/custom tool registration

### Problem

Commands, tools, prompts, and plugin contributions are mutated through arrays/maps without
uniform source lifecycle. After reload/disconnect, stale entries are removed ad-hoc. There is
no deterministic way to say "replace everything from source X."

### Plan

1. **Define the primitive** in a new `packages/coding-agent/src/session/source-registry.ts`:

   ```ts
   interface SourceRegistry<T> {
     replaceSource(sourceId: string, items: readonly T[]): void;
     removeSource(sourceId: string): void;
     snapshot(): readonly T[];
   }
   ```

2. **Map sources to source IDs:**
   - `"builtin"` — bundled slash commands, built-in tools
   - `"project"` — project-scope commands/config
   - `"user"` — user-scope commands/config
   - `"mcp:prompts"` — MCP prompt commands
   - `"mcp:tools"` — MCP tool contribution
   - `"plugin:<id>"` — per-plugin contributions (tools, commands, hooks, skills)

3. **Replace ad-hoc state mutation:**
   - `AgentSession.#slashCommands` → `SourceRegistry<FileSlashCommand>`
   - `AgentSession.#toolRegistry` → adapt to source-aware registration
   - `AgentSession.#mcpPromptCommands` → managed as `SourceRegistry` source `"mcp:prompts"`
   - Plugin registration in `sdk.ts` → per-plugin `SourceRegistry` entries

4. **Update reload/disconnect/uninstall paths** to use `removeSource()` instead of clearing
   arrays manually.

5. **Add tests** proving that removing a source removes only that source's entries and
   built-in/user-defined entries coexist without overwrites.

### Acceptance

- `plugin disable X` removes only plugin X's contributions.
- `mcp disconnect` removes only MCP tools and prompts.
- User-defined slash commands survive plugin reload.

---

## 3. Normalize tool descriptors for indexing and rendering (item 11)

**Target files:** `packages/coding-agent/src/tool-discovery/tool-index.ts`, built-in tool
registration, MCP/custom tool registration paths.

### Problem

Built-in tool discovery indexes JSON-Schema-like `parameters.properties` from MCP tools but
loses built-in Zod parameter names because Zod schemas are not converted to JSON Schema at
indexing time. Tool rendering, forcing, and documentation consume different shapes.

### Plan

1. **Define `ToolDescriptor`** in `packages/coding-agent/src/tools/types.ts`:

   ```ts
   interface ToolDescriptor {
     name: string;
     summary: string;
     description: string;
     inputSchema: JsonSchema;
     parametersText: string; // space-joined parameter names for BM25/search
     source: ToolSource;
     loadMode: ToolLoadMode;
   }
   ```

2. **Convert Zod → JSON Schema at registration time.** Extract parameter names into
   `parametersText`. Built-in tools use `zod-to-json-schema` (already a dependency).

3. **Update `tool-index.ts`** to consume `ToolDescriptor[]` instead of separate MCP/built-in
   indexing paths. `parametersText` feeds BM25 search.

4. **Add tests** proving built-in tool parameter names appear in search results.

### Acceptance

- Built-in tool parameters are searchable via the tool discovery index.
- Tool rendering, forcing, and documentation consume the same descriptor shape.

---

## 4. Split `AgentSession` into focused controllers (item 13)

**Target:** `packages/coding-agent/src/session/agent-session.ts` (~9500 lines)

### Problem

`AgentSession` owns turn lifecycle, queueing, model state, tool registry, MCP refresh,
slash commands, warnings, and UI-facing state. This concentrates unrelated responsibilities,
makes global-state bugs easier, and makes the class hard to test or modify.

### Plan

1. **Extract `TurnRunner`:**
   - Owns: active turn state, cancellation, turn budget lifecycle, queued prompt logic
   - Receives: prompt text, images, options
   - Interface: `queue(prompt)`, `cancel()`, `get activeTurn`

2. **Extract `ToolRegistryController`:**
   - Owns: built-in tool map, MCP tool refresh, active tool selection, force-tool state
   - Receives: tool definitions from built-in and MCP sources
   - Interface: `registerBuiltin(tools)`, `refreshMcp(tools)`, `getActiveNames()`, `getAll()`

3. **Extract `CommandRegistryController`:**
   - Owns: slash commands, MCP prompt commands, custom commands list
   - Receives: file commands, MCP prompts, custom commands
   - Interface: `replaceSource(sourceId, commands)`, `snapshot()`, `findByName(name)`

4. **Keep `AgentSession` as public facade.** Internal delegation to controllers, public API
   unchanged.

5. **Add focused lifecycle tests** per controller. Test turn isolation independently of tool
   registration.

### Acceptance

- Per-turn mutable state lives in `TurnRunner`, not global session fields.
- Public `AgentSession` behavior is compatible — existing callers work without change.
- Each controller can be tested in isolation.

---

## 5. Reduce mode-specific command implementations (item 14)

**Target files:** `builtin-registry.ts`, `helpers/*`, mode adapters in `packages/coding-agent/src/modes`

### Problem

Slash command business logic is partially duplicated between TUI, ACP, and other runtime
adapters. Commands like `/mcp`, `/plugins`, `/marketplace`, and `/todo` have both `handle`
and `handleTui` paths with different side effects.

### Plan

1. **Define single command execution contract:**

   ```ts
   interface SlashCommandHandler {
     execute(parsed: ParsedSlashCommand, runtime: SlashCommandRuntime): Promise<SlashCommandResult>;
   }
   ```

2. **Keep UI-only behavior behind optional runtime capabilities:**
   - `runtime.openSelector(...)` — for TUI selectors
   - `runtime.openBrowser(...)` — for OAuth flows
   - `runtime.promptForInput(...)` — for interactive input

   When a TUI-only action is called from ACP, fail with an explicit capability error.

3. **Move duplicated switch logic into shared handlers.** The `handleMcpAcp` and TUI MCP
   handler should delegate to the same core function, differing only in runtime adapter.

4. **Add parity tests** for ACP and TUI command effects where both modes support the command.
   Test that `/mcp add` in ACP and TUI produce the same config file mutations.

### Acceptance

- Supported command mutations have the same side effects in TUI and ACP.
- Unsupported mode-specific actions fail with explicit capability errors, not silent no-ops.

---

## 6. Explicit plugin capability permissions (item 16)

**Target dirs:** `packages/coding-agent/src/extensibility`, `packages/coding-agent/src/discovery`,
plugin/marketplace management code.

### Problem

Plugins can contribute tools, hooks, commands, MCP servers, skills, and agents without one
clearly enforced permission model. Plugin manifests don't declare their capability surface,
and there's no way to enable/disable capability groups per plugin.

### Plan

1. **Extend `PluginManifest`** with a `capabilities` field:

   ```ts
   interface PluginCapabilitySet {
     tools?: boolean;
     hooks?: boolean;
     commands?: boolean;
     mcp?: boolean;
     skills?: boolean;
     agents?: boolean;
     rules?: boolean;
     prompts?: boolean;
   }
   ```

2. **Record enabled capability subsets per plugin** in `config.plugins[<id>].enabledCapabilities`.

3. **Define risk levels:**
   - Low: rules, prompts
   - Medium: tools, commands, skills, agents
   - High: hooks, MCP, process-spawning tools
   - High-risk capabilities require `--trust-plugin` or explicit user opt-in on first activation.

4. **Wire into discovery.** Providers check capability flags before surfacing
   plugin contributions.

5. **Surface in diagnostics.** Plugin listing shows which capabilities each plugin contributes
   and whether they're active.

6. **Add tests** for enabling/disabling individual capability groups and trust prompts.

### Acceptance

- A plugin cannot silently activate a high-risk capability outside its enabled set.
- Users can inspect which plugin contributed each runtime capability.
- First activation of a high-risk capability prompts for trust confirmation.

---

## 7. Contract-level lifecycle tests (item 18)

**Target:** `packages/coding-agent/test/`

### Contracts to test

| Contract | Why |
|---|---|
| Queued prompt budgets do not affect active turns | Regression for Phase 1 fix |
| Plugin install/enable/disable updates live commands/tools | Phase 2 invariant |
| MCP add/remove/enable/reload updates live tools/prompts | Phase 2 invariant |
| Full MCP disconnect clears MCP prompt slash commands | Phase 1 fix |
| Aborted command execution cannot be treated as success | Phase 1 fix |
| Current-format config visible to extension discovery after reload | Phase 1 fix |
| Search regex syntax consistent across filesystem and virtual resources | Phase 3 fix |
| TUI sanitizer strips control sequences and preserves width constraints | Phase 1 fix |

### Plan

1. **Create `packages/coding-agent/test/lifecycle/` directory.**

2. **Add one test file per contract group:**
   - `turn-budget.test.ts`
   - `plugin-reload.test.ts`
   - `mcp-reload.test.ts`
   - `exec-result.test.ts`
   - `extension-discovery.test.ts`
   - `search-regex.test.ts`
   - `tui-sanitizer.test.ts`

3. **Write real integration tests** that create a minimal `AgentSession`, perform the
   mutation, and assert the observable effect. No mocks for core state.

4. **Wire into CI** via `bun test packages/coding-agent/test/lifecycle/`.

### Acceptance

- Each test protects an externally observable behavior or lifecycle invariant.
- Tests pass in the full package suite without mutating shared global state.

---

## 8. Architecture notes near load-bearing code (item 19)

**Target:** Inline JSDoc and file-level comments near critical areas.

### Areas to document

| Area | File | What to document |
|---|---|---|
| Turn lifecycle | `agent-session.ts` (prompt method) | Who owns budget, cancellation, queuing. What must be true after prompt returns. |
| Runtime reload | `runtime-reload.ts`, `agent-session.ts` | Which surfaces are refreshed, in what order, what is not refreshed (MCP). |
| Discovery/config precedence | `discovery/omp-extension-roots.ts` | Order: CLI → project config.yml → project settings.json → user config.yml → user settings.json → installed plugins. |
| MCP lifecycle | `mcp/manager.ts`, `sdk.ts` | Connect → tools → prompts → disconnect → cleanup. What callbacks fire when. |
| Plugin capability lifecycle | `extensibility/plugins/manager.ts` | Install → activate → contribute → disable → remove → cleanup. Which registries are touched. |

### Plan

1. **Add file-level JSDoc** at the top of each target file describing its role in the broader
   lifecycle.

2. **Add method-level comments** on key methods documenting invariants and postconditions.

3. **Avoid historical narrative.** Document what must be true now, not how we got here.

### Acceptance

- Maintainers can identify the owner and teardown path for each major runtime surface from
  comments alone.

---

## Recommended execution order

1. Item 19 (architecture notes) — low-risk, clarifies code for other items.
2. Item 11 (tool descriptors) — focused, enables better discovery for later items.
3. Item 9 (normalize capabilities) — enables item 10 and 16.
4. Item 10 (source-aware registries) — enables clean reload/disconnect in items 5 and 6.
5. Item 5 (unify command implementations) — depends on item 10 for command source management.
6. Item 13 (split AgentSession) — last, depends on items 5, 10, and controller interfaces.
7. Item 16 (plugin permissions) — can run in parallel with items 5/13.
8. Item 18 (lifecycle tests) — add incrementally after each item.

---

## Done definition

This plan is complete when all eight items above satisfy their acceptance criteria and
`bun run check` passes clean on `packages/coding-agent`.
