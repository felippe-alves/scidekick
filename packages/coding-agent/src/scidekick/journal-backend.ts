import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getProjectAgentDir, getProjectDir } from "@oh-my-pi/pi-utils";

export interface JournalEntry {
	id: string;
	path: string;
	body: string;
	created: string;
}

const JOURNAL_INDEX = `# Research Journal\n\nAppend-only chronological research notes for decisions, observations, failed attempts, and links to project knowledge.\n\n`;

export class FilesystemJournalBackend {
	readonly #root: string;

	constructor(root: string = path.join(getProjectAgentDir(getProjectDir()), "journal")) {
		this.#root = root;
	}

	get root(): string {
		return this.#root;
	}

	async init(date = new Date()): Promise<string> {
		await fs.mkdir(this.#yearDir(date), { recursive: true });
		const indexPath = path.join(this.#root, "index.md");
		try {
			await fs.access(indexPath);
		} catch {
			await Bun.write(indexPath, JOURNAL_INDEX);
		}
		return this.#root;
	}

	async add(body: string, date = new Date()): Promise<JournalEntry> {
		const trimmed = body.trim();
		if (trimmed.length === 0) throw new Error("Journal entry body is required.");
		await this.init(date);
		const id = this.#entryId(date);
		const entryPath = this.#dayPath(date);
		await this.#ensureDayFile(date, entryPath);
		const created = date.toISOString();
		const entry = [`\n## ${this.#timeLabel(date)} — ${id}`, "", trimmed, "", "Links:", ""].join("\n");
		await fs.appendFile(entryPath, entry, "utf-8");
		return { id, path: entryPath, body: trimmed, created };
	}

	async today(date = new Date()): Promise<string | null> {
		try {
			return await Bun.file(this.#dayPath(date)).text();
		} catch {
			return null;
		}
	}

	async link(entryId: string, target: string): Promise<string> {
		const normalizedEntryId = entryId.trim();
		const normalizedTarget = target.trim();
		if (!normalizedEntryId) throw new Error("Journal entry id is required.");
		if (!normalizedTarget) throw new Error("Link target is required.");
		await this.init();
		const files = await this.#entryFiles();
		for (const file of files) {
			const raw = await Bun.file(file).text();
			const updated = addLinkToEntry(raw, normalizedEntryId, normalizedTarget);
			if (updated !== null) {
				await Bun.write(file, updated);
				return file;
			}
		}
		throw new Error(`Journal entry not found: ${normalizedEntryId}`);
	}

	#yearDir(date: Date): string {
		return path.join(this.#root, String(date.getFullYear()));
	}

	#dayPath(date: Date): string {
		return path.join(this.#yearDir(date), `${this.#dateLabel(date)}.md`);
	}

	async #ensureDayFile(date: Date, entryPath: string): Promise<void> {
		try {
			await fs.access(entryPath);
		} catch {
			await Bun.write(entryPath, `# ${this.#dateLabel(date)}\n`);
		}
	}

	async #entryFiles(): Promise<string[]> {
		const years = await fs.readdir(this.#root, { withFileTypes: true });
		const files: string[] = [];
		for (const year of years) {
			if (!year.isDirectory()) continue;
			const yearPath = path.join(this.#root, year.name);
			const names = await fs.readdir(yearPath);
			for (const name of names) {
				if (name.endsWith(".md")) files.push(path.join(yearPath, name));
			}
		}
		return files.sort();
	}

	#entryId(date: Date): string {
		return `${this.#dateLabel(date)}-${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}`;
	}

	#dateLabel(date: Date): string {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	}

	#timeLabel(date: Date): string {
		return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
	}
}

function addLinkToEntry(raw: string, entryId: string, target: string): string | null {
	const heading = new RegExp(`^## .* — ${escapeRegExp(entryId)}$`, "m");
	const match = heading.exec(raw);
	if (!match) return null;
	const entryStart = match.index;
	const nextHeading = raw.slice(entryStart + match[0].length).search(/^## /m);
	const entryEnd = nextHeading < 0 ? raw.length : entryStart + match[0].length + nextHeading;
	const before = raw.slice(0, entryStart);
	const entry = raw.slice(entryStart, entryEnd);
	const after = raw.slice(entryEnd);
	const linkLine = `- ${target}`;
	if (entry.includes(linkLine)) return raw;
	if (entry.includes("\nLinks:\n")) {
		return `${before}${entry.replace("\nLinks:\n", `\nLinks:\n${linkLine}\n`)}${after}`;
	}
	const separator = entry.endsWith("\n") ? "" : "\n";
	return `${before}${entry}${separator}\nLinks:\n${linkLine}\n${after}`;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
