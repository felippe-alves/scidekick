import { describe, expect, test } from "bun:test";
import { representativeResearchEvents, representativeStatusSegments } from "../src/fixtures/research-events";
import { renderResearchEvents } from "../src/render/research-renderer";
import { formatStatusLine } from "../src/render/status-line";

const BOX_DRAWING_PATTERN = /[┌┐└┘├┤┬┴┼─━│┃╭╮╰╯]/;

describe("compact research renderer", () => {
	test("renders prioritized status segments above copy-friendly transcript text", () => {
		const result = renderResearchEvents(representativeResearchEvents, {
			profile: "compact",
			statusSegments: representativeStatusSegments,
		});

		expect(result.profile).toBe("compact");
		expect(result.includesTerminalChrome).toBe(true);
		expect(result.text).toStartWith("status: model=gpt-5-codex / mode=research");
		for (const value of [
			"branch=codex-scidekick-v2-spec-kit",
			"workspace=scidekick",
			"phase=reviewing",
			"gate=open",
			"queue=1 running",
			"run=run_copy_friendly_fixture",
			"tokens=42%",
			"cost=$0.03",
			"approval=not required",
		]) {
			expect(result.text).toContain(value);
		}
		expect(result.text).toContain("event: evt_fixture_006");
		expect(result.text).toContain("claim: claim_copy_safe_transcript");
	});

	test("keeps compact transcript free of forbidden boxed chrome", () => {
		const result = renderResearchEvents(representativeResearchEvents, {
			profile: "compact",
			statusSegments: representativeStatusSegments,
		});

		expect(result.text).not.toMatch(BOX_DRAWING_PATTERN);
		expect(result.text.split("\n").some(line => line.trim().startsWith("|"))).toBe(false);
		expect(result.referenceIds).toEqual(
			expect.arrayContaining([
				"claim_copy_safe_transcript",
				"evidence_renderer_contract",
				"review_issue_status_chrome",
			]),
		);
	});

	test("elides lower-priority status segments for narrow widths", () => {
		const statusLine = formatStatusLine(representativeStatusSegments, { maxWidth: 48 });

		expect(statusLine).toBe("status: model=gpt-5-codex / mode=research");
	});
});
