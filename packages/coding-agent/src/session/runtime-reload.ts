/**
 * Runtime reload options.
 *
 * Every mode (TUI, ACP, print) should call the same `reloadRuntime` method
 * with mode-specific flags instead of maintaining separate reload hacks.
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
