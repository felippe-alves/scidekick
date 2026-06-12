import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const FORBIDDEN_IMPORTS = ["@oh-my-pi/pi-tui", "@oh-my-pi/pi-coding-agent", "packages/coding-agent"];

describe("runtime dependency boundary", () => {
	test("runtime source does not import TUI or coding-agent internals", async () => {
		const sourceDir = path.join(import.meta.dir, "..", "src");
		const files = await collectTypeScriptFiles(sourceDir);
		const offenders: string[] = [];

		for (const file of files) {
			const text = await Bun.file(file).text();
			for (const forbidden of FORBIDDEN_IMPORTS) {
				if (text.includes(forbidden)) offenders.push(`${path.relative(sourceDir, file)} imports ${forbidden}`);
			}
		}

		expect(offenders).toEqual([]);
	});
});

async function collectTypeScriptFiles(dir: string): Promise<string[]> {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const entryPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectTypeScriptFiles(entryPath)));
		} else if (entry.isFile() && entry.name.endsWith(".ts")) {
			files.push(entryPath);
		}
	}
	return files;
}
