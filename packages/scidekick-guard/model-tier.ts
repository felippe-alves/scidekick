/**
 * Model-tier classification for scientific reasoning guard.
 *
 * AutoScientists (MIMS Harvard, 2026) empirically demonstrated that
 * Haiku-class models fail catastrophically at scientific analysis —
 * they "describe instead of do" and hallucinate API unavailability.
 * Scidekick enforces a configurable minimum model tier for science tasks.
 *
 * Classification is based on model ID patterns, not hardcoded lists,
 * so new models are automatically classified.
 */

/** Runtime flag to skip tier checks (set by --no-tier-check CLI flag). */
let skipTierCheck = false;

/** Set the runtime skip flag. Call once before the interactive mode starts. */
export function setSkipTierCheck(skip: boolean): void {
	skipTierCheck = skip;
}

/** Check whether tier enforcement should be skipped for this run. */
export function shouldSkipTierCheck(): boolean {
	return skipTierCheck;
}
export type ModelTier = "haiku" | "sonnet" | "opus";

/** Setting path for the minimum model tier for scientific tasks. */
export const MIN_SCIENCE_MODEL_TIER_KEY = "minScienceModelTier" as const;
export const DEFAULT_MIN_SCIENCE_TIER: ModelTier = "sonnet";

/** Setting path for the enforcement mode. */
export const TIER_ENFORCEMENT_KEY = "scienceTierEnforcement" as const;
export type TierEnforcement = "warn" | "block";
export const DEFAULT_TIER_ENFORCEMENT: TierEnforcement = "warn";

/**
 * Classify a model into a capability tier based on model ID and provider
 * heuristics. This is intentionally conservative — unknown models default
 * to "sonnet" to avoid false positives.
 */
export function classifyModelTier(model: { id: string; provider: string }): ModelTier {
	const id = model.id.toLowerCase();
	const provider = model.provider.toLowerCase();

	// ── Opus-tier (frontier) ──
	if (/opus/i.test(id)) return "opus";
	if (/^claude-4/.test(id)) return "opus"; // Claude 4+
	if (/^gpt-5/.test(id) && !/(?:^|-)mini\b/.test(id) && !/(?:^|-)nano\b/.test(id)) return "opus";
	if (/gemini-.*ultra/i.test(id)) return "opus";
	if (/grok-3/.test(id)) return "opus";

	// ── Haiku-tier (unreliable for science) ──
	if (/haiku/i.test(id)) return "haiku";
	if (/flash/i.test(id) && !/flash.*(?:thinking|pro)/i.test(id)) return "haiku";
	if (/(?:^|-)mini\b/i.test(id) && !/pro/i.test(id)) return "haiku"; // gpt-4o-mini (not gemini)
	if (/(?:^|-)nano\b/i.test(id)) return "haiku"; // gpt-5-nano
	if (/(?:^|-)lite\b/i.test(id) && !/pro/i.test(id)) return "haiku"; // gemini-lite
	if (/(?:^|-)8b\b/.test(id) || /(?:^|-)9b\b/.test(id)) return "haiku"; // Llama/Qwen 8B–9B
	if (/(?:^|-)7b\b/.test(id) || /(?:^|-)3b\b/.test(id)) return "haiku"; // Even smaller
	if (/gpt-3\.5/.test(id)) return "haiku";
	if (/gpt-4(?:\.1)?-mini/.test(id)) return "haiku";
	if (/claude-instant/i.test(id)) return "haiku";
	if (/command-r\b/i.test(id) && !/command-r-plus/i.test(id)) return "haiku";
	if (/codestral/i.test(id) && !/codestral-pro/i.test(id)) return "haiku";
	// Provider-level defaults
	if (provider === "ollama" && /(?:^|-)\d+b(?![+-])/.test(id)) {
		const match = id.match(/(\d+)b/);
		if (match && parseInt(match[1], 10) < 20) return "haiku";
	}

	// ── Sonnet-tier (reliable for science) — everything else ──
	return "sonnet";
}

/**
 * Check whether a model meets the minimum tier for scientific tasks.
 * Returns `true` if the model is sufficient, `false` if it's below the threshold.
 */
export function meetsScienceTier(model: { id: string; provider: string }, minTier: ModelTier): boolean {
	const tier = classifyModelTier(model);
	const tiers: ModelTier[] = ["haiku", "sonnet", "opus"];
	return tiers.indexOf(tier) >= tiers.indexOf(minTier);
}

/**
 * Format a human-readable warning message for sub-tier models.
 */
export function formatTierWarning(model: { name: string; id: string; provider: string }, minTier: ModelTier): string {
	const tier = classifyModelTier(model);
	return (
		`${model.name} (${model.id}) is classified as ${tier}-tier. ` +
		`Models below ${minTier}-tier are known to produce unreliable results for scientific analysis ` +
		`(AutoScientists 2026). Consider switching to a Sonnet-class model or higher.`
	);
}
