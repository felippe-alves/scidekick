import type { CopySafeRenderResult, ResearchStatusSegment, ResearchTranscriptEvent } from "@scidekick/runtime";
import { type PlainResearchRenderOptions, renderPlainResearchEvents } from "./plain-renderer";
import { buildCopySafeRenderResult } from "./render-result";
import { formatStatusLine } from "./status-line";

export interface CompactResearchRenderOptions extends PlainResearchRenderOptions {
	statusSegments?: readonly ResearchStatusSegment[];
	statusLineWidth?: number;
}

export function renderCompactResearchEvents(
	events: readonly ResearchTranscriptEvent[],
	options: CompactResearchRenderOptions = {},
): CopySafeRenderResult {
	const plain = renderPlainResearchEvents(events, options);
	const statusLine = formatStatusLine(options.statusSegments ?? [], { maxWidth: options.statusLineWidth });
	const text = statusLine === "status:" ? plain.text : `${statusLine}\n${plain.text}`;

	return buildCopySafeRenderResult({
		text,
		profile: "compact",
		events,
		includesTerminalChrome: statusLine !== "status:",
		warnings: plain.warnings,
	});
}
