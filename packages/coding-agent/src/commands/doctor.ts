/**
 * Run install and runtime diagnostics.
 */
import { Command, Flags } from "@oh-my-pi/pi-utils/cli";
import { runDoctorCommand } from "../cli/doctor-cli";

export default class Doctor extends Command {
	static description = "Check install and runtime health";

	static flags = {
		json: Flags.boolean({ char: "j", description: "Output diagnostics as JSON", default: false }),
		fix: Flags.boolean({ char: "f", description: "Create missing config directories", default: false }),
		strict: Flags.boolean({ char: "s", description: "Exit non-zero when warnings are present", default: false }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Doctor);
		await runDoctorCommand({ json: flags.json, fix: flags.fix, strict: flags.strict });
	}
}
