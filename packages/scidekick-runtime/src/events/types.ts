export const RESEARCH_EVENT_KINDS = [
	"state_transition",
	"tool_call",
	"tool_result",
	"tool_error",
	"diff",
	"claim_update",
	"evidence_summary",
	"review_issue",
	"review_round",
	"handoff",
	"run_summary",
	"message",
] as const;

export type ResearchEventKind = (typeof RESEARCH_EVENT_KINDS)[number];

export type ResearchActorRole = "user" | "research_agent" | "reviewer" | "tool" | "system" | "handoff_target";

export interface ResearchActor {
	id: string;
	role: ResearchActorRole;
	label?: string;
}

export type ResearchSeverity = "info" | "warning" | "error" | "blocked";

export type ResearchSupportLevel = "unsupported" | "hypothesis" | "weak" | "moderate" | "strong" | "contradicted";

export type ResearchReferenceType =
	| "artifact"
	| "claim"
	| "decision"
	| "evidence"
	| "file"
	| "review_issue"
	| "review_round"
	| "run"
	| "session"
	| "trace"
	| "url";

export interface ResearchReference {
	type: ResearchReferenceType;
	id: string;
	label?: string;
	path?: string;
	url?: string;
}

export interface RawArtifactPointer {
	id: string;
	path: string;
	mediaType: string;
	byteLength?: number;
	sha256?: string;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
	[key: string]: JsonValue;
}

export type ResearchEventBody = string | JsonObject;

export type ResearchPhase =
	| "initialized"
	| "planning"
	| "gated"
	| "executing"
	| "reviewing"
	| "summarizing"
	| "complete"
	| "blocked"
	| "paused"
	| "failed";

export interface ResearchTranscriptEventBase {
	id: string;
	sessionId: string;
	runId?: string;
	traceId?: string;
	timestamp: string;
	sequence: number;
	kind: ResearchEventKind;
	actor?: ResearchActor;
	title?: string;
	body?: ResearchEventBody;
	references?: ResearchReference[];
	severity?: ResearchSeverity;
	supportLevel?: ResearchSupportLevel;
	rawArtifact?: RawArtifactPointer;
}

export interface StateTransitionEvent extends ResearchTranscriptEventBase {
	kind: "state_transition";
	body?:
		| string
		| {
				from?: ResearchPhase;
				to: ResearchPhase;
				reason?: string;
		  };
}

export interface ToolCallEvent extends ResearchTranscriptEventBase {
	kind: "tool_call";
}

export interface ToolResultEvent extends ResearchTranscriptEventBase {
	kind: "tool_result";
}

export interface ToolErrorEvent extends ResearchTranscriptEventBase {
	kind: "tool_error";
	severity: "error";
}

export interface DiffEvent extends ResearchTranscriptEventBase {
	kind: "diff";
	body: string;
}

export interface ClaimUpdateEvent extends ResearchTranscriptEventBase {
	kind: "claim_update";
	supportLevel: ResearchSupportLevel;
}

export interface EvidenceSummaryEvent extends ResearchTranscriptEventBase {
	kind: "evidence_summary";
}

export interface ReviewIssueEvent extends ResearchTranscriptEventBase {
	kind: "review_issue";
}

export interface ReviewRoundEvent extends ResearchTranscriptEventBase {
	kind: "review_round";
}

export interface HandoffEvent extends ResearchTranscriptEventBase {
	kind: "handoff";
}

export interface RunSummaryEvent extends ResearchTranscriptEventBase {
	kind: "run_summary";
}

export interface MessageEvent extends ResearchTranscriptEventBase {
	kind: "message";
}

export type ResearchTranscriptEvent =
	| StateTransitionEvent
	| ToolCallEvent
	| ToolResultEvent
	| ToolErrorEvent
	| DiffEvent
	| ClaimUpdateEvent
	| EvidenceSummaryEvent
	| ReviewIssueEvent
	| ReviewRoundEvent
	| HandoffEvent
	| RunSummaryEvent
	| MessageEvent;
