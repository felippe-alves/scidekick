import { describe, expect, it } from "bun:test";
import { classifyPluginRisk, type PluginCapabilitySet } from "../src/extensibility/plugins/types";

describe("classifyPluginRisk", () => {
	it("classifies hooks OR mcp as high", () => {
		expect(classifyPluginRisk({ hooks: true })).toBe("high");
		expect(classifyPluginRisk({ mcp: true })).toBe("high");
		expect(classifyPluginRisk({ hooks: true, mcp: true, tools: true })).toBe("high");
	});

	it("classifies tools/commands/skills/agents as medium", () => {
		expect(classifyPluginRisk({ tools: true })).toBe("medium");
		expect(classifyPluginRisk({ commands: true })).toBe("medium");
		expect(classifyPluginRisk({ skills: true })).toBe("medium");
		expect(classifyPluginRisk({ agents: true })).toBe("medium");
	});

	it("classifies rules/prompts/empty as low", () => {
		expect(classifyPluginRisk({ rules: true })).toBe("low");
		expect(classifyPluginRisk({ prompts: true })).toBe("low");
		expect(classifyPluginRisk({})).toBe("low");
	});

	it("high trumps medium", () => {
		const caps: PluginCapabilitySet = { tools: true, skills: true, hooks: true };
		expect(classifyPluginRisk(caps)).toBe("high");
	});

	it("medium trumps low", () => {
		const caps: PluginCapabilitySet = { tools: true, prompts: true };
		expect(classifyPluginRisk(caps)).toBe("medium");
	});
});
