#!/usr/bin/env bun

import * as fs from "node:fs/promises";
import * as path from "node:path";

interface BinaryTarget {
	id: string;
	platform: string;
	arch: string;
	target: string;
	outfile: string;
}

interface ReleaseManifestArtifact {
	name: string;
	platform: string;
	arch: string;
	target: string;
	sha256: string;
	size: number;
}

interface CodingAgentManifest {
	version: string;
	generatedAt: string;
	artifacts: ReleaseManifestArtifact[];
}

const repoRoot = path.join(import.meta.dir, "..");
const binariesDir = path.join(repoRoot, "packages", "coding-agent", "binaries");
const entrypoint = "./packages/coding-agent/src/cli.ts";
// Worker entrypoints. Bun's `--compile` static analyzer discovers the
// literal in `new Worker("…", …)` at each spawn site, but only actually
// emits the worker into the bunfs root when it is also listed here as an
// explicit additional entry. Paths are repo-root-relative (matching
// `--root .` below) so the workers land at
// `/$bunfs/root/packages/<pkg>/src/<worker>.js`, which is exactly what the
// literals at the spawn sites resolve to. Keep this in sync with the dev
// script at `packages/coding-agent/scripts/build-binary.ts`; the
// `issue-1150-repro` test pins both halves of the contract.
const workerEntrypoints = [
	"./packages/stats/src/sync-worker.ts",
	"./packages/coding-agent/src/tools/browser/tab-worker-entry.ts",
	"./packages/coding-agent/src/eval/js/worker-entry.ts",
	"./packages/coding-agent/src/tiny/worker.ts",
];
const isDryRun = process.argv.includes("--dry-run");
const validateOnly = process.argv.includes("--validate-assets");
const integrityOnly = process.argv.includes("--integrity-only");
const targets: BinaryTarget[] = [
	{
		id: "darwin-arm64",
		platform: "darwin",
		arch: "arm64",
		target: "bun-darwin-arm64",
		outfile: "packages/coding-agent/binaries/sk-darwin-arm64",
	},
	{
		id: "darwin-x64",
		platform: "darwin",
		arch: "x64",
		target: "bun-darwin-x64",
		outfile: "packages/coding-agent/binaries/sk-darwin-x64",
	},
	{
		id: "linux-x64",
		platform: "linux",
		arch: "x64",
		target: "bun-linux-x64-baseline",
		outfile: "packages/coding-agent/binaries/sk-linux-x64",
	},
	{
		id: "linux-arm64",
		platform: "linux",
		arch: "arm64",
		target: "bun-linux-arm64",
		outfile: "packages/coding-agent/binaries/sk-linux-arm64",
	},
	{
		id: "win32-x64",
		platform: "win32",
		arch: "x64",
		target: "bun-windows-x64-modern",
		outfile: "packages/coding-agent/binaries/sk-windows-x64.exe",
	},
];

function parseRequestedTargets(): Set<string> | null {
	const flagIndex = process.argv.findIndex(arg => arg === "--targets");
	const flagValue =
		flagIndex >= 0
			? process.argv[flagIndex + 1]
			: process.argv.find(arg => arg.startsWith("--targets="))?.split("=", 2)[1] ?? Bun.env.RELEASE_TARGETS;

	if (!flagValue) {
		return null;
	}

	return new Set(
		flagValue
			.split(",")
			.map(value => value.trim())
			.filter(Boolean),
	);
}

function shouldAdhocSignDarwinBinary(target: BinaryTarget): boolean {
	return target.platform === "darwin" && process.platform === "darwin";
}

async function runCommand(command: string[], cwd: string, env: NodeJS.ProcessEnv = Bun.env): Promise<void> {
	const proc = Bun.spawn(command, {
		cwd,
		env,
		stdout: "inherit",
		stderr: "inherit",
	});
	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error(`Command failed with exit code ${exitCode}: ${command.join(" ")}`);
	}
}

async function embedNative(target: BinaryTarget): Promise<void> {
	if (isDryRun) {
		console.log(`DRY RUN bun --cwd=packages/natives run embed:native [${target.platform}/${target.arch}]`);
		return;
	}

	await runCommand(["bun", "--cwd=packages/natives", "run", "embed:native"], repoRoot, {
		...Bun.env,
		TARGET_PLATFORM: target.platform,
		TARGET_ARCH: target.arch,
	});
}

async function buildBinary(target: BinaryTarget): Promise<void> {
	console.log(`Building ${target.outfile}...`);
	await embedNative(target);
	if (isDryRun) {
		console.log(`DRY RUN bun build --compile --no-compile-autoload-bunfig --no-compile-autoload-dotenv --no-compile-autoload-tsconfig --no-compile-autoload-package-json --keep-names --define process.env.PI_COMPILED="true" --root . --external mupdf --target=${target.target} ${entrypoint} ${workerEntrypoints.join(" ")} --outfile ${target.outfile}`);
		return;
	}

	const buildEnv = shouldAdhocSignDarwinBinary(target)
		? { ...Bun.env, BUN_NO_CODESIGN_MACHO_BINARY: "1" }
		: Bun.env;
	await runCommand(
		[
			"bun",
			"build",
			"--compile",
			"--no-compile-autoload-bunfig",
			"--no-compile-autoload-dotenv",
			"--no-compile-autoload-tsconfig",
			"--no-compile-autoload-package-json",
			"--keep-names",
			"--define",
			'process.env.PI_COMPILED="true"',
			"--root",
			".",
			"--external",
			"mupdf",
			"--target",
			target.target,
			entrypoint,
			...workerEntrypoints,
			"--outfile",
			target.outfile,
		],
		repoRoot,
		buildEnv,
	);

	// Bun 1.3.12 emits a truncated Mach-O signature on darwin builds.
	if (shouldAdhocSignDarwinBinary(target)) {
		await runCommand(["codesign", "--force", "--sign", "-", path.join(repoRoot, target.outfile)], repoRoot);
	}
}

async function sha256File(filePath: string): Promise<string> {
	const bytes = await Bun.file(filePath).arrayBuffer();
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function expectedReleaseAssetNames(selectedTargets: readonly BinaryTarget[]): string[] {
	return [
		...selectedTargets.flatMap(target => {
			const name = path.basename(target.outfile);
			return [name, `${name}.sha256`];
		}),
		"SHA256SUMS",
		"manifest.json",
	];
}

function isReleaseManifest(value: unknown): value is CodingAgentManifest {
	if (value === null || typeof value !== "object") return false;
	const candidate = value as { version?: unknown; generatedAt?: unknown; artifacts?: unknown };
	return (
		typeof candidate.version === "string" &&
		typeof candidate.generatedAt === "string" &&
		Array.isArray(candidate.artifacts) &&
		candidate.artifacts.every(artifact => {
			if (artifact === null || typeof artifact !== "object") return false;
			const item = artifact as Partial<ReleaseManifestArtifact>;
			return (
				typeof item.name === "string" &&
				typeof item.platform === "string" &&
				typeof item.arch === "string" &&
				typeof item.target === "string" &&
				typeof item.sha256 === "string" &&
				typeof item.size === "number"
			);
		})
	);
}

async function readManifest(): Promise<CodingAgentManifest> {
	const manifestPath = path.join(binariesDir, "manifest.json");
	const manifest = await Bun.file(manifestPath).json();
	if (!isReleaseManifest(manifest)) throw new Error(`${manifestPath} is not a valid release manifest`);
	return manifest;
}

async function validateReleaseAssets(selectedTargets: readonly BinaryTarget[]): Promise<void> {
	const expectedNames = expectedReleaseAssetNames(selectedTargets);
	const missing: string[] = [];
	for (const name of expectedNames) {
		const filePath = path.join(binariesDir, name);
		try {
			await fs.stat(filePath);
		} catch {
			missing.push(name);
		}
	}
	if (missing.length > 0) {
		throw new Error(`Missing release asset(s): ${missing.join(", ")}`);
	}

	const manifest = await readManifest();
	const manifestByName = new Map(manifest.artifacts.map(artifact => [artifact.name, artifact]));
	const checksumLines = (await Bun.file(path.join(binariesDir, "SHA256SUMS")).text())
		.split("\n")
		.filter(line => line.length > 0);

	for (const target of selectedTargets) {
		const name = path.basename(target.outfile);
		const artifact = manifestByName.get(name);
		if (!artifact) throw new Error(`manifest.json is missing ${name}`);
		if (artifact.platform !== target.platform || artifact.arch !== target.arch || artifact.target !== target.target) {
			throw new Error(`manifest.json metadata mismatch for ${name}`);
		}

		const filePath = path.join(repoRoot, target.outfile);
		const [sha256, stat] = await Promise.all([sha256File(filePath), fs.stat(filePath)]);
		if (artifact.sha256 !== sha256) throw new Error(`manifest.json sha256 mismatch for ${name}`);
		if (artifact.size !== stat.size) throw new Error(`manifest.json size mismatch for ${name}`);

		const expectedLine = `${sha256}  ${name}`;
		const perFileLine = (await Bun.file(`${filePath}.sha256`).text()).trim();
		if (perFileLine !== expectedLine) throw new Error(`${name}.sha256 mismatch`);
		if (!checksumLines.includes(expectedLine)) throw new Error(`SHA256SUMS missing ${name}`);
	}
}

async function writeIntegrityArtifacts(selectedTargets: BinaryTarget[]): Promise<void> {
	if (isDryRun) {
		console.log(`DRY RUN expected release assets: ${expectedReleaseAssetNames(selectedTargets).join(", ")}`);
		return;
	}

	const packageJson = (await Bun.file(path.join(repoRoot, "packages", "coding-agent", "package.json")).json()) as {
		version?: string;
	};
	if (typeof packageJson.version !== "string") {
		throw new Error("packages/coding-agent/package.json is missing version");
	}

	const artifacts: ReleaseManifestArtifact[] = [];
	const checksumLines: string[] = [];
	for (const target of selectedTargets) {
		const filePath = path.join(repoRoot, target.outfile);
		const name = path.basename(target.outfile);
		const [sha256, stat] = await Promise.all([sha256File(filePath), fs.stat(filePath)]);
		artifacts.push({
			name,
			platform: target.platform,
			arch: target.arch,
			target: target.target,
			sha256,
			size: stat.size,
		});
		const checksumLine = `${sha256}  ${name}`;
		checksumLines.push(checksumLine);
		await Bun.write(`${filePath}.sha256`, `${checksumLine}\n`);
	}

	const manifest: CodingAgentManifest = {
		version: packageJson.version,
		generatedAt: new Date().toISOString(),
		artifacts,
	};
	await Bun.write(path.join(binariesDir, "SHA256SUMS"), `${checksumLines.join("\n")}\n`);
	await Bun.write(path.join(binariesDir, "manifest.json"), `${JSON.stringify(manifest, null, "\t")}\n`);
}

async function generateBundle(): Promise<void> {
	if (isDryRun) {
		console.log("DRY RUN bun --cwd=packages/stats scripts/generate-client-bundle.ts --generate");
		return;
	}
	await runCommand(["bun", "--cwd=packages/stats", "scripts/generate-client-bundle.ts", "--generate"], repoRoot);
}

async function resetArtifacts(): Promise<void> {
	if (isDryRun) {
		console.log("DRY RUN bun --cwd=packages/natives run embed:native --reset");
		console.log("DRY RUN bun --cwd=packages/stats scripts/generate-client-bundle.ts --reset");
		return;
	}
	await runCommand(["bun", "--cwd=packages/natives", "run", "embed:native", "--reset"], repoRoot);
	await runCommand(["bun", "--cwd=packages/stats", "scripts/generate-client-bundle.ts", "--reset"], repoRoot);
}

async function main(): Promise<void> {
	const requestedTargets = parseRequestedTargets();
	const selectedTargets = requestedTargets
		? targets.filter(target => requestedTargets.has(target.id))
		: targets;

	if (requestedTargets) {
		const unknownTargets = [...requestedTargets].filter(
			requestedTarget => !targets.some(target => target.id === requestedTarget),
		);
		if (unknownTargets.length > 0) {
			throw new Error(`Unknown release target(s): ${unknownTargets.join(", ")}`);
		}
	}

	if (selectedTargets.length === 0) {
		throw new Error("No release targets selected.");
	}

	if (integrityOnly) {
		if (isDryRun) {
			console.log(`DRY RUN write and validate release assets: ${expectedReleaseAssetNames(selectedTargets).join(", ")}`);
			return;
		}
		await writeIntegrityArtifacts(selectedTargets);
		await validateReleaseAssets(selectedTargets);
		console.log(`Wrote and validated release assets: ${expectedReleaseAssetNames(selectedTargets).join(", ")}`);
		return;
	}

	if (validateOnly) {
		if (isDryRun) {
			console.log(`DRY RUN validate release assets: ${expectedReleaseAssetNames(selectedTargets).join(", ")}`);
			return;
		}
		await validateReleaseAssets(selectedTargets);
		console.log(`Validated release assets: ${expectedReleaseAssetNames(selectedTargets).join(", ")}`);
		return;
	}

	await fs.mkdir(binariesDir, { recursive: true });
	await generateBundle();
	try {
		for (const target of selectedTargets) {
			await buildBinary(target);
		}
		await writeIntegrityArtifacts(selectedTargets);
		if (!isDryRun) await validateReleaseAssets(selectedTargets);
	} finally {
		await resetArtifacts();
	}
}

await main();
