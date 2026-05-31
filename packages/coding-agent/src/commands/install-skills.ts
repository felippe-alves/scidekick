import { APP_NAME } from "@oh-my-pi/pi-utils";
import { Args, Command, Flags } from "@oh-my-pi/pi-utils/cli";
import { getScientificCommandTierWarning } from "../scidekick/command-tier-warning";
import { DEFAULT_SKILLS_REPO, runInstallSkills } from "../scidekick/install-skills";

export default class InstallSkills extends Command {
	static description = "Install scientific skills from a Git repository";
	static aliases = ["skills"];

	static args = {
		repo: Args.string({
			description: "Git repository URL, local path, or GitHub shorthand (owner/repo)",
			required: false,
			default: DEFAULT_SKILLS_REPO,
		}),
	};

	static flags = {
		from: Flags.string({
			char: "f",
			description: "Repository URL, local path, or GitHub shorthand to install skills from",
		}),
		list: Flags.boolean({
			char: "l",
			description: "List available skills without installing",
		}),
		skill: Flags.string({
			char: "s",
			description: "Install only a named skill (repeatable)",
			multiple: true,
		}),
		project: Flags.boolean({
			description: "Install into the current project's .sk/skills directory",
		}),
	};

	static examples = [
		`${APP_NAME} install-skills`,
		`${APP_NAME} install-skills --list`,
		`${APP_NAME} install-skills --from felippe-alves/scientific-agent-skills`,
		`${APP_NAME} install-skills --from ./skills-repo --skill literature-review --skill hypothesis-generation`,
		`${APP_NAME} install-skills --project --from ./skills-repo`,
	];

	async run(): Promise<void> {
		const { args, flags } = await this.parse(InstallSkills);
		try {
			const result = await runInstallSkills({
				repo: flags.from ?? args.repo ?? DEFAULT_SKILLS_REPO,
				listOnly: flags.list ?? false,
				requestedSkillNames: flags.skill ?? [],
				project: flags.project ?? false,
			});

			const scienceTierWarning = await getScientificCommandTierWarning("install-skills");
			if (flags.list) {
				process.stdout.write(`Available skills in ${result.repoUrl}:\n`);
				for (const skill of result.listed) {
					const suffix = skill.description ? ` — ${skill.description}` : "";
					process.stdout.write(`  ${skill.name}${suffix}\n`);
				}
				if (scienceTierWarning) {
					process.stderr.write(`Warning: ${scienceTierWarning}\n`);
				}
				return;
			}

			process.stdout.write(`Installed ${result.installed.length} skill(s) into ${result.targetDir}:\n`);
			for (const skill of result.installed) {
				process.stdout.write(`  ${skill.name}${skill.existed ? " (updated)" : " (new)"}\n`);
			}
			if (scienceTierWarning) {
				process.stderr.write(`Warning: ${scienceTierWarning}\n`);
			}
		} catch (error) {
			process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
			process.exitCode = 1;
		}
	}
}
