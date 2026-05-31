import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	getBinaryNameForPlatform,
	type ReleaseManifest,
	type ReleaseManifestArtifact,
	replaceBinaryForUpdate,
	resolveUpdateMethodForTest,
	selectManifestArtifact,
	verifyDownloadedArtifact,
} from "../src/cli/update-cli";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "omp-update-test-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});
describe("update-cli install target detection", () => {
	it("uses bun update when prioritized omp is inside bun global bin", () => {
		const method = resolveUpdateMethodForTest("/Users/test/.bun/bin/omp", "/Users/test/.bun/bin");

		expect(method).toBe("bun");
	});

	it("uses binary update when prioritized omp is outside bun global bin", () => {
		const method = resolveUpdateMethodForTest("/Users/test/.local/bin/omp", "/Users/test/.bun/bin");

		expect(method).toBe("binary");
	});

	it("uses binary update when bun global bin cannot be resolved", () => {
		const method = resolveUpdateMethodForTest("/Users/test/.local/bin/omp", undefined);

		expect(method).toBe("binary");
	});
});

describe("update-cli release manifest handling", () => {
	const manifest: ReleaseManifest = {
		version: "15.7.3",
		generatedAt: "2026-05-31T00:00:00.000Z",
		artifacts: [
			{
				name: "sk-darwin-arm64",
				platform: "darwin",
				arch: "arm64",
				target: "bun-darwin-arm64",
				sha256: "0".repeat(64),
				size: 123,
			},
		],
	};

	it("uses Scidekick release binary names for supported platforms", () => {
		expect(getBinaryNameForPlatform("darwin", "arm64")).toBe("sk-darwin-arm64");
		expect(getBinaryNameForPlatform("linux", "x64")).toBe("sk-linux-x64");
		expect(getBinaryNameForPlatform("win32", "x64")).toBe("sk-windows-x64.exe");
	});

	it("selects the matching artifact from the manifest", () => {
		expect(selectManifestArtifact(manifest, "sk-darwin-arm64")).toEqual(manifest.artifacts[0]);
		expect(() => selectManifestArtifact(manifest, "sk-linux-x64")).toThrow(
			"Release manifest does not include sk-linux-x64",
		);
	});

	it("verifies downloaded binary checksum and size against manifest", async () => {
		const dir = await makeTempDir();
		const filePath = path.join(dir, "sk-darwin-arm64");
		await Bun.write(filePath, "current build");
		const sha256 = Array.from(
			new Uint8Array(await crypto.subtle.digest("SHA-256", await Bun.file(filePath).arrayBuffer())),
			byte => byte.toString(16).padStart(2, "0"),
		).join("");
		const artifact: ReleaseManifestArtifact = {
			...manifest.artifacts[0],
			sha256,
			size: 13,
		};

		await verifyDownloadedArtifact(filePath, artifact, `${sha256}  sk-darwin-arm64\n`);
		await expect(
			verifyDownloadedArtifact(filePath, artifact, `${"1".repeat(64)}  sk-darwin-arm64\n`),
		).rejects.toThrow("does not match manifest");
	});
});

describe("update-cli binary replacement", () => {
	it("restores the previous binary when the replacement fails verification", async () => {
		const dir = await makeTempDir();
		const targetPath = path.join(dir, "omp");
		const tempPath = `${targetPath}.new`;
		const backupPath = `${targetPath}.bak`;
		await Bun.write(targetPath, "old binary");
		await Bun.write(tempPath, "broken binary");

		await expect(
			replaceBinaryForUpdate({
				targetPath,
				tempPath,
				backupPath,
				expectedVersion: "15.1.8",
				verifyInstalledVersion: async () => ({ ok: false, path: targetPath }),
			}),
		).rejects.toThrow("restored previous sk binary");

		expect(await Bun.file(targetPath).text()).toBe("old binary");
		expect(await Bun.file(tempPath).exists()).toBe(false);
		expect(await Bun.file(backupPath).exists()).toBe(false);
	});

	it("keeps the replacement only after it reports the expected version", async () => {
		const dir = await makeTempDir();
		const targetPath = path.join(dir, "omp");
		const tempPath = `${targetPath}.new`;
		const backupPath = `${targetPath}.bak`;
		await Bun.write(targetPath, "old binary");
		await Bun.write(tempPath, "new binary");

		await replaceBinaryForUpdate({
			targetPath,
			tempPath,
			backupPath,
			expectedVersion: "15.1.8",
			verifyInstalledVersion: async () => ({ ok: true, actual: "15.1.8", path: targetPath }),
		});

		expect(await Bun.file(targetPath).text()).toBe("new binary");
		expect(await Bun.file(tempPath).exists()).toBe(false);
		expect(await Bun.file(backupPath).exists()).toBe(false);
	});
});
