import * as path from "node:path";
import type { ResearchTranscriptEvent } from "../events/types";
import { appendResearchEventLogEvent } from "../research-store/event-log";
import type { ResearchPlanRecord, ResearchProjectState, ResearchSessionState } from "./types";
import {
	assertValidResearchPlanDraft,
	assertValidResearchSessionState,
	evaluateResearchSessionGates,
	ResearchStateError,
} from "./validation";

export interface ResearchWorkspaceLocation {
	workspacePath: string;
}

export interface ResearchSessionLocation extends ResearchWorkspaceLocation {
	sessionId: string;
}

export interface CreateResearchSessionOptions extends ResearchSessionLocation {
	objective: string;
	now?: () => string;
}

export interface RecordResearchPlanOptions extends ResearchSessionLocation {
	plan: Omit<ResearchPlanRecord, "sessionId" | "status" | "createdAt" | "updatedAt">;
	now?: () => string;
}

export function getResearchProjectStatePath(location: ResearchWorkspaceLocation): string {
	return path.join(location.workspacePath, ".sk", "research", "state.json");
}

export function getResearchSessionStatePath(location: ResearchSessionLocation): string {
	return path.join(location.workspacePath, ".sk", "research", "sessions", location.sessionId, "state.json");
}

export async function readResearchProjectState(
	location: ResearchWorkspaceLocation,
): Promise<ResearchProjectState | null> {
	const filePath = getResearchProjectStatePath(location);
	try {
		return (await Bun.file(filePath).json()) as ResearchProjectState;
	} catch (error) {
		if (isEnoent(error)) return null;
		throw error;
	}
}

export async function readResearchSessionState(
	location: ResearchSessionLocation,
): Promise<ResearchSessionState | null> {
	const filePath = getResearchSessionStatePath(location);
	try {
		const value = await Bun.file(filePath).json();
		assertValidResearchSessionState(value);
		return value;
	} catch (error) {
		if (isEnoent(error)) return null;
		throw error;
	}
}

export async function writeResearchProjectState(
	location: ResearchWorkspaceLocation,
	state: ResearchProjectState,
): Promise<void> {
	await Bun.write(getResearchProjectStatePath(location), `${JSON.stringify(state, null, 2)}\n`);
}

export async function writeResearchSessionState(
	location: ResearchSessionLocation,
	state: ResearchSessionState,
): Promise<void> {
	assertValidResearchSessionState(state);
	await Bun.write(getResearchSessionStatePath(location), `${JSON.stringify(state, null, 2)}\n`);
}

export async function createResearchSession(options: CreateResearchSessionOptions): Promise<ResearchSessionState> {
	if (options.objective.trim().length === 0) {
		throw new ResearchStateError("Research session initialization requires an objective", [
			{ path: "$.objective", message: "Expected non-empty objective" },
		]);
	}

	const existing = await readResearchSessionState(options);
	if (existing) throw new ResearchStateError(`Research session already exists: ${options.sessionId}`);

	const timestamp = options.now?.() ?? new Date().toISOString();
	const session: ResearchSessionState = {
		schemaVersion: 1,
		sessionId: options.sessionId,
		objective: options.objective,
		phase: "intake",
		createdAt: timestamp,
		updatedAt: timestamp,
		nextSequence: 2,
		gates: evaluateResearchSessionGates({ objective: options.objective }),
		plans: [],
		claims: [],
		evidence: [],
	};

	await writeResearchSessionState(options, session);
	await upsertProjectSession(options, session);
	await appendResearchEventLogEvent(options, {
		id: `evt_${options.sessionId}_0001`,
		sessionId: options.sessionId,
		timestamp,
		sequence: 1,
		kind: "message",
		title: "Research session initialized",
		body: options.objective,
		references: [{ type: "session", id: options.sessionId }],
	});

	return session;
}

export async function recordResearchPlan(options: RecordResearchPlanOptions): Promise<ResearchSessionState> {
	assertValidResearchPlanDraft(options.plan);
	const existing = await readResearchSessionState(options);
	if (!existing) throw new ResearchStateError(`Research session not found: ${options.sessionId}`);

	const timestamp = options.now?.() ?? new Date().toISOString();
	const plan: ResearchPlanRecord = {
		...options.plan,
		sessionId: options.sessionId,
		status: "draft",
		createdAt: timestamp,
		updatedAt: timestamp,
	};
	const nextSession: ResearchSessionState = {
		...existing,
		phase: "plan",
		updatedAt: timestamp,
		nextSequence: existing.nextSequence + 1,
		currentPlanId: plan.id,
		gates: evaluateResearchSessionGates({
			objective: existing.objective,
			currentPlanId: plan.id,
		}),
		plans: [...existing.plans.filter(item => item.id !== plan.id), plan],
	};

	await writeResearchSessionState(options, nextSession);
	await upsertProjectSession(options, nextSession);
	await appendResearchEventLogEvent(options, makePlanEvent(nextSession, plan, existing.nextSequence, timestamp));

	return nextSession;
}

async function upsertProjectSession(location: ResearchWorkspaceLocation, session: ResearchSessionState): Promise<void> {
	const previous = await readResearchProjectState(location);
	const sessions = previous?.sessions.filter(item => item.sessionId !== session.sessionId) ?? [];
	const next: ResearchProjectState = {
		schemaVersion: 1,
		currentSessionId: session.sessionId,
		sessions: [
			...sessions,
			{
				sessionId: session.sessionId,
				objective: session.objective,
				phase: session.phase,
				createdAt: session.createdAt,
				updatedAt: session.updatedAt,
				currentPlanId: session.currentPlanId,
			},
		],
	};
	await writeResearchProjectState(location, next);
}

function makePlanEvent(
	session: ResearchSessionState,
	plan: ResearchPlanRecord,
	sequence: number,
	timestamp: string,
): ResearchTranscriptEvent {
	return {
		id: `evt_${session.sessionId}_${String(sequence).padStart(4, "0")}`,
		sessionId: session.sessionId,
		timestamp,
		sequence,
		kind: "message",
		title: "Research plan recorded",
		body: {
			title: plan.title,
			objective: plan.objective,
			expectedEvidence: plan.expectedEvidence,
			successCriteria: plan.successCriteria,
			stopCondition: plan.stopCondition,
			rollbackPlan: plan.rollbackPlan,
		},
		references: [{ type: "file", id: plan.id }],
	};
}

function isEnoent(error: unknown): boolean {
	return isRecord(error) && error.code === "ENOENT";
}

function isRecord(value: unknown): value is { code?: unknown } {
	return typeof value === "object" && value !== null;
}
