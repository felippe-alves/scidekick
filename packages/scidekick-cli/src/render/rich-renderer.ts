import type { CopySafeRenderResult, ResearchStatusSegment, ResearchTranscriptEvent } from "@scidekick/runtime";
import { type CompactResearchRenderOptions, renderCompactResearchEvents } from "./compact-renderer";
import { buildCopySafeRenderResult } from "./render-result";

export interface RichResearchRenderOptions extends CompactResearchRenderOptions {
	statusSegments?: readonly ResearchStatusSegment[];
}

export function renderRichResearchEvents(
	events: readonly ResearchTranscriptEvent[],
	options: RichResearchRenderOptions = {},
): CopySafeRenderResult {
	const compact = renderCompactResearchEvents(events, options);
	const prefix = compact.includesTerminalChrome ? "profile: rich\n" : "profile: rich\n";
	return buildCopySafeRenderResult({
		text: `${prefix}${compact.text}`,
		profile: "rich",
		events,
		includesTerminalChrome: compact.includesTerminalChrome,
		warnings: compact.warnings,
	});
}
