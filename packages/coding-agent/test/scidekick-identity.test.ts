import { describe, expect, it } from "bun:test";
import * as path from "node:path";

const packageDir = path.join(import.meta.dir, "..");
const repoRoot = path.join(packageDir, "..", "..");
const cliPath = path.join(packageDir, "src", "cli.ts");

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const proc = Bun.spawn(["bun", "run", cliPath, ...args], {
		cwd: repoRoot,
		env: {
			...Bun.env,
			HOME: path.join(repoRoot, ".tmp-sk-test-home"),
			XDG_DATA_HOME: path.join(repoRoot, ".tmp-sk-test-xdg-data"),
			NO_COLOR: "1",
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

describe("Scidekick CLI identity", () => {
	it("prints sk as the default app name in version output", async () => {
		const result = await runCli(["--version"]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toMatch(/^sk\/\d+\.\d+\.\d+/);
	});

	it("uses sk and .sk in root help examples", async () => {
		const result = await runCli(["--help"]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("$ sk [COMMAND]");
		expect(result.stdout).toContain("sk agents unpack");
		expect(result.stdout).toContain("~/.sk/agent/agents");
		expect(result.stdout).toContain("./.sk/agents");
	});

	it("points local binary builds at dist/sk", async () => {
		const script = await Bun.file(path.join(packageDir, "scripts", "build-binary.ts")).text();

		expect(script).toContain('"dist", "sk"');
		expect(script).toContain('"dist/sk"');
		expect(script).not.toContain('"dist", "omp"');
		expect(script).not.toContain('"dist/omp"');
	});

	it("names release binaries sk-*", async () => {
		const script = await Bun.file(path.join(repoRoot, "scripts", "ci-release-build-binaries.ts")).text();

		expect(script).toContain("packages/coding-agent/binaries/sk-linux-x64");
		expect(script).toContain("packages/coding-agent/binaries/sk-darwin-arm64");
		expect(script).toContain("packages/coding-agent/binaries/sk-windows-x64.exe");
		expect(script).not.toContain("packages/coding-agent/binaries/omp-linux-x64");
	});
});
