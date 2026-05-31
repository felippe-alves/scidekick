import { getProjectDir } from "@oh-my-pi/pi-utils";
import { ModelRegistry } from "../config/model-registry";
import { Settings } from "../config/settings";
import { discoverAuthStorage } from "../sdk";
import {
	detectScienceContext,
	evaluateScienceTierDecision,
	getConfiguredScienceTierSettings,
	resolveConfiguredScienceModel,
} from "./model-tier";

export async function getScientificCommandTierWarning(command: "wiki" | "install-skills"): Promise<string | null> {
	const settings = await Settings.init({ cwd: getProjectDir() });
	const authStorage = await discoverAuthStorage();
	const modelRegistry = new ModelRegistry(authStorage);
	const model = await resolveConfiguredScienceModel(settings, modelRegistry);
	const decision = evaluateScienceTierDecision({
		context: detectScienceContext({ command }),
		model: model
			? {
					id: model.id,
					provider: model.provider,
					name: model.name,
				}
			: undefined,
		...getConfiguredScienceTierSettings(settings),
	});
	return decision?.message ?? null;
}
