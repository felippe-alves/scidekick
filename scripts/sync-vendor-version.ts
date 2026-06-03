/**
 * Sync @oh-my-pi/* package versions from the vendored upstream to the
 * forked packages under packages/.
 *
 * Reads vendor/oh-my-pi/package.json#workspaces.catalog for authoritative
 * versions and updates each forked package.json + the root workspace catalog
 * to match.
 *
 * Usage: bun run scripts/sync-vendor-version.ts [--dry-run]
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const VENDOR_PKG = path.join(ROOT, "vendor", "oh-my-pi", "package.json");
const ROOT_PKG = path.join(ROOT, "package.json");

const OH_MY_PI_SCOPE = "@oh-my-pi/";

async function main() {
	const dryRun = process.argv.includes("--dry-run");

	const vendorPkg = JSON.parse(await fs.readFile(VENDOR_PKG, "utf-8")) as {
		workspaces: { catalog: Record<string, string> };
	};
	const rootPkg = JSON.parse(await fs.readFile(ROOT_PKG, "utf-8")) as {
		workspaces: { catalog: Record<string, string> };
	};

	// Collect @oh-my-pi/* versions from vendor catalog.
	const vendorVersions = new Map<string, string>();
	for (const [name, ver] of Object.entries(vendorPkg.workspaces.catalog)) {
		if (name.startsWith(OH_MY_PI_SCOPE)) {
			vendorVersions.set(name, ver);
		}
	}

	console.log(`Vendor versions: ${vendorVersions.size} packages`);
	for (const [name, ver] of vendorVersions) console.log(`  ${name}: ${ver}`);

	// --- Update root workspace catalog ---
	let rootChanged = false;
	for (const name of vendorVersions.keys()) {
		const current = rootPkg.workspaces.catalog[name];
		const target = vendorVersions.get(name)!;
		if (current !== target) {
			console.log(`  CATALOG: ${name} ${current} → ${target}`);
			rootPkg.workspaces.catalog[name] = target;
			rootChanged = true;
		}
	}

	if (!dryRun && rootChanged) {
		await fs.writeFile(ROOT_PKG, JSON.stringify(rootPkg, null, 2) + "\n");
		console.log("  → Updated root package.json");
	}

	// --- Update each forked package under packages/ ---
	const packagesDir = path.join(ROOT, "packages");
	const entries = await fs.readdir(packagesDir, { withFileTypes: true });

	let pkgCount = 0;
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const pkgPath = path.join(packagesDir, entry.name, "package.json");
		let pkg: { name: string; version: string };
		try {
			pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
		} catch {
			continue;
		}
		if (!pkg.name?.startsWith(OH_MY_PI_SCOPE)) continue;

		const target = vendorVersions.get(pkg.name);
		if (!target) {
			console.warn(`  WARN: ${pkg.name} not in vendor catalog`);
			continue;
		}
		if (pkg.version === target) {
			console.log(`  SKIP: ${pkg.name} already ${target}`);
			continue;
		}

		console.log(`  PKG: ${entry.name}/ ${pkg.name} ${pkg.version} → ${target}`);
		if (!dryRun) {
			pkg.version = target;
			await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
			pkgCount++;
		}
	}

	if (dryRun) {
		console.log(`\nDRY RUN — ${pkgCount} packages would be updated. Run without --dry-run to apply.`);
	} else {
		console.log(`\nDone — ${pkgCount} packages updated. Run \`bun install\` to refresh the lockfile.`);
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
