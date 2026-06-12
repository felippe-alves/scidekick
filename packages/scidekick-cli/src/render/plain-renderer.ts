import type {
	CopySafeRenderResult,
	JsonObject,
	RawArtifactPointer,
	ResearchReference,
	ResearchTranscriptEvent,
} from "@scidekick/runtime";
import { buildCopySafeRenderResult } from "./render-result";

const DEFAULT_MAX_BODY_LENGTH = 4_000;

export interface PlainResearchRenderOptions {
	maxBodyLength?: number;
}

interface RenderedBody {
	text: string;
	warnings: string[];
}

export function renderPlainResearchEvents(
	events: readonly ResearchTranscriptEvent[],
	options: PlainResearchRenderOptions = {},
): CopySafeRenderResult {
	const warnings: string[] = [];
	const text = events
		.map(event => {
			const rendered = renderPlainResearchEvent(event, options);
			warnings.push(...rendered.warnings);
			return rendered.text;
		})
		.join("\n\n");

	return buildCopySafeRenderResult({
		text: text.length > 0 ? `${text}\n` : "",
		profile: "plain",
		events,
		includesTerminalChrome: false,
		warnings,
	});
}

function renderPlainResearchEvent(event: ResearchTranscriptEvent, options: PlainResearchRenderOptions): RenderedBody {
	const lines: string[] = [];
	const warnings: string[] = [];

	lines.push(`### ${event.title ?? event.kind}`);
	lines.push(`event: ${event.id}`);
	lines.push(`kind: ${event.kind}`);
	lines.push(`sequence: ${event.sequence}`);
	lines.push(`session: ${event.sessionId}`);
	if (event.runId) lines.push(`run: ${event.runId}`);
	if (event.traceId) lines.push(`trace: ${event.traceId}`);
	if (event.actor) lines.push(`actor: ${formatActor(event.actor)}`);
	if (event.severity) lines.push(`severity: ${event.severity}`);
	if (event.supportLevel) lines.push(`support: ${event.supportLevel}`);
	if (event.references && event.references.length > 0) {
		lines.push("references:");
		for (const reference of event.references) {
			lines.push(`- ${formatReference(reference)}`);
		}
	}
	if (event.rawArtifact) lines.push(`raw artifact: ${formatRawArtifact(event.rawArtifact)}`);
	if (event.body !== undefined) {
		const body = renderBody(event, options.maxBodyLength ?? DEFAULT_MAX_BODY_LENGTH);
		lines.push("");
		lines.push(body.text);
		warnings.push(...body.warnings);
	}

	return { text: lines.join("\n"), warnings };
}

function renderBody(event: ResearchTranscriptEvent, maxBodyLength: number): RenderedBody {
	const fullText = typeof event.body === "string" ? event.body : formatJsonBody(event.body);
	if (fullText.length <= maxBodyLength) return { text: fullText, warnings: [] };

	const artifactText = event.rawArtifact ? ` Full output: ${event.rawArtifact.id} (${event.rawArtifact.path}).` : "";
	const warning = `Body for ${event.id} was truncated to ${maxBodyLength} characters.`;
	return {
		text: `${fullText.slice(0, maxBodyLength)}\n\n[truncated]${artifactText}`,
		warnings: [warning],
	};
}

function formatJsonBody(body: JsonObject | undefined): string {
	return JSON.stringify(body ?? {}, null, 2);
}

function formatActor(actor: ResearchTranscriptEvent["actor"]): string {
	if (!actor) return "";
	const label = actor.label ? `${actor.label} ` : "";
	return `${label}(${actor.role}: ${actor.id})`;
}

function formatReference(reference: ResearchReference): string {
	const details: string[] = [];
	if (reference.path) details.push(reference.path);
	if (reference.url) details.push(reference.url);
	if (reference.label) details.push(reference.label);
	return details.length > 0
		? `${reference.type}: ${reference.id} (${details.join(", ")})`
		: `${reference.type}: ${reference.id}`;
}

function formatRawArtifact(artifact: RawArtifactPointer): string {
	return `${artifact.id} (${artifact.path}, ${artifact.mediaType})`;
}
