import * as path from "node:path";
import type { ResearchExportManifest } from "../events/render-types";

export interface ResearchExportManifestLocation {
	workspacePath: string;
	exportId: string;
}

export class ResearchExportManifestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ResearchExportManifestError";
	}
}

export function getResearchExportManifestPath(location: ResearchExportManifestLocation): string {
	return path.join(location.workspacePath, ".sk", "research", "exports", `${location.exportId}.json`);
}

export async function readResearchExportManifest(
	locationOrPath: ResearchExportManifestLocation | string,
): Promise<ResearchExportManifest | null> {
	const filePath = typeof locationOrPath === "string" ? locationOrPath : getResearchExportManifestPath(locationOrPath);
	let value: unknown;
	try {
		value = await Bun.file(filePath).json();
	} catch (error) {
		if (isEnoent(error)) return null;
		throw error;
	}
	assertResearchExportManifest(value);
	return value;
}

export async function writeResearchExportManifest(
	locationOrPath: ResearchExportManifestLocation | string,
	manifest: ResearchExportManifest,
): Promise<void> {
	assertResearchExportManifest(manifest);
	const filePath = typeof locationOrPath === "string" ? locationOrPath : getResearchExportManifestPath(locationOrPath);
	await Bun.write(filePath, `${JSON.stringify(manifest, null, "\t")}\n`);
}

export function assertResearchExportManifest(value: unknown): asserts value is ResearchExportManifest {
	if (!isRecord(value)) throw new ResearchExportManifestError("Expected export manifest object");
	requireString(value.exportId, "exportId");
	requireString(value.sessionId, "sessionId");
	if (value.profile !== "plain" && value.profile !== "compact" && value.profile !== "rich") {
		throw new ResearchExportManifestError("Expected supported export profile");
	}
	const createdAt = readRequiredString(value.createdAt, "createdAt");
	if (Number.isNaN(Date.parse(createdAt))) throw new ResearchExportManifestError("Expected ISO createdAt timestamp");
	if (!isRecord(value.eventRange)) throw new ResearchExportManifestError("Expected eventRange object");
	if (!Number.isInteger(value.eventRange.firstSequence) || !Number.isInteger(value.eventRange.lastSequence)) {
		throw new ResearchExportManifestError("Expected integer event range");
	}
	requireString(value.sourceEventLog, "sourceEventLog");
	requireString(value.renderedPath, "renderedPath");
	if (!isRecord(value.references)) throw new ResearchExportManifestError("Expected references object");
}

function isEnoent(error: unknown): boolean {
	return isRecord(error) && error.code === "ENOENT";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): void {
	readRequiredString(value, field);
}

function readRequiredString(value: unknown, field: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new ResearchExportManifestError(`Expected non-empty ${field}`);
	}
	return value;
}
