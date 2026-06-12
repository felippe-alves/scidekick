import {
	type RawArtifactPointer,
	RESEARCH_EVENT_KINDS,
	type ResearchReference,
	type ResearchReferenceType,
	type ResearchTranscriptEvent,
} from "./types";

const EVENT_KINDS = new Set<string>(RESEARCH_EVENT_KINDS);
const SUPPORT_LEVELS = new Set<string>(["unsupported", "hypothesis", "weak", "moderate", "strong", "contradicted"]);
const SEVERITIES = new Set<string>(["info", "warning", "error", "blocked"]);
const REFERENCE_TYPES = new Set<string>([
	"artifact",
	"claim",
	"decision",
	"evidence",
	"file",
	"review_issue",
	"review_round",
	"run",
	"session",
	"trace",
	"url",
]);

export interface ResearchValidationIssue {
	path: string;
	message: string;
}

export interface ResearchValidationResult {
	valid: boolean;
	issues: ResearchValidationIssue[];
}

export class ResearchEventValidationError extends Error {
	issues: ResearchValidationIssue[];

	constructor(issues: ResearchValidationIssue[]) {
		super(issues.map(issue => `${issue.path}: ${issue.message}`).join("; "));
		this.name = "ResearchEventValidationError";
		this.issues = issues;
	}
}

export function validateResearchTranscriptEvent(value: unknown): ResearchValidationResult {
	const issues: ResearchValidationIssue[] = [];

	if (!isRecord(value)) {
		return invalid([{ path: "$", message: "Expected event object" }]);
	}

	requireString(value, "id", issues);
	requireString(value, "sessionId", issues);
	requireIsoTimestamp(value, "timestamp", issues);
	requireSequence(value, issues);

	const kind = readString(value.kind);
	if (!kind || !EVENT_KINDS.has(kind)) {
		issues.push({ path: "$.kind", message: "Expected a supported research event kind" });
	}

	validateOptionalString(value, "runId", issues);
	validateOptionalString(value, "traceId", issues);
	validateOptionalString(value, "title", issues);
	validateOptionalActor(value.actor, issues);
	validateOptionalBody(value.body, issues);
	validateOptionalSeverity(value.severity, issues);
	validateOptionalSupportLevel(value.supportLevel, issues);
	validateOptionalRawArtifact(value.rawArtifact, issues);
	const references = validateOptionalReferences(value.references, issues);

	if (kind === "tool_error") {
		if (value.severity !== "error") {
			issues.push({ path: "$.severity", message: 'Tool error events must use severity "error"' });
		}
		if (!hasBodyText(value.body) && !isRawArtifactPointer(value.rawArtifact)) {
			issues.push({ path: "$.body", message: "Tool error events need body text or a raw artifact pointer" });
		}
	}

	if (kind === "diff" && !isPatchReadableBody(value.body)) {
		issues.push({ path: "$.body", message: "Diff events must preserve patch-readable text" });
	}

	validateStableReferencesForKind(kind, value.supportLevel, references, issues);

	return { valid: issues.length === 0, issues };
}

export function assertValidResearchTranscriptEvent(value: unknown): asserts value is ResearchTranscriptEvent {
	const result = validateResearchTranscriptEvent(value);
	if (!result.valid) throw new ResearchEventValidationError(result.issues);
}

export function validateResearchTranscriptEvents(values: readonly unknown[]): ResearchValidationResult {
	const issues: ResearchValidationIssue[] = [];
	for (let index = 0; index < values.length; index++) {
		const result = validateResearchTranscriptEvent(values[index]);
		for (const issue of result.issues) {
			issues.push({ path: `$[${index}]${issue.path.slice(1)}`, message: issue.message });
		}
	}
	issues.push(...validateMonotonicSequences(values));
	return { valid: issues.length === 0, issues };
}

export function assertValidResearchTranscriptEvents(
	values: readonly unknown[],
): asserts values is ResearchTranscriptEvent[] {
	const result = validateResearchTranscriptEvents(values);
	if (!result.valid) throw new ResearchEventValidationError(result.issues);
}

function validateMonotonicSequences(values: readonly unknown[]): ResearchValidationIssue[] {
	const issues: ResearchValidationIssue[] = [];
	const lastBySession = new Map<string, number>();

	for (let index = 0; index < values.length; index++) {
		const value = values[index];
		if (!isRecord(value) || typeof value.sessionId !== "string" || typeof value.sequence !== "number") continue;

		const previous = lastBySession.get(value.sessionId);
		if (previous !== undefined && value.sequence <= previous) {
			issues.push({
				path: `$[${index}].sequence`,
				message: `Expected sequence greater than previous session sequence ${previous}`,
			});
		}
		lastBySession.set(value.sessionId, value.sequence);
	}

	return issues;
}

function validateStableReferencesForKind(
	kind: string | undefined,
	supportLevel: unknown,
	references: ResearchReference[],
	issues: ResearchValidationIssue[],
): void {
	if (!kind) return;

	if (kind === "claim_update") {
		requireReferenceType(references, "claim", "$.references", issues);
		if (!SUPPORT_LEVELS.has(String(supportLevel))) {
			issues.push({ path: "$.supportLevel", message: "Claim update events require a support level" });
		}
		if (supportLevel !== "unsupported" && supportLevel !== "hypothesis") {
			requireReferenceType(references, "evidence", "$.references", issues);
		}
	}

	if (kind === "evidence_summary") {
		requireReferenceType(references, "evidence", "$.references", issues);
		if (!hasAnyReferenceType(references, ["artifact", "file", "run", "trace", "url"])) {
			issues.push({
				path: "$.references",
				message: "Evidence summaries require a source, artifact, run, or trace reference",
			});
		}
	}

	if (kind === "review_issue") requireReferenceType(references, "review_issue", "$.references", issues);
	if (kind === "review_round") requireReferenceType(references, "review_round", "$.references", issues);
	if (kind === "run_summary") requireReferenceType(references, "run", "$.references", issues);
}

function invalid(issues: ResearchValidationIssue[]): ResearchValidationResult {
	return { valid: false, issues };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function requireString(record: Record<string, unknown>, key: string, issues: ResearchValidationIssue[]): void {
	if (!readString(record[key])) issues.push({ path: `$.${key}`, message: "Expected non-empty string" });
}

function validateOptionalString(record: Record<string, unknown>, key: string, issues: ResearchValidationIssue[]): void {
	if (record[key] !== undefined && typeof record[key] !== "string") {
		issues.push({ path: `$.${key}`, message: "Expected string when present" });
	}
}

function requireIsoTimestamp(record: Record<string, unknown>, key: string, issues: ResearchValidationIssue[]): void {
	const value = record[key];
	if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
		issues.push({ path: `$.${key}`, message: "Expected ISO-8601 timestamp string" });
	}
}

function requireSequence(record: Record<string, unknown>, issues: ResearchValidationIssue[]): void {
	const value = record.sequence;
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
		issues.push({ path: "$.sequence", message: "Expected non-negative integer sequence" });
	}
}

function validateOptionalActor(value: unknown, issues: ResearchValidationIssue[]): void {
	if (value === undefined) return;
	if (!isRecord(value)) {
		issues.push({ path: "$.actor", message: "Expected actor object" });
		return;
	}
	requireString(value, "id", issues);
	requireString(value, "role", issues);
	validateOptionalString(value, "label", issues);
}

function validateOptionalBody(value: unknown, issues: ResearchValidationIssue[]): void {
	if (value === undefined) return;
	if (typeof value === "string") return;
	if (isJsonValue(value) && isRecord(value)) return;
	issues.push({ path: "$.body", message: "Expected string or JSON object body" });
}

function validateOptionalSeverity(value: unknown, issues: ResearchValidationIssue[]): void {
	if (value !== undefined && (typeof value !== "string" || !SEVERITIES.has(value))) {
		issues.push({ path: "$.severity", message: "Expected supported severity" });
	}
}

function validateOptionalSupportLevel(value: unknown, issues: ResearchValidationIssue[]): void {
	if (value !== undefined && (typeof value !== "string" || !SUPPORT_LEVELS.has(value))) {
		issues.push({ path: "$.supportLevel", message: "Expected supported support level" });
	}
}

function validateOptionalRawArtifact(value: unknown, issues: ResearchValidationIssue[]): void {
	if (value === undefined) return;
	if (!isRawArtifactPointer(value)) {
		issues.push({ path: "$.rawArtifact", message: "Expected raw artifact pointer" });
	}
}

function isRawArtifactPointer(value: unknown): value is RawArtifactPointer {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		value.id.length > 0 &&
		typeof value.path === "string" &&
		value.path.length > 0 &&
		typeof value.mediaType === "string" &&
		value.mediaType.length > 0
	);
}

function validateOptionalReferences(value: unknown, issues: ResearchValidationIssue[]): ResearchReference[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		issues.push({ path: "$.references", message: "Expected references array" });
		return [];
	}

	const references: ResearchReference[] = [];
	for (let index = 0; index < value.length; index++) {
		const candidate = value[index];
		if (!isRecord(candidate)) {
			issues.push({ path: `$.references[${index}]`, message: "Expected reference object" });
			continue;
		}
		if (typeof candidate.type !== "string" || !REFERENCE_TYPES.has(candidate.type)) {
			issues.push({ path: `$.references[${index}].type`, message: "Expected supported reference type" });
		}
		if (typeof candidate.id !== "string" || candidate.id.length === 0) {
			issues.push({ path: `$.references[${index}].id`, message: "Expected non-empty reference ID" });
		}
		if (candidate.path !== undefined && typeof candidate.path !== "string") {
			issues.push({ path: `$.references[${index}].path`, message: "Expected path string" });
		}
		if (candidate.url !== undefined && typeof candidate.url !== "string") {
			issues.push({ path: `$.references[${index}].url`, message: "Expected URL string" });
		}
		if (candidate.label !== undefined && typeof candidate.label !== "string") {
			issues.push({ path: `$.references[${index}].label`, message: "Expected label string" });
		}
		if (
			typeof candidate.type === "string" &&
			REFERENCE_TYPES.has(candidate.type) &&
			typeof candidate.id === "string"
		) {
			const reference: ResearchReference = {
				type: candidate.type as ResearchReferenceType,
				id: candidate.id,
			};
			if (typeof candidate.label === "string") reference.label = candidate.label;
			if (typeof candidate.path === "string") reference.path = candidate.path;
			if (typeof candidate.url === "string") reference.url = candidate.url;
			references.push(reference);
		}
	}

	return references;
}

function isJsonValue(value: unknown): boolean {
	if (value === null) return true;
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
	if (Array.isArray(value)) return value.every(item => isJsonValue(item));
	if (!isRecord(value)) return false;
	return Object.values(value).every(item => isJsonValue(item));
}

function hasBodyText(value: unknown): boolean {
	return typeof value === "string" && value.trim().length > 0;
}

function isPatchReadableBody(value: unknown): boolean {
	if (typeof value !== "string" || value.trim().length === 0) return false;
	return value.includes("@@") || value.includes("diff --git") || /^[+-][^\n]/m.test(value);
}

function requireReferenceType(
	references: readonly ResearchReference[],
	type: ResearchReferenceType,
	path: string,
	issues: ResearchValidationIssue[],
): void {
	if (!references.some(reference => reference.type === type)) {
		issues.push({ path, message: `Expected ${type} reference` });
	}
}

function hasAnyReferenceType(
	references: readonly ResearchReference[],
	types: readonly ResearchReferenceType[],
): boolean {
	return references.some(reference => types.includes(reference.type));
}
