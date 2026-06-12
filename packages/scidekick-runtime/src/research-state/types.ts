export const RESEARCH_WORKFLOW_PHASES = [
	"intake",
	"scope",
	"evidence_review",
	"hypothesis",
	"plan",
	"preregister",
	"execute",
	"analyze",
	"critique",
	"peer_review",
	"claim_review",
	"publish_or_archive",
] as const;

export type ResearchWorkflowPhase = (typeof RESEARCH_WORKFLOW_PHASES)[number];

export type ResearchGateState = "satisfied" | "missing" | "blocked";

export interface ResearchGateStatus {
	id: string;
	label: string;
	state: ResearchGateState;
	requiredFor: ResearchWorkflowPhase;
	detail?: string;
}

export interface ResearchPlanRecord {
	id: string;
	sessionId: string;
	title: string;
	objective: string;
	expectedEvidence: string[];
	successCriteria: string[];
	stopCondition: string;
	rollbackPlan: string;
	status: "draft" | "preregistered" | "approved" | "blocked";
	createdAt: string;
	updatedAt: string;
}

export type ClaimSupportLevel =
	| "unverified"
	| "observed"
	| "replicated"
	| "ablation_supported"
	| "externally_validated"
	| "rejected";

export interface ClaimRecord {
	id: string;
	title: string;
	statement: string;
	supportLevel: ClaimSupportLevel;
	scope: string;
	evidenceIds: string[];
	counterEvidenceIds: string[];
	sourcePaperIds: string[];
	runIds: string[];
	traceIds: string[];
	critiqueIds: string[];
	humanDecisionIds: string[];
	limitations: string[];
	updatedAt: string;
}

export interface EvidenceRecord {
	id: string;
	kind: "paper" | "run" | "trace" | "artifact" | "human_review" | "external";
	summary: string;
	sourceUri: string;
	strength: "weak" | "moderate" | "strong";
	limitations: string[];
	observedAt: string;
}

export interface ResearchSessionState {
	schemaVersion: 1;
	sessionId: string;
	objective: string;
	phase: ResearchWorkflowPhase;
	createdAt: string;
	updatedAt: string;
	nextSequence: number;
	currentPlanId?: string;
	gates: ResearchGateStatus[];
	plans: ResearchPlanRecord[];
	claims: ClaimRecord[];
	evidence: EvidenceRecord[];
}

export interface ResearchProjectSessionSummary {
	sessionId: string;
	objective: string;
	phase: ResearchWorkflowPhase;
	createdAt: string;
	updatedAt: string;
	currentPlanId?: string;
}

export interface ResearchProjectState {
	schemaVersion: 1;
	currentSessionId?: string;
	sessions: ResearchProjectSessionSummary[];
}
