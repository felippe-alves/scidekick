/**
 * Stable source IDs for SourceRegistry-backed state.
 *
 * Each source ID identifies a provider of commands, tools, prompts, or other
 * registrable items. Reload/disconnect/uninstall deterministically
 * replaceSource or removeSource by these IDs.
 */
export const SOURCE_IDS = {
	/** Bundled slash commands shipped with the agent. */
	BUILTIN: "builtin",
	/** File-based slash commands from project/user discovery. */
	FILE_COMMANDS: "file-commands",
	/** TypeScript custom commands from extensions and plugins. */
	CUSTOM_COMMANDS: "custom-commands",
	/** MCP prompt slash commands (dynamically rebuilt per server). */
	MCP_PROMPTS: "mcp:prompts",
	/** MCP tool contributions. */
	MCP_TOOLS: "mcp:tools",
	/** Built-in tools (read, bash, edit, etc.). */
	BUILTIN_TOOLS: "builtin-tools",
	/** SSH tools. */
	SSH_TOOLS: "ssh-tools",
} as const;

/** Generate a per-plugin source ID. */
export function pluginSourceId(pluginName: string): string {
	return `plugin:${pluginName}`;
}
