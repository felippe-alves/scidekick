import type { ResearchGateStatus, ResearchPlanRecord, ResearchSessionState } from "./types";

export interface ResearchStateValidationIssue {
	path: string;
	message: string;
}

export class ResearchStateError extends Error {
	issues: ResearchStateValidationIssue[];

	constructor(message: string, issues: ResearchStateValidationIssue[] = []) {
		super(message);
		this.name = "ResearchStateError";
		this.issues = issues;
	}
}

export function assertValidResearchSessionState(value: unknown): asserts value is ResearchSessionState {
	if (!isRecord(value)) throw new ResearchStateError("Expected research session state object");
	requireNonEmptyString(value.sessionId, "$.sessionId");
	requireNonEmptyString(value.objective, "$.objective");
	requireNonEmptyString(value.phase, "$.phase");
	requireIsoTimestamp(value.createdAt, "$.createdAt");
	requireIsoTimestamp(value.updatedAt, "$.updatedAt");
	const nextSequence = value.nextSequence;
	if (typeof nextSequence !== "number" || !Number.isInteger(nextSequence) || nextSequence < 1) {
		throw new ResearchStateError("Expected positive integer nextSequence", [
			{ path: "$.nextSequence", message: "Expected positive integer" },
		]);
	}
	if (!Array.isArray(value.gates)) {
		throw new ResearchStateError("Expected gates array", [{ path: "$.gates", message: "Expected array" }]);
	}
	if (!Array.isArray(value.plans)) {
		throw new ResearchStateError("Expected plans array", [{ path: "$.plans", message: "Expected array" }]);
	}
}

export function assertValidResearchPlanDraft(
	value: unknown,
): asserts value is Omit<ResearchPlanRecord, "sessionId" | "status" | "createdAt" | "updatedAt"> {
	const issues: ResearchStateValidationIssue[] = [];
	if (!isRecord(value)) {
		throw new ResearchStateError("Expected research plan object", [{ path: "$", message: "Expected object" }]);
	}

	collectNonEmptyStringIssue(value.id, "$.id", issues);
	collectNonEmptyStringIssue(value.title, "$.title", issues);
	collectNonEmptyStringIssue(value.objective, "$.objective", issues);
	collectStringArrayIssue(value.expectedEvidence, "$.expectedEvidence", issues);
	collectStringArrayIssue(value.successCriteria, "$.successCriteria", issues);
	collectNonEmptyStringIssue(value.stopCondition, "$.stopCondition", issues);
	collectNonEmptyStringIssue(value.rollbackPlan, "$.rollbackPlan", issues);

	if (issues.length > 0) throw new ResearchStateError("Research plan is missing required execution gates", issues);
}

export function evaluateResearchSessionGates(input: {
	objective: string;
	scope?: string;
	currentPlanId?: string;
}): ResearchGateStatus[] {
	return [
		{
			id: "objective",
			label: "Objective recorded",
			state: input.objective.trim().length > 0 ? "satisfied" : "missing",
			requiredFor: "scope",
		},
		{
			id: "scope",
			label: "Scope boundaries recorded",
			state: input.scope && input.scope.trim().length > 0 ? "satisfied" : "missing",
			requiredFor: "evidence_review",
		},
		{
			id: "plan",
			label: "Plan gates recorded",
			state: input.currentPlanId ? "satisfied" : "missing",
			requiredFor: "preregister",
		},
	];
}

function requireNonEmptyString(value: unknown, path: string): void {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new ResearchStateError("Expected non-empty string", [{ path, message: "Expected non-empty string" }]);
	}
}

function requireIsoTimestamp(value: unknown, path: string): void {
	if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
		throw new ResearchStateError("Expected ISO timestamp", [{ path, message: "Expected ISO timestamp" }]);
	}
}

function collectNonEmptyStringIssue(value: unknown, path: string, issues: ResearchStateValidationIssue[]): void {
	if (typeof value !== "string" || value.trim().length === 0) {
		issues.push({ path, message: "Expected non-empty string" });
	}
}

function collectStringArrayIssue(value: unknown, path: string, issues: ResearchStateValidationIssue[]): void {
	if (
		!Array.isArray(value) ||
		value.length === 0 ||
		value.some(item => typeof item !== "string" || item.length === 0)
	) {
		issues.push({ path, message: "Expected at least one non-empty string" });
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
