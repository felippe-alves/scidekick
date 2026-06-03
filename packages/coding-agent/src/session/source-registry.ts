/**
 * Source-aware runtime registry.
 *
 * Replaces ad-hoc array/map mutation for commands, tools, prompts, and plugin
 * contributions. Each source gets a stable ID so reload/disconnect/uninstall
 * can deterministically replace or remove only its own entries.
 *
 * ## Usage
 *
 * ```ts
 * const registry = new SourceRegistry<string>();
 * registry.replaceSource("builtin", ["/help", "/compact"]);
 * registry.replaceSource("mcp:prompts", ["/mcp-prompt-foo"]);
 * registry.removeSource("mcp:prompts"); // removes only MCP prompts
 * registry.snapshot(); // ["/help", "/compact"]
 * ```
 */
export class SourceRegistry<T> {
	readonly #sources = new Map<string, readonly T[]>();
	readonly #cache: { entries: readonly T[] } = { entries: [] };

	/** Replace all entries from a source. Pass an empty array to clear. */
	replaceSource(sourceId: string, items: readonly T[]): void {
		this.#sources.set(sourceId, items);
		this.#rebuild();
	}

	/** Remove all entries from a source. No-op if the source is not registered. */
	removeSource(sourceId: string): void {
		this.#sources.delete(sourceId);
		this.#rebuild();
	}

	/** Current snapshot in source-registration order. */
	snapshot(): readonly T[] {
		return this.#cache.entries;
	}

	/** Number of active sources. */
	get sourceCount(): number {
		return this.#sources.size;
	}

	/** Check if a specific source is registered. */
	hasSource(sourceId: string): boolean {
		return this.#sources.has(sourceId);
	}

	#rebuild(): void {
		const all: T[] = [];
		for (const items of this.#sources.values()) {
			for (const item of items) {
				all.push(item);
			}
		}
		this.#cache.entries = all;
	}
}
