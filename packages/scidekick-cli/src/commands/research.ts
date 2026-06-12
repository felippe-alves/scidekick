import * as path from "node:path";
import {
	createResearchSession,
	getResearchEventLogPath,
	getResearchExportManifestPath,
	type ResearchPlanRecord,
	type ResearchTranscriptEvent,
	readResearchEventLog,
	readResearchProjectState,
	readResearchSessionState,
	recordResearchPlan,
	writeResearchExportManifest,
} from "@scidekick/runtime";
import { createResearchTranscriptExport } from "../export/export-transcript";

export interface ResearchCommandOptions {
	argv: string[];
	workspacePath?: string;
	now?: () => string;
}

export interface ResearchCommandResult {
	text: string;
	renderedPath: string;
	manifestPath: string;
}

export async function runResearchCommand(options: ResearchCommandOptions): Promise<ResearchCommandResult> {
	const parsed = parseResearchCommandArgs(options.argv);
	const workspacePath = options.workspacePath ?? process.cwd();

	if (parsed.action === "init") return runResearchInitCommand(parsed, workspacePath, options.now);
	if (parsed.action === "status") return runResearchStatusCommand(parsed, workspacePath);
	if (parsed.action === "plan") return runResearchPlanCommand(parsed, workspacePath, options.now);
	if (parsed.action !== "export") throw new Error(`Unsupported research action: ${parsed.action}`);

	const sessionId = parsed.sessionId;
	if (!sessionId) throw new Error("Missing required --session value");

	const eventLogPath = getResearchEventLogPath({ workspacePath, sessionId });
	const events = await readResearchEventLog(eventLogPath);
	const exportId = `export_${sessionId}`;
	const renderedPath = path.join(".sk", "research", "exports", `${exportId}.md`);
	const manifestPath = getResearchExportManifestPath({ workspacePath, exportId });
	const transcript = await exportResearchTranscript({
		events,
		workspacePath,
		exportId,
		renderedPath,
		sourceEventLog: path.relative(workspacePath, eventLogPath),
		createdAt: options.now?.() ?? new Date().toISOString(),
	});

	return {
		text: transcript.text,
		renderedPath,
		manifestPath: path.relative(workspacePath, manifestPath),
	};
}

async function runResearchInitCommand(
	parsed: ParsedResearchCommandArgs,
	workspacePath: string,
	now: (() => string) | undefined,
): Promise<ResearchCommandResult> {
	const sessionId = parsed.sessionId ?? makeDefaultSessionId(now?.() ?? new Date().toISOString());
	const objective = parsed.objective;
	if (!objective) throw new Error("Missing required --objective value");
	const session = await createResearchSession({ workspacePath, sessionId, objective, now });
	return {
		text: [
			`Initialized research session ${session.sessionId}`,
			`phase: ${session.phase}`,
			`objective: ${session.objective}`,
			formatGateLines(session.gates),
		]
			.filter(Boolean)
			.join("\n")
			.concat("\n"),
		renderedPath: "",
		manifestPath: "",
	};
}

async function runResearchStatusCommand(
	parsed: ParsedResearchCommandArgs,
	workspacePath: string,
): Promise<ResearchCommandResult> {
	const projectState = await readResearchProjectState({ workspacePath });
	const sessionId = parsed.sessionId ?? projectState?.currentSessionId;
	if (!sessionId) throw new Error("Missing required --session value and no current research session exists");
	const session = await readResearchSessionState({ workspacePath, sessionId });
	if (!session) throw new Error(`Research session not found: ${sessionId}`);

	const lines = [
		`session: ${session.sessionId}`,
		`phase: ${session.phase}`,
		`objective: ${session.objective}`,
		session.currentPlanId ? `active plan: ${session.currentPlanId}` : "active plan: none",
		formatGateLines(session.gates),
	];
	return { text: lines.filter(Boolean).join("\n").concat("\n"), renderedPath: "", manifestPath: "" };
}

async function runResearchPlanCommand(
	parsed: ParsedResearchCommandArgs,
	workspacePath: string,
	now: (() => string) | undefined,
): Promise<ResearchCommandResult> {
	const projectState = await readResearchProjectState({ workspacePath });
	const sessionId = parsed.sessionId ?? projectState?.currentSessionId;
	if (!sessionId) throw new Error("Missing required --session value and no current research session exists");
	const existing = await readResearchSessionState({ workspacePath, sessionId });
	if (!existing) throw new Error(`Research session not found: ${sessionId}`);

	const plan = makePlanDraft(parsed, sessionId, existing.objective);
	const session = await recordResearchPlan({ workspacePath, sessionId, plan, now });
	return {
		text: [
			`Recorded research plan ${plan.id}`,
			`phase: ${session.phase}`,
			`objective: ${plan.objective}`,
			formatGateLines(session.gates),
		]
			.filter(Boolean)
			.join("\n")
			.concat("\n"),
		renderedPath: "",
		manifestPath: "",
	};
}

export interface ExportResearchTranscriptOptions {
	events: readonly ResearchTranscriptEvent[];
	workspacePath: string;
	exportId: string;
	renderedPath: string;
	sourceEventLog: string;
	createdAt: string;
}

export async function exportResearchTranscript(
	options: ExportResearchTranscriptOptions,
): Promise<ResearchCommandResult> {
	const exportResult = createResearchTranscriptExport({
		events: options.events,
		exportId: options.exportId,
		createdAt: options.createdAt,
		sourceEventLog: options.sourceEventLog,
		renderedPath: options.renderedPath,
	});
	const absoluteRenderedPath = path.join(options.workspacePath, options.renderedPath);
	await Bun.write(absoluteRenderedPath, exportResult.rendered.text);
	await writeResearchExportManifest(
		{ workspacePath: options.workspacePath, exportId: options.exportId },
		exportResult.manifest,
	);

	return {
		text: exportResult.rendered.text,
		renderedPath: options.renderedPath,
		manifestPath: path.relative(
			options.workspacePath,
			getResearchExportManifestPath({ workspacePath: options.workspacePath, exportId: options.exportId }),
		),
	};
}

interface ParsedResearchCommandArgs {
	action: string;
	sessionId?: string;
	objective?: string;
	title?: string;
	evidence: string[];
	success: string[];
	stop?: string;
	rollback?: string;
}

function parseResearchCommandArgs(argv: readonly string[]): ParsedResearchCommandArgs {
	const [action = "export", ...rest] = argv;
	let sessionId: string | undefined;
	let objective: string | undefined;
	let title: string | undefined;
	const evidence: string[] = [];
	const success: string[] = [];
	let stop: string | undefined;
	let rollback: string | undefined;
	for (let index = 0; index < rest.length; index++) {
		const value = rest[index];
		if (value === "--session") {
			sessionId = rest[index + 1];
			index++;
		} else if (value === "--objective") {
			objective = rest[index + 1];
			index++;
		} else if (value === "--title") {
			title = rest[index + 1];
			index++;
		} else if (value === "--evidence") {
			evidence.push(rest[index + 1] ?? "");
			index++;
		} else if (value === "--success") {
			success.push(rest[index + 1] ?? "");
			index++;
		} else if (value === "--stop") {
			stop = rest[index + 1];
			index++;
		} else if (value === "--rollback") {
			rollback = rest[index + 1];
			index++;
		}
	}
	return { action, sessionId, objective, title, evidence, success, stop, rollback };
}

function makePlanDraft(
	parsed: ParsedResearchCommandArgs,
	sessionId: string,
	objective: string,
): Omit<ResearchPlanRecord, "sessionId" | "status" | "createdAt" | "updatedAt"> {
	const id = `plan_${sessionId}`;
	return {
		id,
		title: parsed.title ?? "Research plan",
		objective: parsed.objective ?? objective,
		expectedEvidence: parsed.evidence,
		successCriteria: parsed.success,
		stopCondition: parsed.stop ?? "",
		rollbackPlan: parsed.rollback ?? "",
	};
}

function formatGateLines(gates: readonly { id: string; state: string; detail?: string }[]): string {
	return gates.map(gate => `gate ${gate.id}: ${gate.state}${gate.detail ? ` - ${gate.detail}` : ""}`).join("\n");
}

function makeDefaultSessionId(timestamp: string): string {
	return `rs_${timestamp.replace(/\D/g, "").slice(0, 14)}`;
}
