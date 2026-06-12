import type { RawArtifactPointer, ResearchReference } from "./types";

export type ResearchRenderProfile = "plain" | "compact" | "rich";

export interface CopySafeRenderResult {
	text: string;
	profile: ResearchRenderProfile;
	eventIds: string[];
	referenceIds: string[];
	omittedArtifacts: RawArtifactPointer[];
	includesTerminalChrome: boolean;
	warnings?: string[];
}

export interface ResearchExportReferenceSet {
	runs: string[];
	traces: string[];
	claims: string[];
	evidence: string[];
	reviewRounds: string[];
	reviewIssues: string[];
	rawArtifacts: string[];
}

export interface ResearchExportManifest {
	exportId: string;
	sessionId: string;
	profile: ResearchRenderProfile;
	createdAt: string;
	eventRange: {
		firstSequence: number;
		lastSequence: number;
	};
	sourceEventLog: string;
	renderedPath: string;
	references: ResearchExportReferenceSet;
	includesTerminalChrome?: boolean;
	statusMetadata?: ResearchReference[];
}
