import { afterEach, describe, expect, it } from "bun:test";
import * as os from "node:os";
import * as path from "node:path";
import {
	APP_NAME,
	CONFIG_DIR_NAME,
	getAgentDir,
	getConfigDirName,
	getConfigRootDir,
	getProjectAgentDir,
	setAgentDir,
} from "../src/dirs";

const originalAgentDir = getAgentDir();
const originalSkConfigDir = process.env.SK_CONFIG_DIR;
const originalPiConfigDir = process.env.PI_CONFIG_DIR;

afterEach(() => {
	if (originalSkConfigDir === undefined) delete process.env.SK_CONFIG_DIR;
	else process.env.SK_CONFIG_DIR = originalSkConfigDir;

	if (originalPiConfigDir === undefined) delete process.env.PI_CONFIG_DIR;
	else process.env.PI_CONFIG_DIR = originalPiConfigDir;

	setAgentDir(originalAgentDir);
});

describe("Scidekick identity defaults", () => {
	it("uses sk as the default application name", () => {
		expect(APP_NAME).toBe("sk");
	});

	it("uses .sk as the default config directory", () => {
		delete process.env.SK_CONFIG_DIR;
		delete process.env.PI_CONFIG_DIR;

		expect(CONFIG_DIR_NAME).toBe(".sk");
		expect(getConfigDirName()).toBe(".sk");

		const defaultAgentDir = path.join(os.homedir(), ".sk", "agent");
		setAgentDir(defaultAgentDir);
		expect(getConfigRootDir()).toBe(path.join(os.homedir(), ".sk"));
		expect(getAgentDir()).toBe(defaultAgentDir);
	});

	it("uses .sk for project-local config paths", () => {
		delete process.env.SK_CONFIG_DIR;
		delete process.env.PI_CONFIG_DIR;

		expect(getProjectAgentDir("/tmp/project")).toBe(path.join("/tmp/project", ".sk"));
	});

	it("allows SK_CONFIG_DIR to override the config directory", () => {
		process.env.SK_CONFIG_DIR = ".scidekick-test";
		delete process.env.PI_CONFIG_DIR;

		expect(getConfigDirName()).toBe(".scidekick-test");
		expect(getProjectAgentDir("/tmp/project")).toBe(path.join("/tmp/project", ".scidekick-test"));
	});
});
