import { describe, expect, test } from "bun:test";
import { representativeResearchEvents, representativeStatusSegments } from "../src/fixtures/research-events";
import { resolveResearchRenderProfile } from "../src/render/profile";
import { renderResearchEvents } from "../src/render/research-renderer";

describe("research render profile selection", () => {
	test("honors explicit profile selection", () => {
		expect(resolveResearchRenderProfile({ explicitProfile: "plain", isInteractive: true })).toBe("plain");
		expect(resolveResearchRenderProfile({ explicitProfile: "compact", isInteractive: false })).toBe("compact");
		expect(resolveResearchRenderProfile({ explicitProfile: "rich", isInteractive: false })).toBe("rich");
	});

	test("defaults non-interactive output to plain and interactive research output to compact", () => {
		expect(resolveResearchRenderProfile({ isInteractive: false })).toBe("plain");
		expect(resolveResearchRenderProfile({ isInteractive: true })).toBe("compact");
	});

	test("preserves semantic IDs across plain, compact, and rich profiles", () => {
		const plain = renderResearchEvents(representativeResearchEvents, { profile: "plain" });
		const compact = renderResearchEvents(representativeResearchEvents, {
			profile: "compact",
			statusSegments: representativeStatusSegments,
		});
		const rich = renderResearchEvents(representativeResearchEvents, {
			profile: "rich",
			statusSegments: representativeStatusSegments,
		});

		expect(compact.eventIds).toEqual(plain.eventIds);
		expect(rich.eventIds).toEqual(plain.eventIds);
		expect(compact.referenceIds).toEqual(plain.referenceIds);
		expect(rich.referenceIds).toEqual(plain.referenceIds);
		expect(rich.text).toContain("event: evt_fixture_006");
		expect(rich.text).toContain("claim: claim_copy_safe_transcript");
	});
});
