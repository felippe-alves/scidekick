import { APP_NAME } from "@oh-my-pi/pi-utils";
import { Args, Command } from "@oh-my-pi/pi-utils/cli";
import { getScientificCommandTierWarning } from "../scidekick/command-tier-warning";
import { FilesystemWikiBackend, type WikiEntityType } from "../scidekick/wiki-backend";

const WIKI_ACTIONS = ["new", "list", "show", "lint"] as const;
type WikiAction = (typeof WIKI_ACTIONS)[number];
const ENTITY_TYPES: WikiEntityType[] = ["paper", "hypothesis", "experiment", "evidence", "insight"];

export default class Wiki extends Command {
	static description = "Manage the filesystem-backed scientific wiki";

	static args = {
		action: Args.string({
			description: "Action to perform",
			required: false,
			options: [...WIKI_ACTIONS],
		}),
		first: Args.string({
			description: "Entity type for 'new', or slug for 'show'/'lint'",
			required: false,
		}),
		second: Args.string({
			description: "Title for 'new'",
			required: false,
		}),
	};

	static examples = [
		`${APP_NAME} wiki list`,
		`${APP_NAME} wiki new paper "Example Paper"`,
		`${APP_NAME} wiki new hypothesis "Catalyst lowers activation energy"`,
		`${APP_NAME} wiki show catalyst-lowers-activation-energy`,
		`${APP_NAME} wiki lint catalyst-lowers-activation-energy`,
	];

	async run(): Promise<void> {
		const { args } = await this.parse(Wiki);
		const action = args.action as WikiAction | undefined;
		if (!action) {
			process.stdout.write(`Usage: ${APP_NAME} wiki <${WIKI_ACTIONS.join("|")}> ...\n`);
			return;
		}
		const backend = new FilesystemWikiBackend();
		switch (action) {
			case "list":
				await this.#list(backend);
				break;
			case "new":
				await this.#create(backend, args.first, args.second);
				break;
			case "show":
				await this.#show(backend, args.first);
				break;
			case "lint":
				await this.#lint(backend, args.first);
				break;
		}
		if (process.exitCode !== 1) {
			const scienceTierWarning = await getScientificCommandTierWarning("wiki");
			if (scienceTierWarning) {
				process.stderr.write(`Warning: ${scienceTierWarning}\n`);
			}
		}
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
