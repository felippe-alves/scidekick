/**
 * Top-level diagnostics for install and runtime health.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { smokeTestSyncWorker } from "@oh-my-pi/omp-stats";
import {
	$which,
	APP_NAME,
	getAgentDbPath,
	getAgentDir,
	getConfigRootDir,
	getDebugLogPath,
	getLogPath,
	MIN_BUN_VERSION,
	VERSION,
} from "@oh-my-pi/pi-utils";
import { $ } from "bun";
import chalk from "chalk";
import { smokeTestTinyTitleWorker } from "../tiny/title-client";

type DoctorStatus = "ok" | "warn" | "error";
type InstallKind = "bun-global" | "standalone-binary" | "dev-or-source";

export interface DoctorCheck {
	name: string;
	status: DoctorStatus;
	message: string;
	details?: string[];
	remediation?: string[];
}

export interface DoctorReport {
	app: string;
	version: string;
	checks: DoctorCheck[];
	ok: boolean;
	strictOk: boolean;
}
const VERSION_RE = /\/(\d+\.\d+\.\d+)/;
const WHICH_CACHE_BYPASS = 1;
const INSTALL_URL = "https://raw.githubusercontent.com/felippe-alves/scidekick/main/scripts/install.sh";

interface DoctorOptions {
	fix: boolean;
	strict: boolean;
}

const PROVIDER_ENV_KEYS = [
	"ANTHROPIC_API_KEY",
	"OPENAI_API_KEY",
	"GOOGLE_GENERATIVE_AI_API_KEY",
	"GEMINI_API_KEY",
	"OPENROUTER_API_KEY",
	"PARALLEL_API_KEY",
	"EXA_API_KEY",
	"TAVILY_API_KEY",
	"KAGI_API_KEY",
] as const;

function checkOk(name: string, message: string, details?: string[], remediation?: string[]): DoctorCheck {
	return { name, status: "ok", message, details, remediation };
}

function checkWarn(name: string, message: string, details?: string[], remediation?: string[]): DoctorCheck {
	return { name, status: "warn", message, details, remediation };
}

function checkError(name: string, message: string, details?: string[], remediation?: string[]): DoctorCheck {
	return { name, status: "error", message, details, remediation };
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function getBunGlobalBinDir(): Promise<string | undefined> {
	if (!$which("bun", { cache: WHICH_CACHE_BYPASS })) return undefined;
	try {
		const result = await $`bun pm bin -g`.quiet().nothrow();
		if (result.exitCode !== 0) return undefined;
		const output = result.text().trim();
		return output.length > 0 ? output : undefined;
	} catch {
		return undefined;
	}
}

async function sameDirectory(left: string, right: string): Promise<boolean> {
	const normalize = (value: string) => (process.platform === "win32" ? value.toLowerCase() : value);
	try {
		const [leftReal, rightReal] = await Promise.all([fs.realpath(left), fs.realpath(right)]);
		return normalize(leftReal) === normalize(rightReal);
	} catch {
		return normalize(path.resolve(left)) === normalize(path.resolve(right));
	}
}

async function detectInstallKind(resolvedPath: string): Promise<InstallKind> {
	const bunBinDir = await getBunGlobalBinDir();
	if (bunBinDir && (await sameDirectory(path.dirname(resolvedPath), bunBinDir))) return "bun-global";
	if (resolvedPath.includes(`${path.sep}packages${path.sep}coding-agent${path.sep}src${path.sep}`))
		return "dev-or-source";
	return "standalone-binary";
}

function describeInstallKind(kind: InstallKind): string {
	switch (kind) {
		case "bun-global":
			return "bun global install";
		case "standalone-binary":
			return "standalone binary install";
		case "dev-or-source":
			return "source/dev invocation";
	}
}

async function ensureWritableDir(dir: string, fix: boolean): Promise<DoctorCheck> {
	if (fix) {
		await fs.mkdir(dir, { recursive: true });
	}

	try {
		const stat = await fs.stat(dir);
		if (!stat.isDirectory()) {
			return checkError("config", `Expected directory but found file: ${dir}`, undefined, [
				`Move or remove ${dir}, then run ${APP_NAME} doctor --fix.`,
			]);
		}
	} catch {
		return checkWarn("config", `Directory does not exist: ${dir}`, undefined, [
			`Run ${APP_NAME} doctor --fix to create it.`,
		]);
	}

	const probePath = path.join(dir, `.doctor-${process.pid}-${Date.now()}`);
	try {
		await Bun.write(probePath, "ok");
		await fs.unlink(probePath);
		return checkOk("config", `Writable directory: ${dir}`);
	} catch (err) {
		return checkError(
			"config",
			`Directory is not writable: ${dir}`,
			[String(err)],
			[`Fix permissions for ${dir}, then rerun ${APP_NAME} doctor.`],
		);
	}
}

async function checkRuntime(): Promise<DoctorCheck> {
	if (Bun.semver.order(Bun.version, MIN_BUN_VERSION) < 0) {
		return checkError("runtime", `Bun ${MIN_BUN_VERSION} or newer is required; found ${Bun.version}`, undefined, [
			"Upgrade Bun from https://bun.sh/docs/installation.",
		]);
	}
	return checkOk("runtime", `Bun ${Bun.version}; ${APP_NAME} ${VERSION}`);
}

async function checkPath(): Promise<DoctorCheck> {
	const resolved = $which(APP_NAME, { cache: WHICH_CACHE_BYPASS });
	if (!resolved) {
		return checkWarn(
			"path",
			`${APP_NAME} is not on PATH`,
			["Install directory is missing from PATH, or this command was launched by absolute path."],
			[`Add the install directory to PATH, or reinstall with: curl -fsSL ${INSTALL_URL} | sh`],
		);
	}

	const installKind = await detectInstallKind(resolved);
	const installDetail = `install: ${describeInstallKind(installKind)}`;
	const result = await $`${resolved} --version`.quiet().nothrow();
	if (result.exitCode !== 0) {
		return checkError(
			"path",
			`${APP_NAME} on PATH did not run --version`,
			[resolved, installDetail],
			[`Reinstall with: curl -fsSL ${INSTALL_URL} | sh`],
		);
	}

	const output = result.text().trim();
	const pathVersion = output.match(VERSION_RE)?.[1];
	if (pathVersion && pathVersion !== VERSION) {
		return checkWarn(
			"path",
			`${APP_NAME} on PATH reports ${pathVersion}, but this process is ${VERSION}`,
			[resolved, output, installDetail],
			[
				`Move ${path.dirname(resolved)} later in PATH, or remove that stale executable.`,
				`Then run ${APP_NAME} update --force, or reinstall with: curl -fsSL ${INSTALL_URL} | sh`,
			],
		);
	}

	return checkOk("path", `${APP_NAME} resolves to ${resolved}`, [output, installDetail]);
}

async function checkConfig(fix: boolean): Promise<DoctorCheck[]> {
	const roots = [getConfigRootDir(), getAgentDir()];
	const checks: DoctorCheck[] = [];
	for (const root of roots) {
		checks.push(await ensureWritableDir(root, fix));
	}
	return checks;
}

async function checkStateFiles(): Promise<DoctorCheck> {
	const details = [`agent db: ${getAgentDbPath()}`, `current log: ${getLogPath()}`, `debug log: ${getDebugLogPath()}`];
	if (await pathExists(getAgentDbPath())) return checkOk("state", "Agent database exists", details);
	return checkWarn("state", "Agent database has not been created yet", details, [
		`Run ${APP_NAME} setup or start a session to initialize state.`,
	]);
}

async function checkProviderReadiness(): Promise<DoctorCheck> {
	const present = PROVIDER_ENV_KEYS.filter(key => Boolean(process.env[key]));
	if (present.length > 0) {
		return checkOk("providers", `Provider environment detected: ${present.join(", ")}`);
	}
	if (await pathExists(getAgentDbPath())) {
		return checkOk("providers", "Provider configuration may be stored in the agent database");
	}
	return checkWarn("providers", "No provider API keys detected in the environment", undefined, [
		`Run ${APP_NAME} setup if providers are not configured yet.`,
		`Or set one of: ${PROVIDER_ENV_KEYS.join(", ")}`,
	]);
}

async function checkWorkers(): Promise<DoctorCheck> {
	try {
		await smokeTestSyncWorker();
		await smokeTestTinyTitleWorker();
		return checkOk("workers", "Bundled workers spawned successfully");
	} catch (err) {
		return checkError(
			"workers",
			"Bundled worker smoke test failed",
			[String(err), `debug log: ${getDebugLogPath()}`],
			[`Run ${APP_NAME} update --force, or reinstall with: curl -fsSL ${INSTALL_URL} | sh`],
		);
	}
}
export async function runDoctorChecks(options: DoctorOptions): Promise<DoctorReport> {
	const checks: DoctorCheck[] = [];
	checks.push(await checkRuntime());
	checks.push(await checkPath());
	checks.push(...(await checkConfig(options.fix)));
	checks.push(await checkStateFiles());
	checks.push(await checkProviderReadiness());
	checks.push(await checkWorkers());

	const ok = checks.every(check => check.status !== "error");
	const strictOk = ok && checks.every(check => check.status === "ok");
	return {
		app: APP_NAME,
		version: VERSION,
		checks,
		ok,
		strictOk,
	};
}

function statusLabel(status: DoctorStatus): string {
	switch (status) {
		case "ok":
			return chalk.green("ok");
		case "warn":
			return chalk.yellow("warn");
		case "error":
			return chalk.red("error");
	}
}

export function renderDoctorReport(report: DoctorReport): string {
	const lines = [`${report.app} doctor (${report.version})`];
	for (const check of report.checks) {
		lines.push(`  ${statusLabel(check.status)}  ${check.name}: ${check.message}`);
		for (const detail of check.details ?? []) {
			if (detail.length > 0) lines.push(`       ${detail}`);
		}
		for (const remediation of check.remediation ?? []) {
			if (remediation.length > 0) lines.push(`       fix: ${remediation}`);
		}
	}
	return `${lines.join("\n")}\n`;
}

export function doctorExitCode(report: DoctorReport, strict: boolean): number {
	return strict ? (report.strictOk ? 0 : 1) : report.ok ? 0 : 1;
}

export async function runDoctorCommand(options: DoctorOptions & { json: boolean }): Promise<void> {
	const report = await runDoctorChecks({ fix: options.fix, strict: options.strict });
	if (options.json) {
		process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	} else {
		process.stdout.write(renderDoctorReport(report));
	}
	process.exitCode = doctorExitCode(report, options.strict);
}
