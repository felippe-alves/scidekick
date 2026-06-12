import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	createResearchSession,
	getResearchProjectStatePath,
	getResearchSessionStatePath,
	ResearchStateError,
	readResearchProjectState,
	readResearchSessionState,
	recordResearchPlan,
} from "../src/research-state";
import { readResearchEventLog } from "../src/research-store/event-log";

describe("research runtime state", () => {
	test("initializes a durable research session with an intake phase and event log", async () => {
		const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "scidekick-state-init-"));

		const session = await createResearchSession({
			workspacePath,
			sessionId: "rs_runtime_foundation",
			objective: "Measure whether transcript exports preserve claim and evidence IDs.",
			now: () => "2026-06-12T12:00:00.000Z",
		});

		expect(session.phase).toBe("intake");
		expect(session.objective).toBe("Measure whether transcript exports preserve claim and evidence IDs.");
		expect(session.gates.map(gate => `${gate.id}:${gate.state}`)).toEqual([
			"objective:satisfied",
			"scope:missing",
			"plan:missing",
		]);
		expect(getResearchProjectStatePath({ workspacePath })).toEndWith(".sk/research/state.json");
		expect(getResearchSessionStatePath({ workspacePath, sessionId: "rs_runtime_foundation" })).toEndWith(
			".sk/research/sessions/rs_runtime_foundation/state.json",
		);

		const projectState = await readResearchProjectState({ workspacePath });
		const sessionState = await readResearchSessionState({ workspacePath, sessionId: "rs_runtime_foundation" });
		const events = await readResearchEventLog({ workspacePath, sessionId: "rs_runtime_foundation" });

		expect(projectState?.currentSessionId).toBe("rs_runtime_foundation");
		expect(sessionState?.sessionId).toBe("rs_runtime_foundation");
		expect(events.map(event => event.id)).toEqual(["evt_rs_runtime_foundation_0001"]);
		expect(events[0]?.references).toContainEqual({ type: "session", id: "rs_runtime_foundation" });
	});

	test("records a draft plan only when evidence, success, stop, and rollback gates are present", async () => {
		const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "scidekick-state-plan-"));
		await createResearchSession({
			workspacePath,
			sessionId: "rs_plan_gate",
			objective: "Evaluate the durable runtime state gate contract.",
			now: () => "2026-06-12T12:00:00.000Z",
		});

		await expect(
			recordResearchPlan({
				workspacePath,
				sessionId: "rs_plan_gate",
				plan: {
					id: "plan_missing_gates",
					title: "Incomplete plan",
					objective: "Evaluate the durable runtime state gate contract.",
					expectedEvidence: [],
					successCriteria: ["State file is persisted."],
					stopCondition: "Stop after package-local tests pass.",
					rollbackPlan: "",
				},
				now: () => "2026-06-12T12:01:00.000Z",
			}),
		).rejects.toBeInstanceOf(ResearchStateError);

		const session = await recordResearchPlan({
			workspacePath,
			sessionId: "rs_plan_gate",
			plan: {
				id: "plan_runtime_foundation",
				title: "Durable runtime foundation",
				objective: "Evaluate the durable runtime state gate contract.",
				expectedEvidence: ["Package-local state tests pass."],
				successCriteria: ["Session status reports the active plan."],
				stopCondition: "Stop before experiment execution.",
				rollbackPlan: "Delete the draft plan record and keep the intake event log.",
			},
			now: () => "2026-06-12T12:01:00.000Z",
		});

		expect(session.phase).toBe("plan");
		expect(session.currentPlanId).toBe("plan_runtime_foundation");
		expect(session.gates.map(gate => `${gate.id}:${gate.state}`)).toEqual([
			"objective:satisfied",
			"scope:missing",
			"plan:satisfied",
		]);

		const readBack = await readResearchSessionState({ workspacePath, sessionId: "rs_plan_gate" });
		const events = await readResearchEventLog({ workspacePath, sessionId: "rs_plan_gate" });

		expect(readBack?.plans[0]?.rollbackPlan).toBe("Delete the draft plan record and keep the intake event log.");
		expect(events.map(event => event.sequence)).toEqual([1, 2]);
		expect(events[1]?.references).toContainEqual({ type: "file", id: "plan_runtime_foundation" });
	});
});
