/**
 * Install ACP (Agent Client Protocol) configuration for Scidekick into an
 * editor's settings file — Zed, VS Code user, or VS Code workspace.
 *
 * Reads the existing settings, merges the Scidekick ACP entry, and writes
 * back. A timestamped backup is created before any mutation.
 */
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { $which } from "@oh-my-pi/pi-utils";
import { Args, Command, Flags } from "@oh-my-pi/pi-utils/cli";

const TARGETS = ["zed", "vscode"] as const;
type Target = (typeof TARGETS)[number];

interface AcpEntry {
	command: string;
	args: string[];
	env?: Record<string, string>;
}

interface EditorConfig {
	configPath: string;
	keyPath: string[];
	entryName: string;
	buildEntry: (skBin: string) => AcpEntry;
}

function getZedConfig(): EditorConfig {
	return {
		configPath: path.join(os.homedir(), ".config", "zed", "settings.json"),
		keyPath: ["agent_servers", "Scidekick"],
		entryName: "Scidekick",
		buildEntry: (skBin: string): AcpEntry => ({
			command: skBin,
			args: ["acp"],
		}),
	};
}

function getVSCodeConfig(workspace: boolean, cwd?: string): EditorConfig {
	if (workspace) {
		const root = cwd ?? process.cwd();
		return {
			configPath: path.join(root, ".vscode", "settings.json"),
			keyPath: ["acp.agents", "Scidekick"],
			entryName: "Scidekick",
			buildEntry: (skBin: string): AcpEntry => ({
				command: skBin,
				args: ["acp"],
			}),
		};
	}

	let configDir: string;
	if (process.platform === "darwin") {
		configDir = path.join(os.homedir(), "Library", "Application Support", "Code", "User");
	} else if (process.platform === "win32") {
		configDir = path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "Code", "User");
	} else {
		configDir = path.join(os.homedir(), ".config", "Code", "User");
	}

	return {
		configPath: path.join(configDir, "settings.json"),
		keyPath: ["acp.agents", "Scidekick"],
		entryName: "Scidekick",
		buildEntry: (skBin: string): AcpEntry => ({
			command: skBin,
			args: ["acp"],
		}),
	};
}

async function readJson5(filePath: string): Promise<Record<string, unknown> | null> {
	try {
		const text = await Bun.file(filePath).text();
		if (text.trim().length === 0) return {};
		return Bun.JSON5.parse(text) as Record<string, unknown>;
	} catch (err) {
		if ((err as { code?: string }).code === "ENOENT") return null;
		throw err;
	}
}

function deepSet(obj: Record<string, unknown>, keyPath: string[], value: unknown): boolean {
	let current = obj;
	for (let i = 0; i < keyPath.length - 1; i++) {
		const key = keyPath[i];
		if (current[key] === undefined || current[key] === null || typeof current[key] !== "object") {
			current[key] = {};
		}
		current = current[key] as Record<string, unknown>;
	}
	const lastKey = keyPath[keyPath.length - 1];
	const exists = lastKey in current;
	current[lastKey] = value;
	return !exists;
}

function backupPath(original: string): string {
	const now = new Date().toISOString().replace(/[:.]/g, "-");
	return `${original}.${now}.bak`;
}

export default class AcpInstall extends Command {
	static description = "Install ACP configuration for Scidekick into an editor";

	static args = {
		target: Args.string({
			description: `Editor target (${TARGETS.join("|")})`,
			required: false,
			options: TARGETS,
		}),
	};

	static flags = {
		workspace: Flags.boolean({
			char: "w",
			description: "Install into VS Code workspace settings (.vscode/settings.json)",
		}),
		dryRun: Flags.boolean({
			description: "Show what would be written without modifying files",
		}),
	};

	static examples = [
		"sk acp-install zed",
		"sk acp-install vscode",
		"sk acp-install vscode --workspace",
		"sk acp-install vscode -w",
	];

	async run(): Promise<void> {
		const { args, flags } = await this.parse(AcpInstall);
		const target = (args.target ?? "zed") as Target;

		// Resolve the sk binary
		const skBin = $which("sk");
		if (!skBin) {
			process.stderr.write("error: Could not find sk binary on PATH.\n");
			process.stderr.write("       Install Scidekick first, or ensure sk is in your PATH.\n");
			process.exitCode = 1;
			return;
		}

		const config = target === "zed" ? getZedConfig() : getVSCodeConfig(flags.workspace ?? false, process.cwd());

		// Read existing config (null means file not found)
		let existing = await readJson5(config.configPath);
		if (existing === null) {
			// Workspace settings: create from scratch. User settings: error.
			if (target === "vscode" && flags.workspace) {
				existing = {};
			} else {
				process.stderr.write(`error: Settings file not found: ${config.configPath}\n`);
				if (target === "vscode") {
					process.stderr.write("       Is VS Code installed? Try --workspace for project-level settings.\n");
				}
				process.exitCode = 1;
				return;
			}
		}
		// Check if already configured
		let probe: unknown = existing;
		let alreadyConfigured = true;
		for (const key of config.keyPath) {
			if (probe === undefined || probe === null || typeof probe !== "object") {
				alreadyConfigured = false;
				break;
			}
			if (!(key in (probe as Record<string, unknown>))) {
				alreadyConfigured = false;
				break;
			}
			probe = (probe as Record<string, unknown>)[key];
		}

		if (alreadyConfigured) {
			process.stdout.write(`Scidekick ACP is already configured in ${config.configPath}\n`);
			return;
		}

		const entry = config.buildEntry(skBin);

		if (flags.dryRun) {
			process.stdout.write(`Would write to ${config.configPath}:\n${JSON.stringify(entry, null, 2)}\n`);
			return;
		}

		// Create timestamped backup (skip if file doesn't exist — workspace first install)
		let createdBackup = false;
		try {
			await fs.copyFile(config.configPath, backupPath(config.configPath));
			createdBackup = true;
		} catch (err) {
			if ((err as { code?: string }).code !== "ENOENT") throw err;
		}

		// Ensure parent directories exist for workspace settings
		await fs.mkdir(path.dirname(config.configPath), { recursive: true });

		// Merge and write
		deepSet(existing, config.keyPath, entry);
		await Bun.write(config.configPath, `${JSON.stringify(existing, null, 2)}\n`);

		process.stdout.write(`Scidekick ACP configured for ${target} in ${config.configPath}\n`);
		if (createdBackup) {
			process.stdout.write(`Backup saved to ${backupPath(config.configPath)}\n`);
		}
	}
}
