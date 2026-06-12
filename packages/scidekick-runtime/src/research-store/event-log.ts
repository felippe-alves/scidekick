import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ResearchTranscriptEvent } from "../events/types";
import {
	assertValidResearchTranscriptEvent,
	assertValidResearchTranscriptEvents,
	type ResearchValidationIssue,
	validateResearchTranscriptEvents,
} from "../events/validation";

export interface ResearchEventLogLocation {
	workspacePath: string;
	sessionId: string;
}

export class ResearchEventLogError extends Error {
	issues?: ResearchValidationIssue[];

	constructor(message: string, issues?: ResearchValidationIssue[]) {
		super(message);
		this.name = "ResearchEventLogError";
		this.issues = issues;
	}
}

export function getResearchEventLogPath(location: ResearchEventLogLocation): string {
	return path.join(location.workspacePath, ".sk", "research", "sessions", location.sessionId, "events.jsonl");
}

export async function readResearchEventLog(
	locationOrPath: ResearchEventLogLocation | string,
): Promise<ResearchTranscriptEvent[]> {
	const filePath = typeof locationOrPath === "string" ? locationOrPath : getResearchEventLogPath(locationOrPath);
	let text: string;
	try {
		text = await Bun.file(filePath).text();
	} catch (error) {
		if (isEnoent(error)) return [];
		throw error;
	}

	if (text.trim().length === 0) return [];

	let records: unknown[];
	try {
		records = Bun.JSONL.parse(text) as unknown[];
	} catch (error) {
		throw new ResearchEventLogError(`Malformed JSONL event log at ${filePath}: ${formatError(error)}`);
	}

	const result = validateResearchTranscriptEvents(records);
	if (!result.valid) {
		throw new ResearchEventLogError(`Invalid research event log at ${filePath}`, result.issues);
	}
	return records as ResearchTranscriptEvent[];
}

export async function appendResearchEventLogEvent(
	locationOrPath: ResearchEventLogLocation | string,
	event: ResearchTranscriptEvent,
): Promise<void> {
	const filePath = typeof locationOrPath === "string" ? locationOrPath : getResearchEventLogPath(locationOrPath);
	assertValidResearchTranscriptEvent(event);
	const existing = await readResearchEventLog(filePath);
	const next = [...existing, event];
	const result = validateResearchTranscriptEvents(next);
	if (!result.valid) throw new ResearchEventLogError(`Invalid research event append at ${filePath}`, result.issues);
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.appendFile(filePath, `${JSON.stringify(event)}\n`, "utf8");
}

export async function appendResearchEventLogEvents(
	locationOrPath: ResearchEventLogLocation | string,
	events: readonly ResearchTranscriptEvent[],
): Promise<void> {
	assertValidResearchTranscriptEvents(events);
	for (const event of events) {
		await appendResearchEventLogEvent(locationOrPath, event);
	}
}

function isEnoent(error: unknown): boolean {
	return isRecord(error) && error.code === "ENOENT";
}

function isRecord(value: unknown): value is { code?: unknown; message?: unknown } {
	return typeof value === "object" && value !== null;
}

function formatError(error: unknown): string {
	if (isRecord(error) && typeof error.message === "string") return error.message;
	return String(error);
}
