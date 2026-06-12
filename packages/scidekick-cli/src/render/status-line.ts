import type { ResearchStatusSegment } from "@scidekick/runtime";

export interface StatusLineOptions {
	maxWidth?: number;
}

export function formatStatusLine(segments: readonly ResearchStatusSegment[], options: StatusLineOptions = {}): string {
	const maxWidth = options.maxWidth ?? Number.POSITIVE_INFINITY;
	const parts: string[] = [];
	for (const segment of [...segments].sort(compareStatusSegments)) {
		const nextParts = [...parts, `${sanitizeStatusText(segment.label)}=${sanitizeStatusText(segment.value)}`];
		const nextLine = `status: ${nextParts.join(" / ")}`;
		if (nextLine.length > maxWidth && parts.length > 0) break;
		if (nextLine.length <= maxWidth || parts.length === 0) parts.push(nextParts[nextParts.length - 1]);
	}
	return parts.length > 0 ? `status: ${parts.join(" / ")}` : "status:";
}

export function sanitizeStatusText(value: string): string {
	return value.replace(/\t/g, " ").replace(/\s+/g, " ").trim();
}

function compareStatusSegments(left: ResearchStatusSegment, right: ResearchStatusSegment): number {
	return (
		left.priority - right.priority ||
		String(left.label).localeCompare(String(right.label)) ||
		left.id.localeCompare(right.id)
	);
}
