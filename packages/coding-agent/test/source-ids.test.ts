import { describe, expect, it } from "bun:test";
import { SOURCE_IDS } from "../src/session/source-ids";
import { SourceRegistry } from "../src/session/source-registry";

describe("SourceRegistry isolation (integration)", () => {
	it("removing MCP_PROMPTS leaves CUSTOM_COMMANDS intact", () => {
		const registry = new SourceRegistry<string>();
		registry.replaceSource(SOURCE_IDS.CUSTOM_COMMANDS, ["/custom-a", "/custom-b"]);
		registry.replaceSource(SOURCE_IDS.MCP_PROMPTS, ["/mcp-prompt-1", "/mcp-prompt-2"]);
		registry.replaceSource(SOURCE_IDS.FILE_COMMANDS, ["/file-x"]);

		registry.removeSource(SOURCE_IDS.MCP_PROMPTS);

		expect(registry.snapshot()).toEqual(["/custom-a", "/custom-b", "/file-x"]);
	});

	it("replacing FILE_COMMANDS does not touch MCP_PROMPTS", () => {
		const registry = new SourceRegistry<string>();
		registry.replaceSource(SOURCE_IDS.FILE_COMMANDS, ["/file-1"]);
		registry.replaceSource(SOURCE_IDS.MCP_PROMPTS, ["/mcp-p"]);
		registry.replaceSource(SOURCE_IDS.FILE_COMMANDS, ["/file-2"]);

		expect(registry.snapshot()).toEqual(["/file-2", "/mcp-p"]);
	});

	it("plugin source removal is scoped", () => {
		const registry = new SourceRegistry<string>();
		const p1 = "plugin:foo";
		const p2 = "plugin:bar";
		registry.replaceSource(p1, ["/foo-cmd"]);
		registry.replaceSource(p2, ["/bar-cmd"]);
		registry.removeSource(p1);

		expect(registry.snapshot()).toEqual(["/bar-cmd"]);
		expect(registry.hasSource(p1)).toBe(false);
		expect(registry.hasSource(p2)).toBe(true);
	});
});
