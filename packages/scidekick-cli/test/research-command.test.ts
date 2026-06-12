import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { appendResearchEventLogEvents } from "@scidekick/runtime";
import { runResearchCommand } from "../src/commands/research";
import { representativeResearchEvents } from "../src/fixtures/research-events";

describe("research command adapter", () => {
	test("exports a transcript by replaying .sk/research events instead of terminal scrollback", async () => {
		const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "scidekick-research-command-"));
		await appendResearchEventLogEvents(
			{ workspacePath, sessionId: "rs_copy_friendly_fixture" },
			representativeResearchEvents,
		);

		const output = await runResearchCommand({
			argv: ["export", "--session", "rs_copy_friendly_fixture"],
			workspacePath,
			now: () => "2026-06-11T20:30:00.000Z",
		});

		expect(output.renderedPath).toEndWith(".sk/research/exports/export_rs_copy_friendly_fixture.md");
		expect(output.manifestPath).toEndWith(".sk/research/exports/export_rs_copy_friendly_fixture.json");
		expect(output.text).toContain("event: evt_fixture_006");
		expect(output.text).toContain("claim: claim_copy_safe_transcript");

		const rendered = await Bun.file(path.join(workspacePath, output.renderedPath)).text();
		expect(rendered).toContain("event: evt_fixture_006");
		expect(rendered).not.toContain("terminal scrollback");
	});
});
