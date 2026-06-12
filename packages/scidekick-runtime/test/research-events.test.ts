import { describe, expect, test } from "bun:test";
import type { ResearchTranscriptEvent } from "../src/events/types";
import { validateResearchTranscriptEvent, validateResearchTranscriptEvents } from "../src/events/validation";

const baseEvent = {
	id: "evt_test_001",
	sessionId: "rs_test",
	timestamp: "2026-06-11T20:00:00.000Z",
	sequence: 1,
	actor: { id: "agent_primary", role: "research_agent" },
} as const;

describe("ResearchTranscriptEvent validation", () => {
	test("accepts the required event kinds with stable IDs and references", () => {
		const events: ResearchTranscriptEvent[] = [
			{
				...baseEvent,
				kind: "state_transition",
				body: { from: "initialized", to: "planning" },
			},
			{
				...baseEvent,
				id: "evt_test_002",
				sequence: 2,
				kind: "tool_call",
				body: "Command `bun test` started.",
			},
			{
				...baseEvent,
				id: "evt_test_003",
				sequence: 3,
				kind: "tool_result",
				body: "Command completed.",
			},
			{
				...baseEvent,
				id: "evt_test_004",
				sequence: 4,
				kind: "tool_error",
				severity: "error",
				body: "Command failed.",
			},
			{
				...baseEvent,
				id: "evt_test_005",
				sequence: 5,
				kind: "diff",
				body: "@@\n-old\n+new\n",
			},
			{
				...baseEvent,
				id: "evt_test_006",
				sequence: 6,
				kind: "claim_update",
				supportLevel: "weak",
				references: [
					{ type: "claim", id: "claim_test" },
					{ type: "evidence", id: "evidence_test" },
				],
			},
			{
				...baseEvent,
				id: "evt_test_007",
				sequence: 7,
				kind: "evidence_summary",
				references: [
					{ type: "evidence", id: "evidence_test" },
					{ type: "artifact", id: "artifact_test", path: ".sk/research/artifacts/test.txt" },
				],
			},
			{
				...baseEvent,
				id: "evt_test_008",
				sequence: 8,
				kind: "review_issue",
				references: [{ type: "review_issue", id: "review_issue_test" }],
			},
			{
				...baseEvent,
				id: "evt_test_009",
				sequence: 9,
				kind: "review_round",
				references: [{ type: "review_round", id: "review_round_test" }],
			},
			{
				...baseEvent,
				id: "evt_test_010",
				sequence: 10,
				kind: "handoff",
				body: "Handoff prepared.",
			},
			{
				...baseEvent,
				id: "evt_test_011",
				sequence: 11,
				kind: "run_summary",
				references: [{ type: "run", id: "run_test" }],
			},
			{
				...baseEvent,
				id: "evt_test_012",
				sequence: 12,
				kind: "message",
				body: "User asked for a copy-safe transcript.",
			},
		];

		const result = validateResearchTranscriptEvents(events);

		expect(result).toEqual({ valid: true, issues: [] });
	});

	test("rejects missing required envelope fields", () => {
		const result = validateResearchTranscriptEvent({
			sessionId: "rs_test",
			timestamp: "2026-06-11T20:00:00.000Z",
			sequence: 1,
			kind: "message",
		});

		expect(result.valid).toBe(false);
		expect(result.issues.map(issue => issue.path)).toContain("$.id");
	});

	test("rejects non-monotonic sequence numbers per session", () => {
		const result = validateResearchTranscriptEvents([
			{ ...baseEvent, kind: "message" },
			{ ...baseEvent, id: "evt_test_002", kind: "message" },
		]);

		expect(result.valid).toBe(false);
		expect(result.issues).toContainEqual({
			path: "$[1].sequence",
			message: "Expected sequence greater than previous session sequence 1",
		});
	});

	test("enforces tool-error severity and body or raw artifact", () => {
		const result = validateResearchTranscriptEvent({
			...baseEvent,
			kind: "tool_error",
			severity: "warning",
		});

		expect(result.valid).toBe(false);
		expect(result.issues.map(issue => issue.path)).toEqual(expect.arrayContaining(["$.severity", "$.body"]));
	});

	test("requires patch-readable body text for diff events", () => {
		const result = validateResearchTranscriptEvent({
			...baseEvent,
			kind: "diff",
			body: "Changed the file.",
		});

		expect(result.valid).toBe(false);
		expect(result.issues).toContainEqual({
			path: "$.body",
			message: "Diff events must preserve patch-readable text",
		});
	});

	test("requires claim and evidence references for supported claim updates", () => {
		const result = validateResearchTranscriptEvent({
			...baseEvent,
			kind: "claim_update",
			supportLevel: "strong",
			references: [{ type: "claim", id: "claim_test" }],
		});

		expect(result.valid).toBe(false);
		expect(result.issues).toContainEqual({
			path: "$.references",
			message: "Expected evidence reference",
		});
	});
});
