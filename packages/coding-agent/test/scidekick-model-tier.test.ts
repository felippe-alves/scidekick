import { describe, expect, it } from "bun:test";
import {
	classifyModelTier,
	detectScienceContext,
	evaluateScienceTierDecision,
	meetsScienceTier,
} from "../src/scidekick/model-tier";

describe("Scidekick science model tier helpers", () => {
	it("classifies lightweight and frontier models into tiers", () => {
		expect(classifyModelTier({ id: "gpt-4o-mini", provider: "openai" })).toBe("haiku");
		expect(classifyModelTier({ id: "claude-sonnet-4-20250514", provider: "anthropic" })).toBe("sonnet");
		expect(classifyModelTier({ id: "claude-opus-4-20250514", provider: "anthropic" })).toBe("opus");
	});

	it("checks whether a model meets the configured science tier", () => {
		expect(meetsScienceTier({ id: "gpt-4o-mini", provider: "openai" }, "sonnet")).toBe(false);
		expect(meetsScienceTier({ id: "deepseek-v3", provider: "deepseek" }, "sonnet")).toBe(true);
		expect(meetsScienceTier({ id: "claude-opus-4-20250514", provider: "anthropic" }, "opus")).toBe(true);
	});

	it("detects scientific prompts from content markers", () => {
		const context = detectScienceContext({
			systemPrompt: "You are a scientific research assistant. Track hypotheses, experiments, and evidence.",
		});
		expect(context).toEqual({ kind: "scientific-prompt", reason: "scientific system prompt" });
	});

	it("detects scientific skills from known skill names", () => {
		const context = detectScienceContext({
			skills: [{ name: "literature-review" }, { name: "readme-helper" }],
		});
		expect(context).toEqual({ kind: "scientific-skills", reason: "scientific skills loaded" });
	});

	it("does not flag ordinary prompts or ordinary skills as science contexts", () => {
		expect(detectScienceContext({ systemPrompt: "You are a coding assistant for TypeScript refactors." })).toBeNull();
		expect(detectScienceContext({ skills: [{ name: "docker-helper" }, { name: "readme-helper" }] })).toBeNull();
	});

	it("warns when a science session uses a sub-tier model", () => {
		const decision = evaluateScienceTierDecision({
			context: { kind: "scientific-skills", reason: "scientific skills loaded" },
			model: { id: "gpt-4o-mini", provider: "openai", name: "GPT-4o mini" },
			minTier: "sonnet",
			enforcement: "warn",
		});
		expect(decision?.enforcement).toBe("warn");
		expect(decision?.message).toContain("scientific skills loaded");
		expect(decision?.message).toContain("haiku-tier");
	});

	it("downgrades command contexts to warnings even when global enforcement is block", () => {
		const decision = evaluateScienceTierDecision({
			context: { kind: "scientific-command", reason: "scientific wiki command" },
			model: { id: "gpt-4o-mini", provider: "openai", name: "GPT-4o mini" },
			minTier: "sonnet",
			enforcement: "block",
		});
		expect(decision?.enforcement).toBe("warn");
		expect(decision?.message).toContain("scientific wiki command");
	});

	it("blocks when a scientific launch context uses a sub-tier model under block enforcement", () => {
		const decision = evaluateScienceTierDecision({
			context: { kind: "scientific-prompt", reason: "scientific system prompt" },
			model: { id: "gpt-4o-mini", provider: "openai", name: "GPT-4o mini" },
			minTier: "sonnet",
			enforcement: "block",
		});
		expect(decision?.enforcement).toBe("block");
		expect(decision?.message).toContain("This run is blocked");
	});
});
