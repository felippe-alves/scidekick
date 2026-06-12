import { describe, expect, test } from "bun:test";
import { commands, isSubcommand } from "@oh-my-pi/pi-coding-agent/cli-commands";

describe("Scidekick research command compatibility", () => {
	test("registers research without removing existing coding-agent subcommands", () => {
		expect(isSubcommand("research")).toBe(true);
		expect(commands.some(command => command.name === "research")).toBe(true);

		for (const name of ["launch", "journal", "wiki", "stats", "install"]) {
			expect(isSubcommand(name)).toBe(true);
			expect(commands.some(command => command.name === name)).toBe(true);
		}
	});
});
