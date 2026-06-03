/**
 * Runtime reload contract.
 *
 * Every mode (TUI, ACP, print) calls `AgentSession.reloadRuntime()` with
 * mode-specific flags instead of maintaining separate reload paths.
 *
 * ## What is refreshed, in order
 *
 * `AgentSession.reloadRuntime()` handles:
 * 1. SSH tool refresh (if `ssh` flag)
 * 2. Discovery cache invalidation (if any of slashCommands/extensions/skills/
 *    hooks/customTools flags)
 *
 * Everything else is handled by the caller BEFORE or AFTER:
 * - **Slash commands**: file-based/custom/builtin registration — caller
 *   refreshes the UI registry.
 * - **MCP reconnect**: caller disconnects MCP manager, rediscoveres configs,
 *   reconnects servers, then calls `session.refreshMCPTools()` and
 *   `session.setMCPPromptCommands()`.
 * - **Extension reload**: caller re-runs extension discovery and rebinds
 *   skills, hooks, agents, tools.
 *
 * ## Postconditions
 *
 * - After `reloadRuntime({ ssh: true })`: SSH tool is re-registered if
 *   configuration is available; no-op otherwise.
 * - After `reloadRuntime({ slashCommands: true })`: next tool resolution
 *   queries fresh discovery indices.
 * - MCP reconnect is NOT a postcondition of this method — it is the caller's
 *   responsibility.
 */
export interface RuntimeReloadOptions {
	/** Re-discover and re-register slash commands (file-based + builtin + custom). */
	slashCommands?: boolean;
	/** Re-discover and re-load extensions (skills, hooks, agents). */
	extensions?: boolean;
	/** Re-register custom tools from extensions. */
	customTools?: boolean;
	/** Re-register lifecycle hooks. */
	hooks?: boolean;
	/** Re-discover and re-activate skills. */
	skills?: boolean;
	/** Disconnect, rediscover, and reconnect MCP servers; refresh tools/prompts. */
	mcp?: boolean;
	/** Refresh SSH tools (activate if newly available). */
	ssh?: boolean;
}

/** Shortcut: reload everything. */
export const RELOAD_ALL: RuntimeReloadOptions = {
	slashCommands: true,
	extensions: true,
	customTools: true,
	hooks: true,
	skills: true,
	mcp: true,
	ssh: true,
};
