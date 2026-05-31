/**
 * Install science skills from a remote repository.
 *
 * Downloads a skills repo, extracts SKILL.md files, and installs them into
 * the user's skill directory (~/.sk/agent/skills/), where the native provider
 * discovers them on the next agent session.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Args, Command, Flags } from "@oh-my-pi/pi-utils/cli";
import { $ } from "bun";
import { SkillRegistry } from "../scidekick-guard/skill-registry";

/** Default skills repository. */
const DEFAULT_SKILLS_REPO = "https://github.com/felippe-alves/scientific-agent-skills";

/** Scratch directory for cloning repos. */
const STAGING_DIR = path.join(getAgentDir(), "skills-staging");

/**
 * Pattern for SKILL.md files. Skills are markdown files with YAML frontmatter
 * that contain a `name` field. The directory containing the SKILL.md is the
 * skill's install name.
 */
const SKILL_FILE = "SKILL.md";

interface InstallResult {
	name: string;
	dest: string;
	existed: boolean;
}

export default class InstallSkills extends Command {
	static description = "Install science skills from a repository";
	static aliases = ["skills"];

	static args = {
		repo: Args.string({
			description: "Git repository URL or GitHub shorthand (org/repo)",
			required: false,
			default: DEFAULT_SKILLS_REPO,
		}),
	};

	static flags = {
		from: Flags.string({
			char: "f",
			description: "Repository URL or GitHub shorthand to install skills from",
		}),
		list: Flags.boolean({
			char: "l",
			description: "List available skills without installing",
		}),
		skill: Flags.string({
			char: "s",
			description: "Install a specific skill by name (repeatable)",
			multiple: true,
		}),
		global: Flags.boolean({
			char: "g",
			description: "Install globally (user-level, default for non-project dirs)",
			allowNo: true,
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(InstallSkills);
		const repoUrl = resolveRepoUrl(flags.from ?? args.repo ?? DEFAULT_SKILLS_REPO);
		const targetDir = path.join(getAgentDir(), "skills");
		// Clone repo into staging
		await fs.rm(STAGING_DIR, { recursive: true, force: true });
		await fs.mkdir(STAGING_DIR, { recursive: true });

		process.stdout.write(`Cloning ${repoUrl}...\n`);
		const cloneResult = await $`git clone --depth 1 --filter=blob:none ${repoUrl} ${STAGING_DIR}`.quiet().nothrow();

		if (cloneResult.exitCode !== 0) {
			const stderr = cloneResult.stderr.toString();
			// GitHub 404 returns "not found" or "repository not found"
			if (/not found|repository.*not/i.test(stderr)) {
				process.stderr.write(`error: Repository not found: ${repoUrl}\n`);
				process.stderr.write(`       Check the URL or try: sk install-skills --help\n`);
			} else {
				process.stderr.write(`error: Failed to clone repository:\n${stderr.trim()}\n`);
			}
			process.exit(1);
		}

		// Find all SKILL.md files
		const skillFiles = await findSkillFiles(STAGING_DIR);
		if (skillFiles.length === 0) {
			process.stderr.write("No SKILL.md files found in the repository.\n");
			process.exit(1);
		}

		// Parse skill names from frontmatter
		const skills = await Promise.all(skillFiles.map(parseSkillManifest));

		if (flags.list) {
			process.stdout.write(`\nAvailable skills (${skills.length}):\n`);
			for (const skill of skills) {
				const desc = skill.description ? ` — ${skill.description}` : "";
				process.stdout.write(`  ${skill.name}${desc}\n`);
			}
			return;
		}

		// Filter by --skill flag if provided
		const requestedNames = flags.skill;
		const toInstall = requestedNames ? skills.filter(s => requestedNames.includes(s.name)) : skills;

		if (requestedNames && toInstall.length === 0) {
			process.stderr.write(
				`error: None of the requested skills found: ${requestedNames.join(", ")}\n` +
					`       Available: ${skills.map(s => s.name).join(", ")}\n`,
			);
			process.exit(1);
		}

		// Install each skill
		await fs.mkdir(targetDir, { recursive: true });
		const results: InstallResult[] = [];

		for (const skill of toInstall) {
			const destDir = path.join(targetDir, skill.name);
			const existed = await dirExists(destDir);
			await fs.mkdir(destDir, { recursive: true });
			await fs.copyFile(skill.sourcePath, path.join(destDir, SKILL_FILE));
			results.push({ name: skill.name, dest: destDir, existed });
		}
		// Track installs in the skill registry
		const registry = new SkillRegistry();
		for (const r of results) {
			registry.trackInstall({ name: r.name, source_url: repoUrl });
		}
		registry.close();

		// Report
		process.stdout.write(`\nInstalled ${results.length} skill(s) to ${targetDir}:\n`);
		for (const r of results) {
			const tag = r.existed ? " (updated)" : " (new)";
			process.stdout.write(`  ${r.name}${tag}\n`);
		}

		// Cleanup staging
		await fs.rm(STAGING_DIR, { recursive: true, force: true });
	}
}

/** Parse a GitHub shorthand like "org/repo" into a full URL. */
function resolveRepoUrl(input: string): string {
	if (/^https?:\/\//.test(input)) return input;
	if (/^[\w.-]+\/[\w.-]+$/.test(input)) return `https://github.com/${input}`;
	return input;
}

async function dirExists(p: string): Promise<boolean> {
	try {
		const stat = await fs.stat(p);
		return stat.isDirectory();
	} catch {
		return false;
	}
}

interface SkillManifest {
	name: string;
	description: string;
	sourcePath: string;
}

/** Find all SKILL.md files recursively under `dir`, excluding hidden directories. */
async function findSkillFiles(dir: string): Promise<string[]> {
	const results: string[] = [];
	async function walk(current: string) {
		const entries = await fs.readdir(current, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				await walk(full);
			} else if (entry.name === SKILL_FILE) {
				results.push(full);
			}
		}
	}
	await walk(dir);
	return results;
}

/** Read a SKILL.md and extract the skill name and description from frontmatter. */
async function parseSkillManifest(filePath: string): Promise<SkillManifest> {
	const content = await fs.readFile(filePath, "utf-8");
	const dirName = path.basename(path.dirname(filePath));

	// Frontmatter is YAML between --- markers at the start of the file
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
