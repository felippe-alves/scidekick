import * as path from "node:path";
import { APP_NAME, getProjectDir } from "@oh-my-pi/pi-utils";
import { Args, Command } from "@oh-my-pi/pi-utils/cli";
import { getScientificCommandTierWarning } from "../scidekick/command-tier-warning";
import { FilesystemWikiBackend, type WikiEntityType } from "../scidekick/wiki-backend";

const WIKI_ACTIONS = ["init", "page", "query", "ingest", "new", "list", "show", "lint"] as const;
type WikiAction = (typeof WIKI_ACTIONS)[number];
const ENTITY_TYPES: WikiEntityType[] = ["paper", "hypothesis", "experiment", "evidence", "insight", "note", "run"];

export default class Wiki extends Command {
	static description = "Manage the project research wiki";

	static args = {
		action: Args.string({
			description: `Action (${WIKI_ACTIONS.join("|")})`,
			required: false,
		}),
		values: Args.string({
			description: "Action arguments",
			required: false,
			multiple: true,
		}),
	};

	static examples = [
		`${APP_NAME} wiki init`,
		`${APP_NAME} wiki page baseline-eval`,
		`${APP_NAME} wiki query baseline`,
		`${APP_NAME} wiki ingest notes.md "Baseline notes"`,
		`${APP_NAME} wiki new paper "Example Paper"`,
		`${APP_NAME} wiki show baseline-eval`,
		`${APP_NAME} wiki lint baseline-eval`,
	];

	async run(): Promise<void> {
		const { args } = await this.parse(Wiki);
		const action = args.action as WikiAction | undefined;
		if (!action) {
			process.stdout.write(`Usage: ${APP_NAME} wiki <${WIKI_ACTIONS.join("|")}> ...\n`);
			return;
		}
		const values = args.values ?? [];
		const backend = new FilesystemWikiBackend();
		switch (action) {
			case "init":
				await this.#init(backend);
				break;
			case "list":
				await this.#list(backend);
				break;
			case "page":
				await this.#page(backend, values);
				break;
			case "query":
				await this.#query(backend, values);
				break;
			case "ingest":
				await this.#ingest(backend, values);
				break;
			case "new":
				await this.#create(backend, values[0], values.slice(1).join(" "));
				break;
			case "show":
				await this.#show(backend, values[0]);
				break;
			case "lint":
				await this.#lint(backend, values[0]);
				break;
		}
		if (process.exitCode !== 1) {
			const scienceTierWarning = await getScientificCommandTierWarning("wiki");
			if (scienceTierWarning) {
				process.stderr.write(`Warning: ${scienceTierWarning}\n`);
			}
		}
	}

	async #init(backend: FilesystemWikiBackend): Promise<void> {
		const root = await backend.init();
		process.stdout.write(`Initialized research wiki at ${root}\n`);
	}

	async #list(backend: FilesystemWikiBackend): Promise<void> {
		const entries = await backend.list();
		if (entries.length === 0) {
			process.stdout.write("No wiki entries found.\n");
			return;
		}
		for (const entry of entries) {
			process.stdout.write(`${entry.slug}\t${entry.frontmatter.type}\t${entry.frontmatter.title}\n`);
		}
	}

	async #page(backend: FilesystemWikiBackend, values: string[]): Promise<void> {
		const title = values.join(" ").trim();
		if (!title) {
			process.stderr.write("Title is required for 'wiki page'.\n");
			process.exitCode = 1;
			return;
		}
		const entry = await backend.create("note", title);
		process.stdout.write(`Created ${entry.slug} at ${entry.path}\n`);
	}

	async #query(backend: FilesystemWikiBackend, values: string[]): Promise<void> {
		const search = values.join(" ").trim();
		if (!search) {
			process.stderr.write("Search text is required for 'wiki query'.\n");
			process.exitCode = 1;
			return;
		}
		const entries = await backend.query({ search });
		if (entries.length === 0) {
			process.stdout.write("No matching wiki entries found.\n");
			return;
		}
		for (const entry of entries) {
			process.stdout.write(`${entry.slug}\t${entry.frontmatter.type}\t${entry.frontmatter.title}\n`);
		}
	}

	async #ingest(backend: FilesystemWikiBackend, values: string[]): Promise<void> {
		const source = values[0];
		if (!source) {
			process.stderr.write("Source path is required for 'wiki ingest'.\n");
			process.exitCode = 1;
			return;
		}
		const sourcePath = path.resolve(getProjectDir(), source);
		let body: string;
		try {
			body = await Bun.file(sourcePath).text();
		} catch {
			process.stderr.write(`Cannot read source: ${source}\n`);
			process.exitCode = 1;
			return;
		}
		const title = values.slice(1).join(" ").trim() || path.basename(sourcePath, path.extname(sourcePath));
		const entry = await backend.create("note", title, body, { source_path: sourcePath });
		process.stdout.write(`Ingested ${source} as ${entry.slug} at ${entry.path}\n`);
	}

	async #create(backend: FilesystemWikiBackend, typeArg?: string, title?: string): Promise<void> {
		if (!typeArg || !ENTITY_TYPES.includes(typeArg as WikiEntityType)) {
			process.stderr.write(`Entity type must be one of: ${ENTITY_TYPES.join(", ")}\n`);
			process.exitCode = 1;
			return;
		}
		if (!title || title.trim().length === 0) {
			process.stderr.write("Title is required for 'wiki new'.\n");
			process.exitCode = 1;
			return;
		}
		const entry = await backend.create(typeArg as WikiEntityType, title.trim());
		process.stdout.write(`Created ${entry.slug} at ${entry.path}\n`);
	}

	async #show(backend: FilesystemWikiBackend, slug?: string): Promise<void> {
		if (!slug) {
			process.stderr.write("Slug is required for 'wiki show'.\n");
			process.exitCode = 1;
			return;
		}
		const raw = await backend.readRaw(slug);
		if (!raw) {
			process.stderr.write(`Entry not found: ${slug}\n`);
			process.exitCode = 1;
			return;
		}
		process.stdout.write(raw.endsWith("\n") ? raw : `${raw}\n`);
	}

	async #lint(backend: FilesystemWikiBackend, slug?: string): Promise<void> {
		if (!slug) {
			process.stderr.write("Slug is required for 'wiki lint'.\n");
			process.exitCode = 1;
			return;
		}
		const errors = await backend.lint(slug);
		if (errors.length === 0) {
			process.stdout.write(`OK: ${slug}\n`);
			return;
		}
		for (const error of errors) {
			process.stderr.write(`${error}\n`);
		}
		process.exitCode = 1;
	}
}
