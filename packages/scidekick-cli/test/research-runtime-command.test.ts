import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { readResearchEventLog, readResearchSessionState } from "@scidekick/runtime";
import { runResearchCommand } from "../src/commands/research";

describe("research runtime command adapter", () => {
	test("initializes, reports, and plans against durable .sk/research state", async () => {
		const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "scidekick-runtime-command-"));

		const init = await runResearchCommand({
			argv: [
				"init",
				"--session",
				"rs_command_runtime",
				"--objective",
				"Make Scidekick v2 runtime state independent from coding-agent session internals.",
			],
			workspacePath,
			now: () => "2026-06-12T13:00:00.000Z",
		});

		expect(init.text).toContain("Initialized research session rs_command_runtime");
		expect(init.text).toContain("phase: intake");

		const plan = await runResearchCommand({
			argv: [
				"plan",
				"--session",
				"rs_command_runtime",
				"--title",
				"Runtime foundation",
				"--evidence",
				"State tests pass",
				"--success",
				"Status shows the active plan",
				"--stop",
				"Stop before execution",
				"--rollback",
				"Restore previous session state from git",
			],
			workspacePath,
			now: () => "2026-06-12T13:01:00.000Z",
		});

		expect(plan.text).toContain("Recorded research plan plan_rs_command_runtime");
		expect(plan.text).toContain("phase: plan");

		const status = await runResearchCommand({
			argv: ["status", "--session", "rs_command_runtime"],
			workspacePath,
			now: () => "2026-06-12T13:02:00.000Z",
		});

		expect(status.text).toContain("session: rs_command_runtime");
		expect(status.text).toContain("phase: plan");
		expect(status.text).toContain("active plan: plan_rs_command_runtime");
		expect(status.text).toContain("gate plan: satisfied");

		const session = await readResearchSessionState({ workspacePath, sessionId: "rs_command_runtime" });
		const events = await readResearchEventLog({ workspacePath, sessionId: "rs_command_runtime" });

		expect(session?.plans[0]?.successCriteria).toEqual(["Status shows the active plan"]);
		expect(events.map(event => event.sequence)).toEqual([1, 2]);
	});
});
