# AgentSession Public API Contract

Every method and getter listed below must survive the `Split AgentSession` refactor
with the identical signature and observable behavior. This is the contract
checklist for Session 4 (Facade Wiring).

Generated from `packages/coding-agent/src/session/agent-session.ts` (commit a36c881f6).

---

## Construction

```ts
constructor(config: AgentSessionConfig): AgentSession
```

Callers: `sdk.ts` (`createAgentSessionInternal`), tests.

---

## Turn execution

```ts
prompt(text: string, images?: ImageInput[], options?: PromptOptions): Promise<void>
```
Callers: TUI mode (`handleUserInput`), ACP mode (`sessionUpdate` handler),
print mode, slash commands (`/compact`, `/thinking`).

```ts
sendCustomMessage(message: CustomMessage, options?: { deliverAs?: "steer" | "followUp" }): Promise<void>
```
Callers: `agent-session.ts` internal (keyword notices), `sdk.ts` (system messages).

```ts
get isStreaming(): boolean
```
Callers: TUI mode (rendering guards), ACP mode (prompt queuing).

---

## Model and thinking

```ts
get model(): Model
setModel(model: Model, thinkingLevel?: ThinkingLevel): void
resolveRoleModel(role: string): Model | undefined
resolveRoleModelWithThinking(role: string): ResolvedModelRoleValue
getThinkingLevels(): ThinkingLevel[]
```
Callers: TUI mode (`/model`, `/thinking`), ACP mode, settings update, `sdk.ts`.

---

## Tool management

```ts
refreshMCPTools(tools: MCPTool[]): void
refreshSshTool(opts?: { activateIfAvailable?: boolean }): Promise<void>
getActiveTools(): Map<string, AgentTool>
```
Callers: `sdk.ts` (MCP connect callback), TUI mode (settings update), `slash-commands` (`/tools`).

---

## Command management

```ts
setSlashCommands(slashCommands: FileSlashCommand[]): void
setMCPPromptCommands(commands: LoadedCustomCommand[]): void
get customCommands(): ReadonlyArray<LoadedCustomCommand>
get commandRegistrySnapshot(): ReadonlyArray<LoadedCustomCommand>
```
Callers: `sdk.ts` (MCP prompts callback, extension loading), `builtin-registry.ts` (TUI command refresh).

---

## Compaction

```ts
async requestCompaction(reason: CompactionReason): Promise<void>
get hasPendingCompaction(): boolean
```
Callers: TUI mode (`/compact`), ACP mode.

---

## Session management

```ts
get sessionId(): string
get sessionName(): string
setSessionName(name: string): void
async saveSession(): Promise<void>
async switchSession(targetSessionId: string): Promise<void>
async forkSession(newName: string): Promise<AgentSession>
async dispose(): Promise<void>
```
Callers: TUI mode (`/session`, `/fork`), ACP mode, `sdk.ts`, `main.ts`.

---

## Reload

```ts
async reloadRuntime(opts: RuntimeReloadOptions): Promise<void>
```
Callers: `builtin-registry.ts` (TUI reload), `acp-agent.ts` (ACP reload).

---

## Settings and state

```ts
updateSettings(settings: Partial<AgentSettings>): void
getSettings(): AgentSettings
configWarnings: string[]
```
Callers: TUI mode (`/settings`, `/config`), ACP mode.

---

## Extension runner and skills

```ts
get extensionRunner(): ExtensionRunner
get skills(): Skill[]
get skillsSettings(): SkillsSettings | undefined
```
Callers: `sdk.ts`, `builtin-registry.ts`, skill loading pipeline.

---

## Event subscriptions

```ts
onToolCall(listener: ToolCallListener): () => void
onModelResponse(listener: ModelResponseListener): () => void
onSessionEvent(listener: SessionEventListener): () => void
```
Callers: `sdk.ts`, TUI mode.

---

## Bash

```ts
async executeBash(command: string, options?: BashOptions): Promise<BashResult>
```
Callers: TUI mode (inline bash), ACP mode.

---

## Internal (callable from tests / sdk.ts only)

```ts
setPromptTemplates(templates: PromptTemplate[]): void
evaluateInEvalKernel(expression: string, language: "py" | "js"): Promise<unknown>
```
Callers: `sdk.ts`, tests.

---

## Refactor checklist (Session 4 verification)

For each method above, verify after wiring:

- [ ] Signature unchanged (parameter names, types, return type).
- [ ] Delegates to the correct controller.
- [ ] Observable behavior matches pre-refactor in at least one manual test.
- [ ] Error behavior (throws, async rejections) matches pre-refactor.
