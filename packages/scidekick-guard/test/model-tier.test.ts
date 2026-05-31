import { describe, expect, it } from "bun:test";
import { classifyModelTier, meetsScienceTier } from "../model-tier";

// ── Tier classification ──

describe("classifyModelTier", () => {
	// ── Opus-tier ──
	it("classifies Claude Opus as opus tier", () => {
		expect(classifyModelTier({ id: "claude-opus-4-5-20250514", provider: "anthropic" })).toBe("opus");
	});
	it("classifies GPT-5 as opus tier", () => {
		expect(classifyModelTier({ id: "gpt-5", provider: "openai" })).toBe("opus");
	});
	it("classifies Gemini Ultra as opus tier", () => {
		expect(classifyModelTier({ id: "gemini-2.5-ultra", provider: "google" })).toBe("opus");
	});

	// ── Haiku-tier ──
	it("classifies Claude Haiku as haiku tier", () => {
		expect(classifyModelTier({ id: "claude-3-5-haiku-20241022", provider: "anthropic" })).toBe("haiku");
	});
	it("classifies GPT-4o-mini as haiku tier", () => {
		expect(classifyModelTier({ id: "gpt-4o-mini", provider: "openai" })).toBe("haiku");
	});
	it("classifies GPT-4.1-mini as haiku tier", () => {
		expect(classifyModelTier({ id: "gpt-4.1-mini", provider: "openai" })).toBe("haiku");
	});
	it("classifies GPT-5-nano as haiku tier", () => {
		expect(classifyModelTier({ id: "gpt-5-nano", provider: "openai" })).toBe("haiku");
	});
	it("classifies Gemini Flash as haiku tier", () => {
		expect(classifyModelTier({ id: "gemini-2.5-flash", provider: "google" })).toBe("haiku");
	});
	it("classifies Gemini Flash Thinking as sonnet tier (flash+thinking is enhanced)", () => {
		expect(classifyModelTier({ id: "gemini-2.5-flash-thinking", provider: "google" })).toBe("sonnet");
	});
	it("classifies Llama 8B as haiku tier", () => {
		expect(classifyModelTier({ id: "llama-3.2-8b", provider: "ollama" })).toBe("haiku");
	});
	it("classifies Qwen 9B as haiku tier", () => {
		expect(classifyModelTier({ id: "qwen3-9b", provider: "ollama" })).toBe("haiku");
	});
	it("classifies GPT-3.5-turbo as haiku tier", () => {
		expect(classifyModelTier({ id: "gpt-3.5-turbo", provider: "openai" })).toBe("haiku");
	});
	it("classifies Claude Instant as haiku tier", () => {
		expect(classifyModelTier({ id: "claude-instant-1.2", provider: "anthropic" })).toBe("haiku");
	});
	it("classifies Command-R (non-plus) as haiku tier", () => {
		expect(classifyModelTier({ id: "command-r", provider: "cohere" })).toBe("haiku");
	});
	it("classifies Codestral (non-pro) as haiku tier", () => {
		expect(classifyModelTier({ id: "codestral", provider: "mistral" })).toBe("haiku");
	});

	// ── Sonnet-tier (default) ──
	it("classifies Claude Sonnet as sonnet tier", () => {
		expect(classifyModelTier({ id: "claude-sonnet-4-20250514", provider: "anthropic" })).toBe("sonnet");
	});
	it("classifies GPT-4o as sonnet tier", () => {
		expect(classifyModelTier({ id: "gpt-4o", provider: "openai" })).toBe("sonnet");
	});
	it("classifies Gemini Pro as sonnet tier", () => {
		expect(classifyModelTier({ id: "gemini-2.5-pro", provider: "google" })).toBe("sonnet");
	});
	it("classifies Llama 70B as sonnet tier", () => {
		expect(classifyModelTier({ id: "llama-3.3-70b", provider: "ollama" })).toBe("sonnet");
	});
	it("classifies Qwen 35B as sonnet tier", () => {
		expect(classifyModelTier({ id: "qwen3-35b", provider: "ollama" })).toBe("sonnet");
	});
	it("classifies GPT-5-mini as haiku tier (mini override)", () => {
		expect(classifyModelTier({ id: "gpt-5-mini", provider: "openai" })).toBe("haiku");
	});
	it("classifies Command-R-Plus as sonnet tier", () => {
		expect(classifyModelTier({ id: "command-r-plus", provider: "cohere" })).toBe("sonnet");
	});
	it("classifies unknown model as sonnet tier (conservative default)", () => {
		expect(classifyModelTier({ id: "some-new-model-unknown", provider: "custom" })).toBe("sonnet");
	});
	it("classifies DeepSeek V3 as sonnet tier", () => {
		expect(classifyModelTier({ id: "deepseek-v3", provider: "deepseek" })).toBe("sonnet");
	});
});

// ── Tier enforcement ──

describe("meetsScienceTier", () => {
	it("allows opus model when minimum is sonnet", () => {
		expect(meetsScienceTier({ id: "claude-opus-4-5", provider: "anthropic" }, "sonnet")).toBe(true);
	});
	it("allows sonnet model when minimum is sonnet", () => {
		expect(meetsScienceTier({ id: "claude-sonnet-4", provider: "anthropic" }, "sonnet")).toBe(true);
	});
	it("blocks haiku model when minimum is sonnet", () => {
		expect(meetsScienceTier({ id: "claude-3-5-haiku", provider: "anthropic" }, "sonnet")).toBe(false);
	});
	it("allows haiku model when minimum is haiku", () => {
		expect(meetsScienceTier({ id: "gemini-2.5-flash", provider: "google" }, "haiku")).toBe(true);
	});
	it("blocks sonnet model when minimum is opus", () => {
		expect(meetsScienceTier({ id: "gpt-4o", provider: "openai" }, "opus")).toBe(false);
	});
	it("allows opus model when minimum is opus", () => {
		expect(meetsScienceTier({ id: "gpt-5", provider: "openai" }, "opus")).toBe(true);
	});
});
