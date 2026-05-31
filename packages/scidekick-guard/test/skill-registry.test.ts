import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SkillRegistry } from "../skill-registry";

let dbPath: string;
let registry: SkillRegistry;

beforeEach(() => {
	dbPath = path.join(os.tmpdir(), `sk-test-registry-${Date.now()}.db`);
	registry = new SkillRegistry(dbPath);
});

afterEach(() => {
	registry.close();
	try {
		fs.unlinkSync(dbPath);
	} catch {
		// ignore
	}
});

describe("SkillRegistry", () => {
	describe("trackInstall", () => {
		it("records a skill installation", () => {
			registry.trackInstall({ name: "literature-review", source_url: "https://github.com/org/skills" });
			const skill = registry.getSkill("literature-review");
			expect(skill).toBeDefined();
			expect(skill!.name).toBe("literature-review");
			expect(skill!.source_url).toBe("https://github.com/org/skills");
			expect(skill!.validated_models).toEqual([]);
		});

		it("upserts on reinstall", () => {
			registry.trackInstall({ name: "my-skill", source_url: "https://github.com/a/repo" });
			registry.trackInstall({ name: "my-skill", source_url: "https://github.com/b/repo" });
			const skill = registry.getSkill("my-skill");
			expect(skill!.source_url).toBe("https://github.com/b/repo");
		});
	});

	describe("trackUninstall", () => {
		it("removes a skill from the registry", () => {
			registry.trackInstall({ name: "temp-skill", source_url: "https://github.com/org/skills" });
			registry.trackUninstall("temp-skill");
			expect(registry.getSkill("temp-skill")).toBeUndefined();
		});
	});

	describe("recordValidation", () => {
		it("records validation against a model", () => {
			registry.trackInstall({ name: "lit-review", source_url: "https://github.com/org/skills" });
			registry.recordValidation("lit-review", {
				modelId: "claude-sonnet-4-20250514",
				performanceDelta: 4.2,
				rubricScore: 82,
			});

			const skill = registry.getSkill("lit-review");
			expect(skill!.validated_models).toContain("claude-sonnet-4-20250514");
			expect(skill!.performance_delta).toBe(4.2);
			expect(skill!.rubric_score).toBe(82);
		});

		it("accumulates multiple validated models", () => {
			registry.trackInstall({ name: "db-lookup", source_url: "https://github.com/org/skills" });
			registry.recordValidation("db-lookup", {
				modelId: "gpt-4o",
				performanceDelta: 1.5,
				rubricScore: 70,
			});
			registry.recordValidation("db-lookup", {
				modelId: "claude-sonnet-4",
				performanceDelta: 3.0,
				rubricScore: 78,
			});

			const skill = registry.getSkill("db-lookup");
			expect(skill!.validated_models).toHaveLength(2);
			expect(skill!.validated_models).toContain("gpt-4o");
			expect(skill!.validated_models).toContain("claude-sonnet-4");
		});
	});

	describe("getUnvalidatedSkills", () => {
		it("returns skills not validated for a specific model", () => {
			registry.trackInstall({ name: "skill-a", source_url: "url" });
			registry.trackInstall({ name: "skill-b", source_url: "url" });
			registry.recordValidation("skill-a", {
				modelId: "model-x",
				performanceDelta: 1,
				rubricScore: 50,
			});

			const unvalidated = registry.getUnvalidatedSkills("model-x");
			expect(unvalidated).toHaveLength(1);
			expect(unvalidated[0].name).toBe("skill-b");
		});

		it("returns all skills when none validated", () => {
			registry.trackInstall({ name: "a", source_url: "url" });
			registry.trackInstall({ name: "b", source_url: "url" });

			const unvalidated = registry.getUnvalidatedSkills("new-model");
			expect(unvalidated).toHaveLength(2);
		});

		it("returns empty when all validated", () => {
			registry.trackInstall({ name: "a", source_url: "url" });
			registry.recordValidation("a", { modelId: "m", performanceDelta: 1, rubricScore: 50 });

			expect(registry.getUnvalidatedSkills("m")).toHaveLength(0);
		});
	});

	describe("isValidated", () => {
		it("returns true for validated skill-model pair", () => {
			registry.trackInstall({ name: "s", source_url: "url" });
			registry.recordValidation("s", { modelId: "m1", performanceDelta: 1, rubricScore: 50 });
			expect(registry.isValidated("s", "m1")).toBe(true);
		});

		it("returns false for unvalidated pair", () => {
			registry.trackInstall({ name: "s", source_url: "url" });
			expect(registry.isValidated("s", "unknown-model")).toBe(false);
		});

		it("returns false for unknown skill", () => {
			expect(registry.isValidated("nonexistent", "m1")).toBe(false);
		});
	});

	describe("listSkills", () => {
		it("returns all skills sorted by install time", () => {
			registry.trackInstall({ name: "first", source_url: "url" });
			registry.trackInstall({ name: "second", source_url: "url" });

			const skills = registry.listSkills();
			expect(skills).toHaveLength(2);
			expect(skills[0].name).toBe("second"); // most recent first
			expect(skills[1].name).toBe("first");
		});
	});
});
