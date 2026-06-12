import { describe, expect, test } from "bun:test";
import { createResearchTranscriptExport } from "../src/export/export-transcript";
import { representativeResearchEvents, representativeStatusSegments } from "../src/fixtures/research-events";

describe("research transcript export", () => {
	test("excludes compact status chrome from export metadata by default", () => {
		const result = createResearchTranscriptExport({
			events: representativeResearchEvents,
			profile: "compact",
			statusSegments: representativeStatusSegments,
		});

		expect(result.rendered.includesTerminalChrome).toBe(false);
		expect(result.rendered.profile).toBe("plain");
		expect(result.rendered.text).not.toStartWith("status:");
		expect(result.manifest.includesTerminalChrome).toBe(false);
		expect(result.manifest.references.claims).toContain("claim_copy_safe_transcript");
		expect(result.manifest.references.rawArtifacts).toContain("artifact_stderr_001");
	});
});
