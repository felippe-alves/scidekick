import { RESEARCH_STATUS_STATES, type ResearchStatusSegment } from "./types";

const STATUS_STATES = new Set<string>(RESEARCH_STATUS_STATES);
const MAX_LABEL_WIDTH = 16;
const MAX_VALUE_WIDTH = 80;

export interface ResearchStatusValidationIssue {
	path: string;
	message: string;
}

export interface ResearchStatusValidationResult {
	valid: boolean;
	issues: ResearchStatusValidationIssue[];
}

export class ResearchStatusValidationError extends Error {
	issues: ResearchStatusValidationIssue[];

	constructor(issues: ResearchStatusValidationIssue[]) {
		super(issues.map(issue => `${issue.path}: ${issue.message}`).join("; "));
		this.name = "ResearchStatusValidationError";
		this.issues = issues;
	}
}

export function validateResearchStatusSegment(value: unknown): ResearchStatusValidationResult {
	const issues: ResearchStatusValidationIssue[] = [];
	if (!isRecord(value)) return { valid: false, issues: [{ path: "$", message: "Expected status segment object" }] };

	requireConciseString(value.id, "$.id", Number.POSITIVE_INFINITY, issues);
	requireConciseString(value.label, "$.label", MAX_LABEL_WIDTH, issues);
	requireConciseString(value.value, "$.value", MAX_VALUE_WIDTH, issues);

	if (typeof value.priority !== "number" || !Number.isInteger(value.priority) || value.priority < 0) {
		issues.push({ path: "$.priority", message: "Expected non-negative integer priority" });
	}
	if (value.state !== undefined && (typeof value.state !== "string" || !STATUS_STATES.has(value.state))) {
		issues.push({ path: "$.state", message: "Expected supported status state" });
	}
	if (
		value.sourceEventId !== undefined &&
		(typeof value.sourceEventId !== "string" || value.sourceEventId.length === 0)
	) {
		issues.push({ path: "$.sourceEventId", message: "Expected source event ID string" });
	}

	return { valid: issues.length === 0, issues };
}

export function validateResearchStatusSegments(values: readonly unknown[]): ResearchStatusValidationResult {
	const issues: ResearchStatusValidationIssue[] = [];
	const ids = new Set<string>();

	for (let index = 0; index < values.length; index++) {
		const value = values[index];
		const result = validateResearchStatusSegment(value);
		for (const issue of result.issues) {
			issues.push({ path: `$[${index}]${issue.path.slice(1)}`, message: issue.message });
		}
		if (isRecord(value) && typeof value.id === "string") {
			if (ids.has(value.id)) issues.push({ path: `$[${index}].id`, message: "Expected unique status segment ID" });
			ids.add(value.id);
		}
	}

	return { valid: issues.length === 0, issues };
}

export function assertValidResearchStatusSegment(value: unknown): asserts value is ResearchStatusSegment {
	const result = validateResearchStatusSegment(value);
	if (!result.valid) throw new ResearchStatusValidationError(result.issues);
}

export function assertValidResearchStatusSegments(
	values: readonly unknown[],
): asserts values is ResearchStatusSegment[] {
	const result = validateResearchStatusSegments(values);
	if (!result.valid) throw new ResearchStatusValidationError(result.issues);
}

export function compareResearchStatusSegments(left: ResearchStatusSegment, right: ResearchStatusSegment): number {
	return left.priority - right.priority || left.label.localeCompare(right.label) || left.id.localeCompare(right.id);
}

export function sortResearchStatusSegments(segments: readonly ResearchStatusSegment[]): ResearchStatusSegment[] {
	return [...segments].sort(compareResearchStatusSegments);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireConciseString(
	value: unknown,
	path: string,
	maxLength: number,
	issues: ResearchStatusValidationIssue[],
): void {
	if (typeof value !== "string" || value.length === 0) {
		issues.push({ path, message: "Expected non-empty string" });
		return;
	}
	if (value.length > maxLength) {
		issues.push({ path, message: `Expected string length at most ${maxLength}` });
	}
}
