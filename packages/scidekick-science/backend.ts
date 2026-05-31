/**
 * Wiki backend — filesystem-based scientific knowledge base.
 *
 * Provides CRUD operations for wiki entries with YAML frontmatter.
 * Entries live in ~/.sk/wiki/ (user) or .sk/wiki/ (project) as
 * markdown files organized by entity type.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getAgentDir } from "@oh-my-pi/pi-utils";
import YAML from "yaml";

// ── Types ──

/** Supported scientific entity types. */
export type WikiEntityType = "paper" | "hypothesis" | "experiment" | "evidence" | "insight";

/** Frontmatter fields for a wiki entry. */
export interface WikiFrontmatter {
	title: string;
	type: WikiEntityType;
	created: string;
	updated: string;
	tags: string[];
	/** For papers: DOI, authors, journal. */
	doi?: string;
	authors?: string[];
	journal?: string;
	year?: number;
	/** For hypotheses: status, parent experiment. */
	status?: "draft" | "proposed" | "testing" | "confirmed" | "rejected";
	/** For experiments: base protocol reference (base-delta pattern). */
	base_protocol?: string;
	/** For evidence: links to source hypothesis and experiment. */
	source_hypothesis?: string;
	source_experiment?: string;
	/** For evidence: strength assessment. */
	strength?: "weak" | "moderate" | "strong";
	/** Arbitrary extra fields. */
	[key: string]: unknown;
}

/** A wiki entry: frontmatter + markdown body. */
export interface WikiEntry {
	/** Unique slug (derived from filename). */
	slug: string;
	/** Absolute path to the markdown file. */
	path: string;
	/** Parsed frontmatter. */
	frontmatter: WikiFrontmatter;
	/** Body text after frontmatter. */
	body: string;
}

/** Search/query parameters. */
export interface WikiQuery {
	type?: WikiEntityType;
	tag?: string;
	status?: string;
	/** Full-text search in title and body (simple substring match). */
	search?: string;
	limit?: number;
}

// ── Backend interface ──

export interface WikiBackend {
	/** Create or update an entry. */
	save(entry: WikiFrontmatter, body: string): Promise<WikiEntry>;
	/** Read a single entry by slug. */
	get(slug: string): Promise<WikiEntry | null>;
	/** Delete an entry. */
	delete(slug: string): Promise<boolean>;
	/** Query entries matching filters. */
	query(params: WikiQuery): Promise<WikiEntry[]>;
	/** List all slugs. */
	list(): Promise<string[]>;
	/** Validate an entry against its schema template. */
	lint(slug: string): Promise<string[]>;
	/** Get the schema template for a given type. */
	getTemplate(type: WikiEntityType): string;
}

// ── Filesystem implementation ──

export class FilesystemWikiBackend implements WikiBackend {
	readonly #root: string;
	readonly #schemaDir: string;

	constructor(root?: string) {
		this.#root = root ?? path.join(getAgentDir(), "wiki");
		// Schema templates live alongside the source code
		this.#schemaDir = path.join(import.meta.dir, "..", "wiki-schemas");
	}

	async #ensureDir(): Promise<void> {
		await fs.mkdir(this.#root, { recursive: true });
	}

	#slugToPath(slug: string): string {
		// Sanitize: allow alphanumeric, hyphens, underscores
		const safe = slug
			.replace(/[^a-zA-Z0-9_-]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "");
		return path.join(this.#root, `${safe}.md`);
	}

	#pathToSlug(filePath: string): string {
		return path.basename(filePath, ".md");
	}

	async save(frontmatter: WikiFrontmatter, body: string): Promise<WikiEntry> {
		await this.#ensureDir();

		const slug = this.#slugify(frontmatter.title);
		const filePath = this.#slugToPath(slug);
		const now = new Date().toISOString();

		// Check if updating existing
		let existingFm: WikiFrontmatter | null = null;
		try {
			const existing = await this.#parseFile(filePath);
			if (existing) {
				existingFm = existing.frontmatter;
			}
		} catch {
			// New entry
		}

		const fm: WikiFrontmatter = {
			...frontmatter,
			title: frontmatter.title,
			type: frontmatter.type,
			created: existingFm?.created ?? now,
			updated: now,
			tags: frontmatter.tags ?? [],
		};

		const content = this.#serialize(fm, body);
		await fs.writeFile(filePath, content, "utf-8");

		return { slug, path: filePath, frontmatter: fm, body };
	}

	async get(slug: string): Promise<WikiEntry | null> {
		const filePath = this.#slugToPath(slug);
		return this.#parseFile(filePath);
	}

	async delete(slug: string): Promise<boolean> {
		const filePath = this.#slugToPath(slug);
		try {
			await fs.unlink(filePath);
			return true;
		} catch {
			return false;
		}
	}

	async query(params: WikiQuery): Promise<WikiEntry[]> {
		await this.#ensureDir();
		const entries: WikiEntry[] = [];

		try {
			const files = await fs.readdir(this.#root);
			for (const file of files) {
				if (!file.endsWith(".md")) continue;
				const filePath = path.join(this.#root, file);
				const entry = await this.#parseFile(filePath);
				if (!entry) continue;
				if (!this.#matchesQuery(entry, params)) continue;
				entries.push(entry);
				if (params.limit && entries.length >= params.limit) break;
			}
		} catch {
			// Directory doesn't exist yet
		}

		return entries;
	}

	async list(): Promise<string[]> {
		try {
			const files = await fs.readdir(this.#root);
			return files.filter(f => f.endsWith(".md")).map(f => this.#pathToSlug(f));
		} catch {
			return [];
		}
	}

	async lint(slug: string): Promise<string[]> {
		const entry = await this.get(slug);
		if (!entry) return [`Entry not found: ${slug}`];

		const errors: string[] = [];

		// Required fields
		if (!entry.frontmatter.title) errors.push("Missing required field: title");
		if (!entry.frontmatter.type) errors.push("Missing required field: type");
		if (!entry.frontmatter.created) errors.push("Missing required field: created");

		// Type-specific validations
		switch (entry.frontmatter.type) {
			case "paper":
				if (!entry.frontmatter.doi && !entry.frontmatter.authors) {
					errors.push("Paper should have doi or authors");
				}
				break;
			case "hypothesis":
				if (!entry.frontmatter.status) {
					errors.push("Hypothesis should have a status");
				}
				break;
			case "experiment":
				if (entry.frontmatter.base_protocol) {
					const base = await this.get(entry.frontmatter.base_protocol);
					if (!base) errors.push(`Base protocol not found: ${entry.frontmatter.base_protocol}`);
				}
				break;
			case "evidence":
				if (!entry.frontmatter.source_hypothesis && !entry.frontmatter.source_experiment) {
					errors.push("Evidence should link to a source hypothesis or experiment");
				}
				break;
		}

		return errors;
	}

	getTemplate(type: WikiEntityType): string {
		const templatePath = path.join(this.#schemaDir, `${type}.md`);
		try {
			// Synchronous read is acceptable for embedded templates
			const { readFileSync } = require("node:fs");
			return readFileSync(templatePath, "utf-8");
		} catch {
			return `---\ntitle: ""\ntype: ${type}\ntags: []\n---\n\n# New ${type}\n`;
		}
	}

	// ── Private helpers ──

	async #parseFile(filePath: string): Promise<WikiEntry | null> {
		try {
			const raw = await fs.readFile(filePath, "utf-8");
			const { frontmatter, body } = this.#deserialize(raw);
			const slug = this.#pathToSlug(filePath);
			return { slug, path: filePath, frontmatter, body };
		} catch {
			return null;
		}
	}

	#serialize(fm: WikiFrontmatter, body: string): string {
		const yaml = YAML.stringify(fm, { lineWidth: 0 });
		// Strip trailing newline from YAML output for consistent formatting
		const clean = yaml.trimEnd();
		return `---\n${clean}\n---\n\n${body.trim()}\n`;
	}

	#deserialize(raw: string): { frontmatter: WikiFrontmatter; body: string } {
		if (!raw.startsWith("---")) {
			return {
				frontmatter: { title: "", type: "insight", created: "", updated: "", tags: [] },
				body: raw,
			};
		}

		const endIdx = raw.indexOf("---", 3);
		if (endIdx < 0) {
			return {
				frontmatter: { title: "", type: "insight", created: "", updated: "", tags: [] },
				body: raw,
			};
		}

		const yamlStr = raw.slice(3, endIdx);
		const body = raw.slice(endIdx + 3).trim();

		let frontmatter: WikiFrontmatter;
		try {
			frontmatter = YAML.parse(yamlStr) as WikiFrontmatter;
		} catch {
			frontmatter = { title: "", type: "insight", created: "", updated: "", tags: [] };
		}

		// Ensure required fields
		frontmatter.type = frontmatter.type ?? "insight";
		frontmatter.tags = frontmatter.tags ?? [];
		frontmatter.title = frontmatter.title ?? "";

		return { frontmatter, body };
	}

	#matchesQuery(entry: WikiEntry, params: WikiQuery): boolean {
		if (params.type && entry.frontmatter.type !== params.type) return false;
		if (params.tag && !entry.frontmatter.tags.includes(params.tag)) return false;
		if (params.status && entry.frontmatter.status !== params.status) return false;
		if (params.search) {
			const searchLower = params.search.toLowerCase();
			const inTitle = entry.frontmatter.title.toLowerCase().includes(searchLower);
			const inBody = entry.body.toLowerCase().includes(searchLower);
			if (!inTitle && !inBody) return false;
		}
		return true;
	}

	#slugify(title: string): string {
		return (
			title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "")
				.slice(0, 64) || "untitled"
		);
	}
}
