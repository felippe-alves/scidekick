import { APP_NAME } from "@oh-my-pi/pi-utils";
import { Args, Command } from "@oh-my-pi/pi-utils/cli";
import { getScientificCommandTierWarning } from "../scidekick/command-tier-warning";
import { FilesystemJournalBackend } from "../scidekick/journal-backend";

const JOURNAL_ACTIONS = ["init", "add", "today", "link"] as const;
type JournalAction = (typeof JOURNAL_ACTIONS)[number];

export default class Journal extends Command {
	static description = "Manage the append-only project research journal";

	static args = {
		action: Args.string({
			description: `Action (${JOURNAL_ACTIONS.join("|")})`,
			required: false,
		}),
		values: Args.string({
			description: "Action arguments",
			required: false,
			multiple: true,
		}),
	};

	static examples = [
		`${APP_NAME} journal init`,
		`${APP_NAME} journal add "Tried baseline eval"`,
		`${APP_NAME} journal today`,
		`${APP_NAME} journal link 2026-05-31-140455 wiki:baseline-eval`,
	];

	async run(): Promise<void> {
		const { args } = await this.parse(Journal);
		const action = args.action as JournalAction | undefined;
		if (!action) {
			process.stdout.write(`Usage: ${APP_NAME} journal <${JOURNAL_ACTIONS.join("|")}> ...\n`);
			return;
		}

		const values = args.values ?? [];
		const backend = new FilesystemJournalBackend();
		try {
			switch (action) {
				case "init":
					await this.#init(backend);
					break;
				case "add":
					await this.#add(backend, values);
					break;
				case "today":
					await this.#today(backend);
					break;
				case "link":
					await this.#link(backend, values);
					break;
			}
		} catch (error) {
			process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
			process.exitCode = 1;
		}

		if (process.exitCode !== 1) {
			const scienceTierWarning = await getScientificCommandTierWarning("journal");
			if (scienceTierWarning) {
				process.stderr.write(`Warning: ${scienceTierWarning}\n`);
			}
		}
	}

	async #init(backend: FilesystemJournalBackend): Promise<void> {
		const root = await backend.init();
		process.stdout.write(`Initialized research journal at ${root}\n`);
	}

	async #add(backend: FilesystemJournalBackend, values: string[]): Promise<void> {
		const body = values.join(" ").trim();
		if (!body) {
			process.stderr.write("Entry text is required for 'journal add'.\n");
			process.exitCode = 1;
			return;
		}
		const entry = await backend.add(body);
		process.stdout.write(`Added ${entry.id} at ${entry.path}\n`);
	}

	async #today(backend: FilesystemJournalBackend): Promise<void> {
		const body = await backend.today();
		if (!body) {
			process.stdout.write("No journal entry for today.\n");
			return;
		}
		process.stdout.write(body.endsWith("\n") ? body : `${body}\n`);
	}

	async #link(backend: FilesystemJournalBackend, values: string[]): Promise<void> {
		const entryId = values[0];
		const target = values.slice(1).join(" ").trim();
		if (!entryId || !target) {
			process.stderr.write("Usage: journal link <entry-id> <target>\n");
			process.exitCode = 1;
			return;
		}
		const file = await backend.link(entryId, target);
		process.stdout.write(`Linked ${entryId} to ${target} in ${file}\n`);
	}
}
