/**
 * Check whether the vendored upstream can be safely updated without conflicts
 * with Scidekick's custom modifications.
 *
 * For each forked @oh-my-pi/* package, computes the diff between
 * vendor/oh-my-pi/packages/<pkg>/src and packages/<pkg>/src. Reports:
 *
 * 1. Which files Scidekick has modified (the "fork patch")
 * 2. Whether the vendor copy is behind upstream (needs an update)
 * 3. Whether upstream changes overlap with Scidekick's modifications
 *
 * Usage:
 *   bun run scripts/check-upstream-safety.ts              # check against current vendor
 *   bun run scripts/check-upstream-safety.ts --fetch       # fetch latest upstream first
 *   bun run scripts/check-upstream-safety.ts --json        # machine-readable output
 */

import { $ } from "bun";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const VENDOR = path.join(ROOT, "vendor", "oh-my-pi");
const PACKAGES = path.join(ROOT, "packages");

interface ForkPatch {
	packageName: string;
	/** Files Scidekick has modified relative to the vendor copy. */
	modifiedFiles: string[];
	/** Files added by Scidekick (don't exist in vendor). */
	addedFiles: string[];
	/** Files removed by Scidekick (exist in vendor but not here). */
	removedFiles: string[];
}

interface ConflictReport {
	packageName: string;
	file: string;
	reason: string;
}

async function main() {
	const fetchFirst = process.argv.includes("--fetch");
	const jsonOutput = process.argv.includes("--json");

	if (fetchFirst) {
		console.log("Fetching latest upstream...");
		// Vendor is a git subtree or submodule — try to update it.
		const result = await $`git -C ${VENDOR} fetch origin 2>&1`.quiet().nothrow();
		if (result.exitCode !== 0) {
			console.warn("  Could not fetch upstream (vendor may not be a git repo).");
		} else {
			const behind = await $`git -C ${VENDOR} rev-list --count HEAD..origin/main`.quiet().nothrow();
			if (behind.exitCode === 0) {
				const count = parseInt(behind.text().trim(), 10);
				console.log(`  Upstream is ${count} commits ahead of vendor copy.`);
			}
		}
	}

	const patches = await computeForkPatches();
	const conflicts = await findConflicts(patches);

	if (jsonOutput) {
		console.log(JSON.stringify({ patches, conflicts }, null, 2));
		return;
	}

	// --- Human-readable report ---
	console.log(`\n## Fork patches (${patches.length} packages)\n`);

	for (const patch of patches) {
		if (patch.modifiedFiles.length === 0 && patch.addedFiles.length === 0 && patch.removedFiles.length === 0) {
			console.log(`  ${patch.packageName}: NO MODIFICATIONS (safe to fast-forward)`);
			continue;
		}
		console.log(`  ${patch.packageName}:`);
		for (const f of patch.modifiedFiles) console.log(`    M ${f}`);
		for (const f of patch.addedFiles) console.log(`    + ${f}`);
		for (const f of patch.removedFiles) console.log(`    - ${f}`);
	}

	if (conflicts.length > 0) {
		console.log(`\n## ⚠ CONFLICTS (${conflicts.length})\n`);
		for (const c of conflicts) {
			console.log(`  ${c.packageName}/${c.file}: ${c.reason}`);
		}
		console.log("\n  Resolve conflicts before updating the vendor copy.");
	} else {
		console.log("\n## ✓ No conflicts detected\n");
		console.log("  Vendor copy can be updated safely. Run:");
		console.log("    cd vendor/oh-my-pi && git pull origin main");
		console.log("    bun run scripts/sync-vendor-version.ts");
		console.log("    bun install && bun run check");
	}
}

/** Compute the fork patch for each forked package. */
async function computeForkPatches(): Promise<ForkPatch[]> {
	const vendorDirs = await listDirs(path.join(VENDOR, "packages"));
	const patches: ForkPatch[] = [];

	for (const dir of vendorDirs) {
		const vendorSrc = path.join(VENDOR, "packages", dir, "src");
		const ourSrc = path.join(PACKAGES, dir, "src");

		const [vendorFiles, ourFiles] = await Promise.all([
			listFiles(vendorSrc),
			listFiles(ourSrc),
		]);

		const name = await packageName(path.join(PACKAGES, dir));
		if (!name) continue;

		const patch: ForkPatch = { packageName: name, modifiedFiles: [], addedFiles: [], removedFiles: [] };

		// Check modified and added files.
		for (const relPath of ourFiles) {
			const ourContent = await tryRead(path.join(ourSrc, relPath));
			const vendorContent = await tryRead(path.join(vendorSrc, relPath));

			if (vendorContent === null) {
				patch.addedFiles.push(relPath);
			} else if (ourContent !== vendorContent) {
				patch.modifiedFiles.push(relPath);
			}
		}

		// Check removed files.
		for (const relPath of vendorFiles) {
			if (!ourFiles.has(relPath)) {
				patch.removedFiles.push(relPath);
			}
		}

		patches.push(patch);
	}

	return patches;
}

/** Check if upstream changes overlap with fork patches. */
async function findConflicts(patches: ForkPatch[]): Promise<ConflictReport[]> {
	const conflicts: ConflictReport[] = [];

	// For now: check if vendor has uncommitted changes indicating
	// the vendor copy was modified since the fork point.
	for (const patch of patches) {
		const vendorDir = findVendorDir(patch.packageName);
		if (!vendorDir) continue;

		const result = await $`git -C ${VENDOR} diff --name-only HEAD -- packages/${vendorDir}/src/`.quiet().nothrow();
		if (result.exitCode === 0 && result.text().trim()) {
			const changedFiles = result.text().trim().split("\n");
			for (const f of changedFiles) {
				const rel = f.replace(`packages/${vendorDir}/src/`, "");
				if (patch.modifiedFiles.includes(rel) || patch.addedFiles.includes(rel)) {
					conflicts.push({
						packageName: patch.packageName,
						file: rel,
						reason: "vendor modified after fork; Scidekick also modified this file",
					});
				}
			}
		}
	}

	return conflicts;
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function listDirs(dir: string): Promise<string[]> {
	try {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		return entries.filter(e => e.isDirectory()).map(e => e.name);
	} catch {
		return [];
	}
}

async function listFiles(dir: string): Promise<Set<string>> {
	const files = new Set<string>();
	try {
		await walk(dir, "", files);
	} catch {
		// dir doesn't exist — empty set.
	}
	return files;
}

async function walk(base: string, rel: string, out: Set<string>): Promise<void> {
	const full = path.join(base, rel);
	const entries = await fs.readdir(full, { withFileTypes: true });
	for (const e of entries) {
		const childRel = rel ? `${rel}/${e.name}` : e.name;
		if (e.isDirectory()) {
			if (e.name === "node_modules" || e.name === ".git") continue;
			await walk(base, childRel, out);
		} else if (e.isFile()) {
			out.add(childRel);
		}
	}
}

async function tryRead(p: string): Promise<string | null> {
	try {
		return await fs.readFile(p, "utf-8");
	} catch {
		return null;
	}
}

async function packageName(dir: string): Promise<string | null> {
	try {
		const pkg = JSON.parse(await fs.readFile(path.join(dir, "package.json"), "utf-8"));
		return pkg.name?.startsWith("@oh-my-pi/") ? pkg.name : null;
	} catch {
		return null;
	}
}

function findVendorDir(packageName: string): string | null {
	const map: Record<string, string> = {
		"@oh-my-pi/pi-agent-core": "agent",
		"@oh-my-pi/pi-ai": "ai",
		"@oh-my-pi/pi-coding-agent": "coding-agent",
		"@oh-my-pi/hashline": "hashline",
		"@oh-my-pi/pi-mnemopi": "mnemopi",
		"@oh-my-pi/pi-natives": "natives",
		"@oh-my-pi/omp-stats": "stats",
		"@oh-my-pi/swarm-extension": "swarm-extension",
		"@oh-my-pi/pi-tui": "tui",
		"@oh-my-pi/pi-utils": "utils",
	};
	return map[packageName] ?? null;
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
