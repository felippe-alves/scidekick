import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getProjectAgentDir, getProjectDir } from "@oh-my-pi/pi-utils";
import { YAML } from "bun";
import evidenceTemplate from "../wiki-schemas/evidence.md" with { type: "text" };
import experimentTemplate from "../wiki-schemas/experiment.md" with { type: "text" };
import hypothesisTemplate from "../wiki-schemas/hypothesis.md" with { type: "text" };
import insightTemplate from "../wiki-schemas/insight.md" with { type: "text" };
import paperTemplate from "../wiki-schemas/paper.md" with { type: "text" };

export type WikiEntityType = "paper" | "hypothesis" | "experiment" | "evidence" | "insight" | "note" | "run";

export interface WikiFrontmatter {
	title: string;
	type: WikiEntityType;
	created: string;
	updated: string;
	tags: string[];
	doi?: string;
	authors?: string[];
	journal?: string;
	year?: number | null;
	status?: "draft" | "proposed" | "testing" | "confirmed" | "rejected";
	base_protocol?: string;
	source_hypothesis?: string;
	source_experiment?: string;
	strength?: "weak" | "moderate" | "strong";
	source_path?: string;
	[key: string]: unknown;
}

export interface WikiEntry {
	slug: string;
	path: string;
	frontmatter: WikiFrontmatter;
	body: string;
}

export interface WikiQuery {
	type?: WikiEntityType;
	tag?: string;
	status?: string;
	search?: string;
	limit?: number;
}

const TEMPLATE_BY_TYPE: Partial<Record<WikiEntityType, string>> = {
	paper: paperTemplate,
	hypothesis: hypothesisTemplate,
	experiment: experimentTemplate,
	evidence: evidenceTemplate,
	insight: insightTemplate,
	note: `# {{title}}\n\n## Notes\n\n`,
	run: `# Run: {{title}}\n\n## Summary\n\n## Links\n\n`,
};

const WIKI_INDEX = `# Research Wiki\n\nDurable project knowledge for papers, runs, notes, claims, methods, and research context.\n\n## Suggested pages\n\n- papers/\n- runs/\n- notes/\n- claims/\n\n`;

export class FilesystemWikiBackend {
	readonly #root: string;

	constructor(root: string = path.join(getProjectAgentDir(getProjectDir()), "wiki")) {
		this.#root = root;
	}

	get root(): string {
		return this.#root;
	}

	async init(): Promise<string> {
		await fs.mkdir(this.#root, { recursive: true });
		await Promise.all(
			["papers", "runs", "notes", "claims"].map(dir => fs.mkdir(path.join(this.#root, dir), { recursive: true })),
		);
		const indexPath = path.join(this.#root, "index.md");
		try {
			await fs.access(indexPath);
		} catch {
			await Bun.write(indexPath, WIKI_INDEX);
		}
		return this.#root;
	}

	async save(frontmatter: WikiFrontmatter, body: string): Promise<WikiEntry> {
		await this.init();
		const slug = slugify(frontmatter.title);
		const filePath = this.#entryPath(slug);
		const now = new Date().toISOString();
		const existing = await this.get(slug);
		const nextFrontmatter: WikiFrontmatter = {
			...frontmatter,
			created: existing?.frontmatter.created ?? frontmatter.created ?? now,
			updated: now,
			tags: frontmatter.tags ?? [],
		};
		const trimmedBody = body.trim();
		await Bun.write(filePath, serialize(nextFrontmatter, trimmedBody));
		return { slug, path: filePath, frontmatter: nextFrontmatter, body: trimmedBody };
	}

	async create(
		type: WikiEntityType,
		title: string,
		body?: string,
		extraFrontmatter?: Partial<WikiFrontmatter>,
	): Promise<WikiEntry> {
		const template = TEMPLATE_BY_TYPE[type] ?? insightTemplate;
		const now = new Date().toISOString();
		const frontmatter = { ...defaultFrontmatter(type, title, now), ...extraFrontmatter } as WikiFrontmatter;
		const renderedBody =
			body ??
			renderTemplateBody(template, {
				title,
				status: frontmatter.status ?? "draft",
				base_protocol: frontmatter.base_protocol ?? "",
				source_hypothesis: frontmatter.source_hypothesis ?? "",
				source_experiment: frontmatter.source_experiment ?? "",
				strength: frontmatter.strength ?? "moderate",
				authors: "",
				journal: "",
				year: "",
				doi: "",
			});
		return this.save(frontmatter, renderedBody);
	}

	async get(slug: string): Promise<WikiEntry | null> {
		try {
			const safeSlug = sanitizeSlug(slug);
			const filePath = this.#entryPath(safeSlug);
			const raw = await Bun.file(filePath).text();
			const { frontmatter, body } = deserialize(raw);
			return { slug: safeSlug, path: filePath, frontmatter, body };
		} catch {
			return null;
		}
	}

	async readRaw(slug: string): Promise<string | null> {
		try {
			return await Bun.file(this.#entryPath(sanitizeSlug(slug))).text();
		} catch {
			return null;
		}
	}

	async list(): Promise<WikiEntry[]> {
		try {
			await this.init();
			const files = (await fs.readdir(this.#root))
				.filter(name => name.endsWith(".md") && name !== "index.md")
				.sort();
			const entries = await Promise.all(files.map(file => this.get(file.slice(0, -3))));
			return entries.filter((entry): entry is WikiEntry => entry !== null);
		} catch {
			return [];
		}
	}

	async query(params: WikiQuery): Promise<WikiEntry[]> {
		const entries = await this.list();
		const filtered = entries.filter(entry => matchesQuery(entry, params));
		return params.limit ? filtered.slice(0, params.limit) : filtered;
	}

	async lint(slug: string): Promise<string[]> {
		const entry = await this.get(slug);
		if (!entry) return [`Entry not found: ${slug}`];
		const errors: string[] = [];
		if (!entry.frontmatter.title) errors.push("Missing required field: title");
		if (!entry.frontmatter.type) errors.push("Missing required field: type");
		if (!entry.frontmatter.created) errors.push("Missing required field: created");

		switch (entry.frontmatter.type) {
			case "paper":
				if (!entry.frontmatter.doi && !(entry.frontmatter.authors && entry.frontmatter.authors.length > 0)) {
					errors.push("Paper should have doi or authors");
				}
				break;
			case "hypothesis":
				if (!entry.frontmatter.status) errors.push("Hypothesis should have a status");
				break;
			case "experiment":
				if (entry.frontmatter.base_protocol) {
					const base = await this.get(String(entry.frontmatter.base_protocol));
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

	#entryPath(slug: string): string {
		return path.join(this.#root, `${sanitizeSlug(slug)}.md`);
	}
}

function defaultFrontmatter(type: WikiEntityType, title: string, now: string): WikiFrontmatter {
	const base: WikiFrontmatter = { title, type, created: now, updated: now, tags: [] };
	switch (type) {
		case "paper":
			return { ...base, doi: "", authors: [], journal: "", year: null };
		case "hypothesis":
			return { ...base, status: "draft" };
		case "experiment":
			return { ...base, base_protocol: "" };
		case "evidence":
			return { ...base, source_hypothesis: "", source_experiment: "", strength: "moderate" };
		case "run":
			return { ...base, tags: ["run"] };
		case "note":
			return { ...base, tags: ["note"] };
		case "insight":
			return base;
	}
}

function renderTemplateBody(template: string, values: Record<string, string>): string {
	const body = template.replace(/^---\n[\s\S]*?\n---\n?/m, "").trim();
	return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}

function serialize(frontmatter: WikiFrontmatter, body: string): string {
	const yaml = YAML.stringify(frontmatter).trimEnd();
	return `---\n${yaml}\n---\n\n${body.trim()}\n`;
}

function deserialize(raw: string): { frontmatter: WikiFrontmatter; body: string } {
	if (!raw.startsWith("---\n")) {
		return { frontmatter: defaultFrontmatter("insight", "", ""), body: raw };
	}
	const end = raw.indexOf("\n---\n", 4);
	if (end < 0) {
		return { frontmatter: defaultFrontmatter("insight", "", ""), body: raw };
	}
	const frontmatter = (YAML.parse(raw.slice(4, end)) ?? {}) as WikiFrontmatter;
	frontmatter.title = typeof frontmatter.title === "string" ? frontmatter.title : "";
	frontmatter.type = (frontmatter.type as WikiEntityType | undefined) ?? "insight";
	frontmatter.created = typeof frontmatter.created === "string" ? frontmatter.created : "";
	frontmatter.updated = typeof frontmatter.updated === "string" ? frontmatter.updated : "";
	frontmatter.tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [];
	return { frontmatter, body: raw.slice(end + 5).trim() };
}

function matchesQuery(entry: WikiEntry, params: WikiQuery): boolean {
	if (params.type && entry.frontmatter.type !== params.type) return false;
	if (params.tag && !entry.frontmatter.tags.includes(params.tag)) return false;
	if (params.status && entry.frontmatter.status !== params.status) return false;
	if (params.search) {
		const search = params.search.toLowerCase();
		if (!entry.frontmatter.title.toLowerCase().includes(search) && !entry.body.toLowerCase().includes(search)) {
			return false;
		}
	}
	return true;
}

export function slugify(title: string): string {
	return sanitizeSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, "-")).slice(0, 64) || "untitled";
}

function sanitizeSlug(slug: string): string {
	return (
		slug
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-+|-+$/g, "") || "untitled"
	);
}
