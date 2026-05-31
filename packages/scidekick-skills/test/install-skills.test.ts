import { describe, expect, it } from "bun:test";

// Tests for the pure utility functions extracted from install-skills command.
// These test repo URL resolution, skill file discovery, and frontmatter parsing
// without requiring git or network access.

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

// ── Inline the functions under test ──
// (duplicated from install-skills.ts since they're not exported;
//  testing through the CLI binary would require network)

function resolveRepoUrl(input: string): string {
	if (/^https?:\/\//.test(input)) return input;
	if (/^[\w.-]+\/[\w.-]+$/.test(input)) return `https://github.com/${input}`;
	return input;
}

interface SkillManifest {
	name: string;
	description: string;
	sourcePath: string;
}

async function findSkillFiles(dir: string): Promise<string[]> {
	const results: string[] = [];
	async function walk(current: string) {
		const entries = await fs.readdir(current, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				await walk(full);
			} else if (entry.name === "SKILL.md") {
				results.push(full);
			}
		}
	}
	await walk(dir);
	return results;
}

async function parseSkillManifest(filePath: string): Promise<SkillManifest> {
	const content = await fs.readFile(filePath, "utf-8");
	const dirName = path.basename(path.dirname(filePath));

	let name = dirName;
	let description = "";

	if (content.startsWith("---")) {
		const endIdx = content.indexOf("---", 3);
		if (endIdx > 0) {
			const frontmatter = content.slice(3, endIdx);
			for (const line of frontmatter.split("\n")) {
				const match = line.match(/^(\w[\w\s]*?):\s*(.*)$/);
				if (match) {
					const key = match[1].trim().toLowerCase();
					const value = match[2].trim();
					if (key === "name") name = value;
					if (key === "description") description = value;
				}
			}
		}
	}

	return { name, description, sourcePath: filePath };
}

// ── Tests ──

describe("resolveRepoUrl", () => {
	it("passes through full HTTPS URLs", () => {
		expect(resolveRepoUrl("https://github.com/org/repo")).toBe("https://github.com/org/repo");
	});

	it("converts GitHub shorthand to full URL", () => {
		expect(resolveRepoUrl("felippe-alves/scientific-agent-skills")).toBe(
			"https://github.com/felippe-alves/scientific-agent-skills",
		);
	});

	it("passes through git SSH URLs", () => {
		expect(resolveRepoUrl("git@github.com:org/repo.git")).toBe("git@github.com:org/repo.git");
	});
});

describe("findSkillFiles", () => {
	it("finds SKILL.md files in nested directories", async () => {
		const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "sk-test-"));
		try {
			await fs.mkdir(path.join(tmp, "skill-a"), { recursive: true });
			await fs.writeFile(path.join(tmp, "skill-a", "SKILL.md"), "---\nname: a\n---\n# A");
			await fs.mkdir(path.join(tmp, "nested", "skill-b"), { recursive: true });
			await fs.writeFile(path.join(tmp, "nested", "skill-b", "SKILL.md"), "---\nname: b\n---\n# B");
			await fs.writeFile(path.join(tmp, "README.md"), "# Readme");

			const files = await findSkillFiles(tmp);
			expect(files).toHaveLength(2);
			expect(files.every(f => f.endsWith("SKILL.md"))).toBe(true);
		} finally {
			await fs.rm(tmp, { recursive: true, force: true });
		}
	});

	it("skips hidden directories and node_modules", async () => {
		const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "sk-test-"));
		try {
			await fs.mkdir(path.join(tmp, ".hidden", "skill"), { recursive: true });
			await fs.writeFile(path.join(tmp, ".hidden", "skill", "SKILL.md"), "---\nname: hidden\n---\n# H");
			await fs.mkdir(path.join(tmp, "node_modules", "skill"), { recursive: true });
			await fs.writeFile(path.join(tmp, "node_modules", "skill", "SKILL.md"), "---\nname: nm\n---\n# NM");

			const files = await findSkillFiles(tmp);
			expect(files).toHaveLength(0);
		} finally {
			await fs.rm(tmp, { recursive: true, force: true });
		}
	});

	it("returns empty for dirs with no SKILL.md", async () => {
		const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "sk-test-"));
		try {
			await fs.writeFile(path.join(tmp, "README.md"), "# Readme");
			const files = await findSkillFiles(tmp);
			expect(files).toHaveLength(0);
		} finally {
			await fs.rm(tmp, { recursive: true, force: true });
		}
	});
});

describe("parseSkillManifest", () => {
	it("extracts name and description from frontmatter", async () => {
		const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "sk-test-"));
		try {
			const skillDir = path.join(tmp, "my-skill");
			await fs.mkdir(skillDir);
			const filePath = path.join(skillDir, "SKILL.md");
			await fs.writeFile(
				filePath,
				"---\nname: My Skill\ndescription: Does something useful\n---\n\n# My Skill\n\nContent here.",
			);

			const manifest = await parseSkillManifest(filePath);
			expect(manifest.name).toBe("My Skill");
			expect(manifest.description).toBe("Does something useful");
			expect(manifest.sourcePath).toBe(filePath);
		} finally {
			await fs.rm(tmp, { recursive: true, force: true });
		}
	});

	it("falls back to directory name when no frontmatter name", async () => {
		const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "sk-test-"));
		try {
			const skillDir = path.join(tmp, "dir-name");
			await fs.mkdir(skillDir);
			const filePath = path.join(skillDir, "SKILL.md");
			await fs.writeFile(filePath, "# No frontmatter\n\nJust content.");

			const manifest = await parseSkillManifest(filePath);
			expect(manifest.name).toBe("dir-name");
			expect(manifest.description).toBe("");
		} finally {
			await fs.rm(tmp, { recursive: true, force: true });
		}
	});

	it("handles empty frontmatter body", async () => {
		const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "sk-test-"));
		try {
			const skillDir = path.join(tmp, "empty");
			await fs.mkdir(skillDir);
			const filePath = path.join(skillDir, "SKILL.md");
			await fs.writeFile(filePath, "---\n---\n\n# Empty frontmatter");

			const manifest = await parseSkillManifest(filePath);
			expect(manifest.name).toBe("empty");
		} finally {
			await fs.rm(tmp, { recursive: true, force: true });
		}
	});
});
