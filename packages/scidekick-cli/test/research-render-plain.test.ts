import { describe, expect, test } from "bun:test";
import { representativeResearchEvents } from "../src/fixtures/research-events";
import { renderResearchEvents } from "../src/render/research-renderer";

const BOX_DRAWING_PATTERN = /[┌┐└┘├┤┬┴┼─━│┃╭╮╰╯]/;
const DECORATIVE_DIVIDER_PATTERN = /^([-=*#])\1{5,}$/m;

describe("plain research renderer", () => {
	test("renders required research event kinds as copy-friendly text", () => {
		const result = renderResearchEvents(representativeResearchEvents, { profile: "plain" });

		expect(result.profile).toBe("plain");
		expect(result.includesTerminalChrome).toBe(false);
		expect(result.text).toContain("Research initialized");
		expect(result.text).toContain("Run focused test command");
		expect(result.text).toContain("Regression command failed");
		expect(result.text).toContain("Claim support updated");
		expect(result.text).toContain("Evidence summarized");
		expect(result.text).toContain("Review issue opened");
		expect(result.text).toContain("Run summarized");
	});

	test("preserves semantic event and reference IDs", () => {
		const result = renderResearchEvents(representativeResearchEvents, { profile: "plain" });

		expect(result.eventIds).toContain("evt_fixture_006");
		expect(result.referenceIds).toEqual(
			expect.arrayContaining([
				"run_copy_friendly_fixture",
				"trace_copy_friendly_fixture",
				"claim_copy_safe_transcript",
				"evidence_renderer_contract",
				"review_issue_status_chrome",
				"artifact_stderr_001",
			]),
		);
		expect(result.text).toContain("event: evt_fixture_006");
		expect(result.text).toContain("claim: claim_copy_safe_transcript");
		expect(result.text).toContain("evidence: evidence_renderer_contract");
		expect(result.text).toContain("artifact: artifact_stderr_001");
	});

	test("does not add forbidden terminal chrome", () => {
		const result = renderResearchEvents(representativeResearchEvents, { profile: "plain" });

		expect(result.text).not.toMatch(BOX_DRAWING_PATTERN);
		expect(result.text).not.toMatch(DECORATIVE_DIVIDER_PATTERN);
		expect(result.text.split("\n").some(line => line.trim().startsWith("|"))).toBe(false);
	});

	test("keeps diffs patch-readable without visual containers", () => {
		const result = renderResearchEvents(representativeResearchEvents, { profile: "plain" });

		expect(result.text).toContain("diff --git a/packages/scidekick-runtime/src/events/validation.ts");
		expect(result.text).toContain("@@");
		expect(result.text).toContain("-export {}");
		expect(result.text).toContain("+export function validateResearchTranscriptEvent() {}");
		expect(result.text).not.toContain("```diff");
	});
});
