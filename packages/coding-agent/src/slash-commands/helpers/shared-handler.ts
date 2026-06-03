import type { ParsedSlashCommand } from "../types";

/**
 * Shared handler contract. Every slash command should implement one `execute`
 * method. TUI adapters call it through {@link tuiAdapter}; ACP calls it directly.
 *
 * Implementations MUST NOT depend on TUI-only state (selectors, editor,
 * status line). UI concerns go in the caller-provided `Runtime` adapter.
 */
export interface SharedCommandHandler<Runtime> {
	execute(parsed: ParsedSlashCommand, runtime: Runtime): Promise<string | boolean>;
}

/**
 * Wrap a shared handler so it works as a `handle` for ACP/text mode.
 * The runtime object is the `SlashCommandRuntime` directly — no wrapping needed.
 */
export function acpAdapter<Runtime>(handler: SharedCommandHandler<Runtime>): SharedCommandHandler<Runtime> {
	return handler;
}

/**
 * Wrap a shared handler for TUI mode. Calls `handler.execute()` and posts
 * the result text to the TUI status line.
 */
export function tuiAdapter<Runtime>(
	handler: SharedCommandHandler<Runtime>,
	postOutput: (text: string) => void,
): SharedCommandHandler<Runtime> {
	return {
		async execute(parsed, runtime) {
			const result = await handler.execute(parsed, runtime);
			if (typeof result === "string") {
				postOutput(result);
				return true;
			}
			return result;
		},
	};
}
