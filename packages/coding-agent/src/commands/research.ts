import { Args, Command } from "@oh-my-pi/pi-utils/cli";
import { runResearchCommand } from "@scidekick/cli/commands/research";

export default class Research extends Command {
	static description = "Run Scidekick research commands";

	static args = {
		values: Args.string({
			description: "Research command arguments",
			required: false,
			multiple: true,
		}),
	};

	async run(): Promise<void> {
		const { args } = await this.parse(Research);
		const result = await runResearchCommand({ argv: args.values ?? [] });
		process.stdout.write(result.text);
	}
}
