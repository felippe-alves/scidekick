import type {
	CopySafeRenderResult,
	RawArtifactPointer,
	ResearchRenderProfile,
	ResearchTranscriptEvent,
} from "@scidekick/runtime";

export interface CopySafeRenderResultInput {
	text: string;
	profile: ResearchRenderProfile;
	events: readonly ResearchTranscriptEvent[];
	includesTerminalChrome: boolean;
	warnings?: string[];
}

export function buildCopySafeRenderResult(input: CopySafeRenderResultInput): CopySafeRenderResult {
	return {
		text: input.text,
		profile: input.profile,
		eventIds: input.events.map(event => event.id),
		referenceIds: collectReferenceIds(input.events),
		omittedArtifacts: collectOmittedArtifacts(input.events),
		includesTerminalChrome: input.includesTerminalChrome,
		warnings: input.warnings && input.warnings.length > 0 ? input.warnings : undefined,
	};
}

function collectReferenceIds(events: readonly ResearchTranscriptEvent[]): string[] {
	const ids = new Set<string>();
	for (const event of events) {
		if (event.runId) ids.add(event.runId);
		if (event.traceId) ids.add(event.traceId);
		for (const reference of event.references ?? []) {
			ids.add(reference.id);
		}
		if (event.rawArtifact) ids.add(event.rawArtifact.id);
	}
	return [...ids];
}

function collectOmittedArtifacts(events: readonly ResearchTranscriptEvent[]): RawArtifactPointer[] {
	const artifacts = new Map<string, RawArtifactPointer>();
	for (const event of events) {
		if (event.rawArtifact) artifacts.set(event.rawArtifact.id, event.rawArtifact);
	}
	return [...artifacts.values()];
}
