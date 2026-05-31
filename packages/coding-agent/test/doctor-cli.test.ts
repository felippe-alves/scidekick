/**
 * Contract tests for the top-level diagnostics command.
 */
import { describe, expect, test } from "bun:test";
import { type DoctorReport, doctorExitCode, renderDoctorReport } from "../src/cli/doctor-cli";
import { isSubcommand } from "../src/cli-commands";

describe("doctor command", () => {
	test("is registered as a top-level subcommand", () => {
		expect(isSubcommand("doctor")).toBe(true);
	});

	test("renders check status, actionable messages, and details", () => {
		const report: DoctorReport = {
			app: "omp",
			version: "1.2.3",
			ok: false,
			strictOk: false,
			checks: [
				{ name: "runtime", status: "ok", message: "Bun is new enough" },
				{
					name: "path",
					status: "warn",
					message: "omp is not on PATH",
					details: ["PATH missing."],
					remediation: ["Add install dir to PATH."],
				},
				{ name: "workers", status: "error", message: "Worker smoke failed", details: ["missing worker"] },
			],
		};

		const rendered = renderDoctorReport(report);
		expect(rendered).toContain("omp doctor (1.2.3)");
		expect(rendered).toContain("runtime: Bun is new enough");
		expect(rendered).toContain("path: omp is not on PATH");
		expect(rendered).toContain("Add install dir to PATH.");
		expect(rendered).toContain("PATH missing.");
		expect(rendered).toContain("workers: Worker smoke failed");
		expect(rendered).toContain("missing worker");
		expect(rendered).toContain("fix: Add install dir to PATH.");
	});

	test("strict mode treats warnings as failures", () => {
		const report: DoctorReport = {
			app: "omp",
			version: "1.2.3",
			ok: true,
			strictOk: false,
			checks: [{ name: "providers", status: "warn", message: "No provider API keys detected" }],
		};

		expect(doctorExitCode(report, false)).toBe(0);
		expect(doctorExitCode(report, true)).toBe(1);
	});
});
