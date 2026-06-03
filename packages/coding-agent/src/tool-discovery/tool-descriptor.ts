import type { TJsonSchema } from "@oh-my-pi/pi-ai";

// ─── Tool Descriptor (canonical internal representation) ──────────────────────

export type ToolSource = "builtin" | "mcp" | "extension" | "custom";

export type ToolLoadMode =
	| "always" /** always loaded and active */
	| "gated" /** loaded only when explicitly forced or discovered */
	| "on-demand"; /** lazy-loaded on first use */

/**
 * Canonical tool metadata used by discovery, rendering, forcing, and
 * documentation. Every tool — built-in, MCP, custom, or extension — is
 * normalized into this shape at registration time so consumers work with
 * one representation.
 */
export interface ToolDescriptor {
	/** Unique tool name as seen by the model (e.g. "read", "bash"). */
	name: string;
	/** Human-readable label for UI. */
	label: string;
	/** Short description for tool-tip / help. */
	summary: string;
	/** Full description shown to the model in the system prompt. */
	description: string;
	/** JSON Schema of the tool's input parameters. */
	inputSchema: TJsonSchema;
	/** Space-joined parameter names for BM25 indexing and search. */
	parametersText: string;
	/** Where this tool came from. */
	source: ToolSource;
	/** How this tool is loaded. */
	loadMode: ToolLoadMode;
	/** MCP server name (MCP tools only). */
	serverName?: string;
	/** Original MCP-side tool name before `mcp__` prefixing (MCP tools only). */
	mcpToolName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Produce a stable searchable string from parameter schema keys.
 * Used by built-in and custom tools at registration time so the discovery
 * index can surface parameter-aware results.
 */
export function buildParametersText(schema: TJsonSchema): string {
	if (!schema || typeof schema !== "object" || Array.isArray(schema)) return "";
	const props = (schema as { properties?: Record<string, unknown> }).properties;
	if (!props || typeof props !== "object") return "";
	return Object.keys(props).sort().join(" ");
}
