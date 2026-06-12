import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { ResearchExportManifest } from "../src/events/render-types";
import type { ResearchTranscriptEvent } from "../src/events/types";
import {
	appendResearchEventLogEvents,
	getResearchEventLogPath,
	ResearchEventLogError,
	readResearchEventLog,
} from "../src/research-store/event-log";
import {
	getResearchExportManifestPath,
	readResearchExportManifest,
	writeResearchExportManifest,
} from "../src/research-store/export-manifest";

describe("research store contracts", () => {
	test("replays appended JSONL events in sequence order", async () => {
		const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "scidekick-events-"));
		const location = { workspacePath, sessionId: "rs_store_test" };
		const events = makeEvents();

		await appendResearchEventLogEvents(location, events);
		const replayed = await readResearchEventLog(location);

		expect(replayed.map(event => event.id)).toEqual(["evt_store_001", "evt_store_002"]);
		expect(replayed.map(event => event.sequence)).toEqual([1, 2]);
		expect(getResearchEventLogPath(location)).toEndWith(".sk/research/sessions/rs_store_test/events.jsonl");
	});

	test("surfaces malformed JSONL as a store error", async () => {
		const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "scidekick-malformed-"));
		const filePath = path.join(workspacePath, ".sk", "research", "sessions", "rs_bad", "events.jsonl");
		await Bun.write(filePath, "{not-json}\n");

		await expect(readResearchEventLog(filePath)).rejects.toBeInstanceOf(ResearchEventLogError);
	});

	test("persists and reads export manifests under .sk/research/exports", async () => {
		const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "scidekick-manifest-"));
		const location = { workspacePath, exportId: "export_store_test" };
		const manifest: ResearchExportManifest = {
			exportId: "export_store_test",
			sessionId: "rs_store_test",
			profile: "plain",
			createdAt: "2026-06-11T20:00:00.000Z",
			eventRange: { firstSequence: 1, lastSequence: 2 },
			sourceEventLog: ".sk/research/sessions/rs_store_test/events.jsonl",
			renderedPath: ".sk/research/exports/export_store_test.md",
			references: {
				runs: ["run_store_test"],
				traces: [],
				claims: [],
				evidence: [],
				reviewRounds: [],
				reviewIssues: [],
				rawArtifacts: [],
			},
		};

		await writeResearchExportManifest(location, manifest);
		const readBack = await readResearchExportManifest(location);

		expect(readBack).toEqual(manifest);
		expect(getResearchExportManifestPath(location)).toEndWith(".sk/research/exports/export_store_test.json");
	});
});

function makeEvents(): ResearchTranscriptEvent[] {
	return [
		{
			id: "evt_store_001",
			sessionId: "rs_store_test",
			timestamp: "2026-06-11T20:00:00.000Z",
			sequence: 1,
			kind: "message",
			body: "Started store test.",
		},
		{
			id: "evt_store_002",
			sessionId: "rs_store_test",
			timestamp: "2026-06-11T20:00:01.000Z",
			sequence: 2,
			kind: "run_summary",
			references: [{ type: "run", id: "run_store_test" }],
		},
	];
}
