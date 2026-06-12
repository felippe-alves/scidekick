import type {
	CopySafeRenderResult,
	ResearchExportManifest,
	ResearchRenderProfile,
	ResearchStatusSegment,
	ResearchTranscriptEvent,
} from "@scidekick/runtime";
import { renderPlainResearchEvents } from "../render/plain-renderer";

export interface CreateResearchTranscriptExportOptions {
	events: readonly ResearchTranscriptEvent[];
	profile?: ResearchRenderProfile;
	statusSegments?: readonly ResearchStatusSegment[];
	exportId?: string;
	createdAt?: string;
	sourceEventLog?: string;
	renderedPath?: string;
	includeStatusChrome?: boolean;
}

export interface ResearchTranscriptExport {
	rendered: CopySafeRenderResult;
	manifest: ResearchExportManifest;
}

export function createResearchTranscriptExport(
	options: CreateResearchTranscriptExportOptions,
): ResearchTranscriptExport {
	const rendered = renderPlainResearchEvents(options.events);
	const manifest: ResearchExportManifest = {
		exportId: options.exportId ?? "export_research_transcript",
		sessionId: options.events[0]?.sessionId ?? "unknown_session",
		profile: "plain",
		createdAt: options.createdAt ?? new Date().toISOString(),
		eventRange: {
			firstSequence: options.events[0]?.sequence ?? 0,
			lastSequence: options.events[options.events.length - 1]?.sequence ?? 0,
		},
		sourceEventLog: options.sourceEventLog ?? ".sk/research/sessions/unknown_session/events.jsonl",
		renderedPath: options.renderedPath ?? ".sk/research/exports/export_research_transcript.md",
		references: collectManifestReferences(options.events),
		includesTerminalChrome: options.includeStatusChrome === true,
		statusMetadata:
			options.includeStatusChrome === true ? statusSegmentsToMetadata(options.statusSegments ?? []) : undefined,
	};

	return { rendered, manifest };
}

export async function exportResearchTranscriptFromEventLog(options: {
	events: readonly ResearchTranscriptEvent[];
	exportId?: string;
	createdAt?: string;
	sourceEventLog?: string;
	renderedPath?: string;
}): Promise<ResearchTranscriptExport> {
	return createResearchTranscriptExport(options);
}

function collectManifestReferences(events: readonly ResearchTranscriptEvent[]): ResearchExportManifest["references"] {
	const runs = new Set<string>();
	const traces = new Set<string>();
	const claims = new Set<string>();
	const evidence = new Set<string>();
	const reviewRounds = new Set<string>();
	const reviewIssues = new Set<string>();
	const rawArtifacts = new Set<string>();

	for (const event of events) {
		if (event.runId) runs.add(event.runId);
		if (event.traceId) traces.add(event.traceId);
		if (event.rawArtifact) rawArtifacts.add(event.rawArtifact.id);
		for (const reference of event.references ?? []) {
			if (reference.type === "run") runs.add(reference.id);
			if (reference.type === "trace") traces.add(reference.id);
			if (reference.type === "claim") claims.add(reference.id);
			if (reference.type === "evidence") evidence.add(reference.id);
			if (reference.type === "review_round") reviewRounds.add(reference.id);
			if (reference.type === "review_issue") reviewIssues.add(reference.id);
			if (reference.type === "artifact") rawArtifacts.add(reference.id);
		}
	}

	return {
		runs: [...runs],
		traces: [...traces],
		claims: [...claims],
		evidence: [...evidence],
		reviewRounds: [...reviewRounds],
		reviewIssues: [...reviewIssues],
		rawArtifacts: [...rawArtifacts],
	};
}

function statusSegmentsToMetadata(
	statusSegments: readonly ResearchStatusSegment[],
): ResearchExportManifest["statusMetadata"] {
	return statusSegments.map(segment => ({
		type: "decision",
		id: segment.id,
		label: `${segment.label}: ${segment.value}`,
	}));
}
