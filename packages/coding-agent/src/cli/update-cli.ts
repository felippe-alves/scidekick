/**
 * Update CLI command handler.
 *
 * Handles `omp update` to check for and install updates.
 * Uses bun for package installs, or GitHub release manifests for binary installs.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import { $which, APP_NAME, isEnoent, VERSION } from "@oh-my-pi/pi-utils";
import { $ } from "bun";
import chalk from "chalk";
import { theme } from "../modes/theme/theme";

const REPO = "felippe-alves/scidekick";
const PACKAGE = "@scidekick/cli";
const RELEASE_API_BASE = Bun.env.SCIDEKICK_UPDATE_API_BASE ?? `https://api.github.com/repos/${REPO}/releases`;
const RELEASE_DOWNLOAD_BASE = Bun.env.SCIDEKICK_UPDATE_DOWNLOAD_BASE ?? `https://github.com/${REPO}/releases/download`;

interface ReleaseInfo {
	tag: string;
	version: string;
}

interface GitHubReleaseAsset {
	name: string;
	browser_download_url: string;
}

interface GitHubRelease {
	tag_name?: string;
	assets?: GitHubReleaseAsset[];
}

export interface ReleaseManifestArtifact {
	name: string;
	platform: string;
	arch: string;
	target: string;
	sha256: string;
	size: number;
}

export interface ReleaseManifest {
	version: string;
	generatedAt: string;
	artifacts: ReleaseManifestArtifact[];
}

interface BinaryReleaseInfo extends ReleaseInfo {
	manifest: ReleaseManifest;
	assets: GitHubReleaseAsset[];
}

/** Result from running the installed binary and parsing its reported version. */
export interface InstalledVersionVerification {
	ok: boolean;
	actual?: string;
	path?: string;
}

/** Paths and verifier used while replacing a downloaded binary update. */
export interface BinaryReplacementOptions {
	targetPath: string;
	tempPath: string;
	backupPath: string;
	expectedVersion: string;
	verifyInstalledVersion: (expectedVersion: string) => Promise<InstalledVersionVerification>;
}

/**
 * Parse update subcommand arguments.
 * Returns undefined if not an update command.
 */
export function parseUpdateArgs(args: string[]): { force: boolean; check: boolean } | undefined {
	if (args.length === 0 || args[0] !== "update") {
		return undefined;
	}

	return {
		force: args.includes("--force") || args.includes("-f"),
		check: args.includes("--check") || args.includes("-c"),
	};
}

async function getBunGlobalBinDir(): Promise<string | undefined> {
	if (!$which("bun")) return undefined;
	try {
		const result = await $`bun pm bin -g`.quiet().nothrow();
		if (result.exitCode !== 0) return undefined;
		const output = result.text().trim();
		return output.length > 0 ? output : undefined;
	} catch {
		return undefined;
	}
}

type UpdateTarget = { method: "bun" } | { method: "binary"; path: string };

function resolveUpdateMethod(_ompPath: string, _bunBinDir: string | undefined): "bun" | "binary" {
	// Scidekick: no npm package exists, so always use the binary update path (GitHub releases).
	// The original vendor check (isPathInDirectory(ompPath, bunBinDir) ? "bun" : "binary")
	// doesn't apply since @scidekick/cli is not published to npm.
	return "binary";
}

export function resolveUpdateMethodForTest(ompPath: string, bunBinDir: string | undefined): "bun" | "binary" {
	return resolveUpdateMethod(ompPath, bunBinDir);
}
async function resolveUpdateTarget(): Promise<UpdateTarget> {
	const bunBinDir = await getBunGlobalBinDir();
	const ompPath = resolveOmpPath();

	if (ompPath) {
		const method = resolveUpdateMethod(ompPath, bunBinDir);
		return { method, path: ompPath };
	}

	// Fallback: if bun is installed, the binary is likely in bun's global bin dir.
	// Construct the expected path (scidekick binary is always "sk") and use binary update.
	if (bunBinDir) return { method: "binary", path: path.join(bunBinDir, "sk") };

	throw new Error(`Could not resolve ${APP_NAME} binary path in PATH`);
}

/**
 * Get the latest release info from the npm registry.
 * Uses npm instead of GitHub API to avoid unauthenticated rate limiting.
 */
async function getLatestRelease(): Promise<ReleaseInfo> {
	const response = await fetch(`https://registry.npmjs.org/${PACKAGE}/latest`);
	if (!response.ok) {
		throw new Error(`Failed to fetch release info: ${response.statusText}`);
	}

	const data = (await response.json()) as { version: string };
	const version = data.version;
	const tag = `v${version}`;

	return {
		tag,
		version,
	};
}

function isReleaseManifest(value: unknown): value is ReleaseManifest {
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

async function fetchJson(url: string): Promise<unknown> {
	const response = await fetch(url, { redirect: "follow" });
	if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
	return response.json();
}

async function fetchText(url: string): Promise<string> {
	const response = await fetch(url, { redirect: "follow" });
	if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
	return response.text();
}

function releaseAssetUrl(release: GitHubRelease, tag: string, name: string): string {
	return (
		release.assets?.find(asset => asset.name === name)?.browser_download_url ??
		`${RELEASE_DOWNLOAD_BASE}/${tag}/${name}`
	);
}

async function getLatestBinaryRelease(): Promise<BinaryReleaseInfo> {
	const release = (await fetchJson(`${RELEASE_API_BASE}/latest`)) as GitHubRelease;
	const tag = release.tag_name;
	if (!tag) throw new Error("Latest GitHub release is missing tag_name");

	const manifestUrl = releaseAssetUrl(release, tag, "manifest.json");
	const manifest = await fetchJson(manifestUrl);
	if (!isReleaseManifest(manifest)) throw new Error(`Invalid release manifest: ${manifestUrl}`);

	return {
		tag,
		version: manifest.version,
		manifest,
		assets: release.assets ?? [],
	};
}

/**
 * Compare semver versions. Returns:
 * - negative if a < b
 * - 0 if a == b
 * - positive if a > b
 */
function compareVersions(a: string, b: string): number {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);

	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const na = pa[i] || 0;
		const nb = pb[i] || 0;
		if (na !== nb) return na - nb;
	}
	return 0;
}

/**
 * Get the appropriate binary name for this platform.
 */
export function getBinaryNameForPlatform(platform: NodeJS.Platform, arch: NodeJS.Architecture): string {
	let os: string;
	switch (platform) {
		case "linux":
			os = "linux";
			break;
		case "darwin":
			os = "darwin";
			break;
		case "win32":
			os = "windows";
			break;
		default:
			throw new Error(`Unsupported platform: ${platform}`);
	}

	let archName: string;
	switch (arch) {
		case "x64":
			archName = "x64";
			break;
		case "arm64":
			archName = "arm64";
			break;
		default:
			throw new Error(`Unsupported architecture: ${arch}`);
	}

	if (os === "windows") {
		return `sk-${os}-${archName}.exe`;
	}
	return `sk-${os}-${archName}`;
}

function getBinaryName(): string {
	return getBinaryNameForPlatform(process.platform, process.arch);
}

export function selectManifestArtifact(manifest: ReleaseManifest, binaryName: string): ReleaseManifestArtifact {
	const artifact = manifest.artifacts.find(candidate => candidate.name === binaryName);
	if (!artifact) throw new Error(`Release manifest does not include ${binaryName}`);
	return artifact;
}
/**
 * Resolve the path that `omp` maps to in the user's PATH.
 */
function resolveOmpPath(): string | undefined {
	// Scidekick: the binary is "sk", not APP_NAME which is the display name "scidekick"
	const binaryName = "sk";
	return $which(binaryName) ?? undefined;
}

/**
 * Run the resolved omp binary and check if it reports the expected version.
 */
async function verifyInstalledVersion(expectedVersion: string): Promise<InstalledVersionVerification> {
	const ompPath = resolveOmpPath();
	if (!ompPath) return { ok: false };
	try {
		const result = await $`${ompPath} --version`.quiet().nothrow();
		if (result.exitCode !== 0) return { ok: false, path: ompPath };
		const output = result.text().trim();
		// Output format: "omp/X.Y.Z"
		const match = output.match(/\/(\d+\.\d+\.\d+)/);
		const actual = match?.[1];
		return { ok: actual === expectedVersion, actual, path: ompPath };
	} catch {
		return { ok: false, path: ompPath };
	}
}

function printVerifiedVersion(expectedVersion: string): void {
	console.log(chalk.green(`\n${theme.status.success} Updated to ${expectedVersion}`));
}

function formatVerificationFailure(result: InstalledVersionVerification, expectedVersion: string): string {
	if (result.actual) {
		return `${APP_NAME} at ${result.path} still reports ${result.actual} (expected ${expectedVersion})`;
	}
	return `could not verify updated version${result.path ? ` at ${result.path}` : ""}`;
}

/**
 * Print post-update verification result.
 */
async function printVerification(expectedVersion: string): Promise<void> {
	const result = await verifyInstalledVersion(expectedVersion);
	if (result.ok) {
		printVerifiedVersion(expectedVersion);
		return;
	}
	console.log(chalk.yellow(`\nWarning: ${formatVerificationFailure(result, expectedVersion)}`));
	console.log(chalk.yellow(`You may need to reinstall: curl -fsSL https://omp.sh/install | sh`));
}

async function unlinkIfExists(filePath: string): Promise<void> {
	try {
		await fs.promises.unlink(filePath);
	} catch (err) {
		if (!isEnoent(err)) throw err;
	}
}

async function sha256File(filePath: string): Promise<string> {
	const bytes = await Bun.file(filePath).arrayBuffer();
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function parseChecksumLine(text: string, artifactName: string): string {
	const expected = text.trimStart().split(/\s+/, 1)[0];
	if (!/^[0-9a-fA-F]{64}$/.test(expected)) {
		throw new Error(`Invalid checksum for ${artifactName}`);
	}
	return expected.toLowerCase();
}

export async function verifyDownloadedArtifact(
	filePath: string,
	artifact: ReleaseManifestArtifact,
	checksumText: string,
): Promise<void> {
	const checksumSha256 = parseChecksumLine(checksumText, artifact.name);
	if (checksumSha256 !== artifact.sha256.toLowerCase()) {
		throw new Error(`${artifact.name}.sha256 does not match manifest`);
	}
	const actual = await sha256File(filePath);
	if (actual !== artifact.sha256.toLowerCase()) {
		throw new Error(`Checksum verification failed for ${artifact.name}`);
	}
	const stat = await fs.promises.stat(filePath);
	if (stat.size !== artifact.size) {
		throw new Error(`Size verification failed for ${artifact.name}`);
	}
}

/**
 * Atomically replace the installed binary and roll back if version verification fails.
 */
export async function replaceBinaryForUpdate(options: BinaryReplacementOptions): Promise<InstalledVersionVerification> {
	let backupReady = false;
	try {
		await unlinkIfExists(options.backupPath);
		await fs.promises.rename(options.targetPath, options.backupPath);
		backupReady = true;
		await fs.promises.rename(options.tempPath, options.targetPath);

		const verification = await options.verifyInstalledVersion(options.expectedVersion);
		if (!verification.ok) {
			throw new Error(
				`${formatVerificationFailure(verification, options.expectedVersion)}; restored previous ${APP_NAME} binary`,
			);
		}

		backupReady = false;
		await unlinkIfExists(options.backupPath);
		return verification;
	} catch (err) {
		if (backupReady) {
			await unlinkIfExists(options.targetPath);
			await fs.promises.rename(options.backupPath, options.targetPath);
		}
		await unlinkIfExists(options.tempPath);
		throw err;
	}
}

/**
 * Update via bun package manager.
 */
async function updateViaBun(expectedVersion: string): Promise<void> {
	console.log(chalk.dim("Updating via bun..."));
	const result = await $`bun install -g ${PACKAGE}@${expectedVersion}`.nothrow();
	if (result.exitCode !== 0) {
		throw new Error(`bun install failed with exit code ${result.exitCode}`);
	}

	await printVerification(expectedVersion);
}

/**
 * Download a release binary to a target path, replacing an existing file.
 */
async function updateViaBinaryAt(targetPath: string, release: BinaryReleaseInfo): Promise<void> {
	const binaryName = getBinaryName();
	const artifact = selectManifestArtifact(release.manifest, binaryName);
	const binaryUrl =
		release.assets.find(asset => asset.name === binaryName)?.browser_download_url ??
		`${RELEASE_DOWNLOAD_BASE}/${release.tag}/${binaryName}`;
	const checksumName = `${binaryName}.sha256`;
	const checksumUrl =
		release.assets.find(asset => asset.name === checksumName)?.browser_download_url ??
		`${RELEASE_DOWNLOAD_BASE}/${release.tag}/${checksumName}`;

	const tempPath = `${targetPath}.new`;
	const backupPath = `${targetPath}.bak`;
	console.log(chalk.dim(`Downloading ${binaryName}…`));

	const response = await fetch(binaryUrl, { redirect: "follow" });
	if (!response.ok || !response.body) {
		throw new Error(`Download failed: ${response.statusText}`);
	}
	const fileStream = fs.createWriteStream(tempPath, { mode: 0o755 });
	await pipeline(response.body, fileStream);
	await verifyDownloadedArtifact(tempPath, artifact, await fetchText(checksumUrl));

	console.log(chalk.dim("Installing update..."));
	await replaceBinaryForUpdate({
		targetPath,
		tempPath,
		backupPath,
		expectedVersion: release.version,
		verifyInstalledVersion,
	});
	printVerifiedVersion(release.version);
	console.log(chalk.dim(`Restart ${APP_NAME} to use the new version`));
}

/**
 * Run the update command.
 */
export async function runUpdateCommand(opts: { force: boolean; check: boolean }): Promise<void> {
	console.log(chalk.dim(`Current version: ${VERSION}`));
	let target: UpdateTarget;
	let release: ReleaseInfo | BinaryReleaseInfo;
	try {
		target = await resolveUpdateTarget();
		release = target.method === "binary" ? await getLatestBinaryRelease() : await getLatestRelease();
	} catch (err) {
		console.error(chalk.red(`Failed to check for updates: ${err}`));
		process.exit(1);
	}

	const comparison = compareVersions(release.version, VERSION);

	if (comparison <= 0 && !opts.force) {
		console.log(chalk.green(`${theme.status.success} Already up to date`));
		return;
	}

	if (comparison > 0) {
		console.log(chalk.cyan(`New version available: ${release.version}`));
	} else {
		console.log(chalk.yellow(`Forcing reinstall of ${release.version}`));
	}

	if (opts.check) {
		return;
	}

	try {
		if (target.method === "bun") {
			await updateViaBun(release.version);
		} else {
			await updateViaBinaryAt(target.path, release as BinaryReleaseInfo);
		}
	} catch (err) {
		console.error(chalk.red(`Update failed: ${err}`));
		process.exit(1);
	}
}

/**
 * Print update command help.
 */
export function printUpdateHelp(): void {
	console.log(`${chalk.bold(`${APP_NAME} update`)} - Check for and install updates

${chalk.bold("Usage:")}
  ${APP_NAME} update [options]

${chalk.bold("Options:")}
  -c, --check   Check for updates without installing
  -f, --force   Force reinstall even if up to date

${chalk.bold("Examples:")}
  ${APP_NAME} update           Update to latest version
  ${APP_NAME} update --check   Check if updates are available
  ${APP_NAME} update --force   Force reinstall
`);
}
