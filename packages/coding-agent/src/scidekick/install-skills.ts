import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { getAgentDir, getProjectAgentDir, getProjectDir } from "@oh-my-pi/pi-utils";
import { $, YAML } from "bun";
import { SkillRegistry } from "./skill-registry";

export const DEFAULT_SKILLS_REPO = "https://github.com/felippe-alves/scientific-agent-skills";
const SKILL_FILE = "SKILL.md";

export interface SkillManifest {
	name: string;
	description: string;
	sourcePath: string;
	sourceDir: string;
}

export interface InstallSkillsOptions {
	repo: string;
	listOnly: boolean;
	requestedSkillNames: string[];
	project: boolean;
	cwd?: string;
}

export interface InstallSkillsResult {
	repoUrl: string;
	targetDir: string;
	listed: SkillManifest[];
	installed: Array<{ name: string; dest: string; existed: boolean }>;
}

export async function runInstallSkills(options: InstallSkillsOptions): Promise<InstallSkillsResult> {
	const repoUrl = resolveRepoSource(options.repo);
	const targetDir = options.project
		? path.join(getProjectAgentDir(options.cwd ?? getProjectDir()), "skills")
		: path.join(getAgentDir(), "skills");
	const stagingRoot = await fs.mkdtemp(path.join(os.tmpdir(), "sk-install-skills-"));

	try {
		const clone = await $`git clone --depth 1 --filter=blob:none ${repoUrl} ${stagingRoot}`.quiet().nothrow();
		if (clone.exitCode !== 0) {
			const stderr = clone.stderr.toString().trim();
			throw new Error(stderr ? `Failed to clone repository: ${stderr}` : `Failed to clone repository: ${repoUrl}`);
		}

		const skillFiles = await findSkillFiles(stagingRoot);
		if (skillFiles.length === 0) {
			throw new Error("No SKILL.md files found in the repository.");
		}

		const manifests = await Promise.all(skillFiles.map(filePath => parseSkillManifest(filePath)));
		const requestedNames = new Set(options.requestedSkillNames);
		const selected =
			requestedNames.size === 0 ? manifests : manifests.filter(skill => requestedNames.has(skill.name));
		if (requestedNames.size > 0 && selected.length === 0) {
			throw new Error(`None of the requested skills were found: ${[...requestedNames].join(", ")}`);
		}

		if (options.listOnly) {
			return { repoUrl, targetDir, listed: manifests, installed: [] };
		}

		await fs.mkdir(targetDir, { recursive: true });
		const registry = new SkillRegistry();
		try {
			const installed: Array<{ name: string; dest: string; existed: boolean }> = [];
			for (const skill of selected) {
				const dest = path.join(targetDir, sanitizeSkillDirName(skill.name));
				const existed = await dirExists(dest);
				await fs.rm(dest, { recursive: true, force: true });
				await fs.cp(skill.sourceDir, dest, { recursive: true, force: true });
				registry.trackInstall({ name: skill.name, sourceUrl: repoUrl });
				installed.push({ name: skill.name, dest, existed });
			}
			return { repoUrl, targetDir, listed: manifests, installed };
		} finally {
			registry.close();
		}
	} finally {
		await fs.rm(stagingRoot, { recursive: true, force: true });
	}
}

export function resolveRepoSource(input: string): string {
	if (/^https?:\/\//.test(input)) return input;
	if (/^[\w.-]+\/[\w.-]+$/.test(input)) return `https://github.com/${input}`;
	return path.resolve(input);
}

export async function findSkillFiles(dir: string): Promise<string[]> {
	const results: string[] = [];

	async function walk(current: string): Promise<void> {
		const entries = await fs.readdir(current, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				await walk(full);
				continue;
			}
			if (entry.name === SKILL_FILE) {
				results.push(full);
			}
		}
	}

	await walk(dir);
	return results.sort();
}

export async function parseSkillManifest(filePath: string): Promise<SkillManifest> {
	const content = await Bun.file(filePath).text();
	const sourceDir = path.dirname(filePath);
	const fallbackName = path.basename(sourceDir);
	let name = fallbackName;
	let description = "";

	if (content.startsWith("---")) {
		const endIdx = content.indexOf("---", 3);
		if (endIdx > 0) {
			const frontmatter = content.slice(3, endIdx);
			const parsed = YAML.parse(frontmatter) as Record<string, unknown> | null;
			if (parsed && typeof parsed.name === "string" && parsed.name.trim().length > 0) {
				name = parsed.name.trim();
			}
			if (parsed && typeof parsed.description === "string") {
				description = parsed.description.trim();
			}
		}
	}

	return { name, description, sourcePath: filePath, sourceDir };
}

function sanitizeSkillDirName(name: string): string {
	return (
		name
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9._-]+/g, "-")
			.replace(/^-+|-+$/g, "") || "skill"
	);
}

async function dirExists(p: string): Promise<boolean> {
	try {
		return (await fs.stat(p)).isDirectory();
	} catch {
		return false;
	}
}
