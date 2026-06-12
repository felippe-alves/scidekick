import type { ResearchRenderProfile } from "@scidekick/runtime";

export interface ResolveResearchRenderProfileOptions {
	explicitProfile?: ResearchRenderProfile;
	isInteractive: boolean;
	configuredInteractiveDefault?: ResearchRenderProfile;
}

export function resolveResearchRenderProfile(options: ResolveResearchRenderProfileOptions): ResearchRenderProfile {
	if (options.explicitProfile) return options.explicitProfile;
	if (!options.isInteractive) return "plain";
	return options.configuredInteractiveDefault ?? "compact";
}
