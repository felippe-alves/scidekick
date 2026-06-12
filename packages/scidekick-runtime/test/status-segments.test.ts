import { describe, expect, test } from "bun:test";
import type { ResearchStatusSegment } from "../src/status/types";
import {
	sortResearchStatusSegments,
	validateResearchStatusSegment,
	validateResearchStatusSegments,
} from "../src/status/validation";

describe("ResearchStatusSegment validation", () => {
	test("accepts concise independently omittable status segments", () => {
		const result = validateResearchStatusSegment({
			id: "status_phase",
			label: "phase",
			value: "reviewing",
			priority: 20,
			state: "active",
			sourceEventId: "evt_test_001",
		});

		expect(result).toEqual({ valid: true, issues: [] });
	});

	test("orders segments by priority, then label, then id", () => {
		const segments: ResearchStatusSegment[] = [
			{ id: "status_run", label: "run", value: "run_001", priority: 40 },
			{ id: "status_gate", label: "gate", value: "open", priority: 20 },
			{ id: "status_phase", label: "phase", value: "reviewing", priority: 20 },
			{ id: "status_model", label: "model", value: "gpt-5-codex", priority: 10 },
		];

		expect(sortResearchStatusSegments(segments).map(segment => segment.id)).toEqual([
			"status_model",
			"status_gate",
			"status_phase",
			"status_run",
		]);
	});

	test("rejects labels that are too long to be concise status chrome", () => {
		const result = validateResearchStatusSegment({
			id: "status_long",
			label: "research-phase-that-is-too-long",
			value: "reviewing",
			priority: 10,
		});

		expect(result.valid).toBe(false);
		expect(result.issues).toContainEqual({
			path: "$.label",
			message: "Expected string length at most 16",
		});
	});

	test("rejects duplicate IDs across a status segment set", () => {
		const result = validateResearchStatusSegments([
			{ id: "status_phase", label: "phase", value: "reviewing", priority: 10 },
			{ id: "status_phase", label: "gate", value: "open", priority: 20 },
		]);

		expect(result.valid).toBe(false);
		expect(result.issues).toContainEqual({
			path: "$[1].id",
			message: "Expected unique status segment ID",
		});
	});
});
