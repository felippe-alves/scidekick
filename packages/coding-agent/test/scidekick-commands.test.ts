import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");
const cliPath = path.join(repoRoot, "packages", "coding-agent", "src", "cli.ts");

let tempRoot = "";
let agentDir = "";
let homeDir = "";

beforeEach(async () => {
	tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "sk-command-test-"));
	homeDir = path.join(tempRoot, "home");
	agentDir = path.join(homeDir, ".sk", "agent");
	await fs.mkdir(agentDir, { recursive: true });
});

afterEach(async () => {
	await fs.rm(tempRoot, { recursive: true, force: true });
});

async function runCli(args: string[], extraEnv: Record<string, string> = {}) {
	const proc = Bun.spawn(["bun", "run", cliPath, ...args], {
		cwd: tempRoot,
		env: {
			...Bun.env,
			HOME: homeDir,
			PI_CODING_AGENT_DIR: agentDir,
			NO_COLOR: "1",
			...extraEnv,
		},
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { stdout, stderr, exitCode };
}

async function createSkillRepo(): Promise<string> {
	const repoDir = path.join(tempRoot, "skills-repo");
	await fs.mkdir(path.join(repoDir, "literature-review"), { recursive: true });
	await fs.mkdir(path.join(repoDir, "hypothesis-generation"), { recursive: true });
	await Bun.write(
		path.join(repoDir, "literature-review", "SKILL.md"),
		`---\nname: literature-review\ndescription: Review literature carefully\n---\n\n# Literature Review\n`,
	);
	await Bun.write(
		path.join(repoDir, "hypothesis-generation", "SKILL.md"),
		`---\nname: hypothesis-generation\ndescription: Generate hypotheses\n---\n\n# Hypothesis Generation\n`,
	);

	for (const command of [
		["git", "init", "-b", "main"],
		["git", "config", "user.email", "test@example.com"],
		["git", "config", "user.name", "Scidekick Tests"],
		["git", "add", "."],
		["git", "commit", "-m", "fixture"],
	] as const) {
		const proc = Bun.spawn([...command], { cwd: repoDir, stdout: "pipe", stderr: "pipe" });
		const exitCode = await proc.exited;
		if (exitCode !== 0) {
			throw new Error(`git command failed: ${command.join(" ")}`);
		}
	}
	return repoDir;
}

describe("Scidekick install-skills command", () => {
	it(
		"lists available skills from a local fixture repository",
		async () => {
			const repoDir = await createSkillRepo();
			const result = await runCli(["install-skills", "--list", "--from", repoDir]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Available skills");
			expect(result.stdout).toContain("literature-review — Review literature carefully");
			expect(result.stdout).toContain("hypothesis-generation — Generate hypotheses");
		},
		{ timeout: 30000 },
	);

	it(
		"installs selected skills and records them in the registry",
		async () => {
			const repoDir = await createSkillRepo();
			const result = await runCli(["install-skills", "--from", repoDir, "--skill", "literature-review"]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Installed 1 skill(s)");
			const installedSkill = path.join(agentDir, "skills", "literature-review", "SKILL.md");
			expect(await Bun.file(installedSkill).text()).toContain("# Literature Review");

			const db = new Database(path.join(agentDir, "agent.db"), { readonly: true });
			try {
				const row = db
					.prepare("SELECT name, source_url FROM skill_metadata WHERE name = ?")
					.get("literature-review") as { name: string; source_url: string } | undefined;
				expect(row).toEqual({ name: "literature-review", source_url: path.resolve(repoDir) });
			} finally {
				db.close();
			}
		},
		{ timeout: 30000 },
	);
});

describe("Scidekick wiki command", () => {
	it(
		"creates, lists, shows, and lints a hypothesis entry",
		async () => {
			const create = await runCli(["wiki", "new", "hypothesis", "Catalyst lowers activation energy"]);
			expect(create.exitCode).toBe(0);
			expect(create.stdout).toContain("Created catalyst-lowers-activation-energy");

			const wikiIndex = path.join(tempRoot, ".sk", "wiki", "index.md");
			expect(await Bun.file(wikiIndex).text()).toContain("# Research Wiki");
			const list = await runCli(["wiki", "list"]);
			expect(list.exitCode).toBe(0);
			expect(list.stdout).toContain(
				"catalyst-lowers-activation-energy\thypothesis\tCatalyst lowers activation energy",
			);

			const show = await runCli(["wiki", "show", "catalyst-lowers-activation-energy"]);
			expect(show.exitCode).toBe(0);
			expect(show.stdout).toContain("type: hypothesis");
			expect(show.stdout).toContain("# Hypothesis: Catalyst lowers activation energy");

			const lint = await runCli(["wiki", "lint", "catalyst-lowers-activation-energy"]);
			expect(lint.exitCode).toBe(0);
			expect(lint.stdout).toContain("OK: catalyst-lowers-activation-energy");
		},
		{ timeout: 30000 },
	);

	it(
		"initializes project wiki pages and queries them",
		async () => {
			const init = await runCli(["wiki", "init"]);
			expect(init.exitCode).toBe(0);
			expect(init.stdout).toContain(path.join(tempRoot, ".sk", "wiki"));

			const page = await runCli(["wiki", "page", "Baseline eval"]);
			expect(page.exitCode).toBe(0);
			expect(page.stdout).toContain("Created baseline-eval");

			const query = await runCli(["wiki", "query", "Baseline"]);
			expect(query.exitCode).toBe(0);
			expect(query.stdout).toContain("baseline-eval\tnote\tBaseline eval");
		},
		{ timeout: 30000 },
	);
});

describe("Scidekick journal command", () => {
	it(
		"initializes, appends, prints, and links journal entries",
		async () => {
			const init = await runCli(["journal", "init"]);
			expect(init.exitCode).toBe(0);
			expect(init.stdout).toContain(path.join(tempRoot, ".sk", "journal"));

			const add = await runCli(["journal", "add", "Tried baseline eval"]);
			expect(add.exitCode).toBe(0);
			expect(add.stdout).toContain("Added ");
			const entryId = add.stdout.match(/Added (\d{4}-\d{2}-\d{2}-\d{6})/)?.[1];
			expect(entryId).toBeDefined();

			const today = await runCli(["journal", "today"]);
			expect(today.exitCode).toBe(0);
			expect(today.stdout).toContain("Tried baseline eval");

			const link = await runCli(["journal", "link", entryId!, "wiki:baseline-eval"]);
			expect(link.exitCode).toBe(0);
			expect(link.stdout).toContain(`Linked ${entryId} to wiki:baseline-eval`);

			const linkedToday = await runCli(["journal", "today"]);
			expect(linkedToday.stdout).toContain("- wiki:baseline-eval");
		},
		{ timeout: 30000 },
	);
});
