import type { Model } from "@oh-my-pi/pi-ai";
import type { ModelRegistry } from "../config/model-registry";
import { type ModelMatchPreferences, resolveAllowedModels, resolveModelRoleValue } from "../config/model-resolver";
import type { Settings } from "../config/settings";
import type { Skill } from "../extensibility/skills";

export type ModelTier = "haiku" | "sonnet" | "opus";
export type ScienceTierEnforcement = "warn" | "block";
export type ScienceContextKind = "scientific-command" | "scientific-prompt" | "scientific-skills";

export interface ScienceContext {
	kind: ScienceContextKind;
	reason: string;
}

export interface ScienceTierDecision {
	enforcement: ScienceTierEnforcement;
	message: string;
	context: ScienceContext;
	tier: ModelTier;
	minTier: ModelTier;
}

const SCIENCE_PROMPT_MARKERS = [
	"scidekick",
	"scientific",
	"science",
	"research",
	"hypothesis",
	"experiment",
	"evidence",
	"literature",
	"paper",
	"protocol",
];

const SCIENCE_SKILL_PREFIXES = ["scientific-", "research-", "hypothesis-", "paper-", "scholar-", "bgpt-"] as const;

const SCIENCE_SKILL_NAMES = new Set([
	"citation-management",
	"database-lookup",
	"literature-review",
	"open-notebook",
	"paperzilla",
	"peer-review",
	"pyzotero",
	"research-lookup",
	"scientific-writing",
]);

export const MIN_SCIENCE_MODEL_TIER_KEY = "minScienceModelTier" as const;
export const TIER_ENFORCEMENT_KEY = "scienceTierEnforcement" as const;
export const DEFAULT_MIN_SCIENCE_TIER: ModelTier = "sonnet";
export const DEFAULT_TIER_ENFORCEMENT: ScienceTierEnforcement = "warn";

export function classifyModelTier(model: Pick<Model, "id" | "provider">): ModelTier {
	const id = model.id.toLowerCase();
	const provider = model.provider.toLowerCase();
	if (/opus/i.test(id)) return "opus";
	if (/^claude-4/.test(id)) return "opus";
	if (/^gpt-5/.test(id) && !/(?:^|-)mini\b/.test(id) && !/(?:^|-)nano\b/.test(id)) return "opus";
	if (/gemini-.*ultra/i.test(id)) return "opus";
	if (/grok-3/.test(id)) return "opus";

	if (/haiku/i.test(id)) return "haiku";
	if (/flash/i.test(id) && !/flash.*(?:thinking|pro)/i.test(id)) return "haiku";
	if (/(?:^|-)mini\b/i.test(id) && !/pro/i.test(id)) return "haiku";
	if (/(?:^|-)nano\b/i.test(id)) return "haiku";
	if (/(?:^|-)lite\b/i.test(id) && !/pro/i.test(id)) return "haiku";
	if (/(?:^|-)8b\b/.test(id) || /(?:^|-)9b\b/.test(id)) return "haiku";
	if (/(?:^|-)7b\b/.test(id) || /(?:^|-)3b\b/.test(id)) return "haiku";
	if (/gpt-3\.5/.test(id)) return "haiku";
	if (/gpt-4(?:\.1)?-mini/.test(id)) return "haiku";
	if (/claude-instant/i.test(id)) return "haiku";
	if (/command-r\b/i.test(id) && !/command-r-plus/i.test(id)) return "haiku";
	if (/codestral/i.test(id) && !/codestral-pro/i.test(id)) return "haiku";
	if (provider === "ollama" && /(?:^|-)\d+b(?![+-])/.test(id)) {
		const match = id.match(/(\d+)b/);
		if (match && Number.parseInt(match[1], 10) < 20) return "haiku";
	}
	return "sonnet";
}

export function meetsScienceTier(model: Pick<Model, "id" | "provider">, minTier: ModelTier): boolean {
	const rank: Record<ModelTier, number> = { haiku: 0, sonnet: 1, opus: 2 };
	return rank[classifyModelTier(model)] >= rank[minTier];
}

export function detectScienceContext(options: {
	command?: "wiki" | "journal" | "install-skills";
	systemPrompt?: string;
	appendSystemPrompt?: string;
	skills?: readonly Pick<Skill, "name">[];
}): ScienceContext | null {
	if (options.command === "wiki") {
		return { kind: "scientific-command", reason: "scientific wiki command" };
	}
	if (options.command === "journal") {
		return { kind: "scientific-command", reason: "scientific journal command" };
	}
	if (options.command === "install-skills") {
		return { kind: "scientific-command", reason: "scientific skill installation command" };
	}
	if (
		containsScientificPromptContent(options.systemPrompt) ||
		containsScientificPromptContent(options.appendSystemPrompt)
	) {
		return { kind: "scientific-prompt", reason: "scientific system prompt" };
	}
	if ((options.skills ?? []).some(skill => isScientificSkillName(skill.name))) {
		return { kind: "scientific-skills", reason: "scientific skills loaded" };
	}
	return null;
}

export function evaluateScienceTierDecision(options: {
	context: ScienceContext | null;
	model: (Pick<Model, "id" | "provider"> & { name?: string }) | undefined;
	minTier: ModelTier;
	enforcement: ScienceTierEnforcement;
}): ScienceTierDecision | null {
	if (!options.context || !options.model) return null;
	if (meetsScienceTier(options.model, options.minTier)) return null;
	const tier = classifyModelTier(options.model);
	const name = options.model.name?.trim() || options.model.id;
	const effectiveEnforcement = options.context.kind === "scientific-command" ? "warn" : options.enforcement;
	return {
		context: options.context,
		enforcement: effectiveEnforcement,
		tier,
		minTier: options.minTier,
		message:
			`${name} (${options.model.provider}/${options.model.id}) is classified as ${tier}-tier, below the configured ${options.minTier}-tier minimum for ${options.context.reason}. ` +
			`AutoScientists 2026 found sub-Sonnet models unreliable for scientific reasoning. ` +
			(effectiveEnforcement === "block"
				? `This run is blocked. Lower ${MIN_SCIENCE_MODEL_TIER_KEY} or change ${TIER_ENFORCEMENT_KEY} to "warn" if you intend to proceed.`
				: `Switch to a stronger model or set ${TIER_ENFORCEMENT_KEY} to "block" for stricter enforcement.`),
	};
}

export async function resolveConfiguredScienceModel(
	settings: Settings,
	modelRegistry: Pick<ModelRegistry, "getAvailable" | "getCanonicalVariants">,
): Promise<Model | undefined> {
	const preferences: ModelMatchPreferences = {
		usageOrder: settings.getStorage()?.getModelUsageOrder(),
	};
	const allowedModels = await resolveAllowedModels(modelRegistry, settings, preferences);
	const defaultRoleSpec = resolveModelRoleValue(settings.getModelRole("default"), allowedModels, {
		settings,
		matchPreferences: preferences,
		modelRegistry,
	});
	return defaultRoleSpec.model ?? allowedModels[0];
}

export function getConfiguredScienceTierSettings(settings: Settings): {
	minTier: ModelTier;
	enforcement: ScienceTierEnforcement;
} {
	return {
		minTier: settings.get(MIN_SCIENCE_MODEL_TIER_KEY),
		enforcement: settings.get(TIER_ENFORCEMENT_KEY),
	};
}

function containsScientificPromptContent(content: string | undefined): boolean {
	if (!content) return false;
	const lower = content.toLowerCase();
	if (lower.includes("scidekick")) return true;
	let matches = 0;
	for (const marker of SCIENCE_PROMPT_MARKERS) {
		if (lower.includes(marker)) {
			matches++;
			if (matches >= 2) return true;
		}
	}
	return false;
}

function isScientificSkillName(name: string): boolean {
	const lower = name.trim().toLowerCase();
	if (SCIENCE_SKILL_NAMES.has(lower)) return true;
	return SCIENCE_SKILL_PREFIXES.some(prefix => lower.startsWith(prefix));
}
