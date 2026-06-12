import type {
	CopySafeRenderResult,
	ResearchRenderProfile,
	ResearchStatusSegment,
	ResearchTranscriptEvent,
} from "@scidekick/runtime";
import { type CompactResearchRenderOptions, renderCompactResearchEvents } from "./compact-renderer";
import { type PlainResearchRenderOptions, renderPlainResearchEvents } from "./plain-renderer";
import { type RichResearchRenderOptions, renderRichResearchEvents } from "./rich-renderer";

export interface ResearchRenderOptions
	extends PlainResearchRenderOptions,
		CompactResearchRenderOptions,
		RichResearchRenderOptions {
	profile?: ResearchRenderProfile;
	statusSegments?: readonly ResearchStatusSegment[];
}

export function renderResearchEvents(
	events: readonly ResearchTranscriptEvent[],
	options: ResearchRenderOptions = {},
): CopySafeRenderResult {
	const profile = options.profile ?? "plain";
	if (profile === "plain") return renderPlainResearchEvents(events, options);
	if (profile === "compact") return renderCompactResearchEvents(events, options);
	return renderRichResearchEvents(events, options);
}
