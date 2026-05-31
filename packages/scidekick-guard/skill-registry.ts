/**
 * Skill registry — tracks installed skills and per-model validation metadata.
 *
 * Backed by the same agent.db SQLite database used by AgentStorage.
 * The `skill_metadata` table is created with IF NOT EXISTS so it coexists
 * safely alongside the session storage tables.
 */
import { Database } from "bun:sqlite";
import { getAgentDbPath, logger } from "@oh-my-pi/pi-utils";

// ── Types ──

export interface SkillRecord {
	name: string;
	source_url: string;
	installed_at: number;
	/** JSON array of model IDs this skill has been validated against. */
	validated_models: string[];
	/** Performance delta from SkillLens validation (positive = improvement). */
	performance_delta: number | null;
	/** Meta-skill rubric score (0–100) from SkillLens dimensions. */
	rubric_score: number | null;
}

export interface SkillInstallParams {
	name: string;
	source_url: string;
}

export interface SkillValidationParams {
	/** Model identifier (e.g. "claude-sonnet-4-20250514"). */
	modelId: string;
	/** Performance delta from validation run. */
	performanceDelta: number;
	/** Meta-skill rubric score. */
	rubricScore: number;
}

// ── Registry ──

export class SkillRegistry {
	#db: Database;

	constructor(dbPath: string = getAgentDbPath()) {
		this.#db = new Database(dbPath);
		this.#db.run("PRAGMA journal_mode=WAL");
		this.#initSchema();
	}

	#initSchema(): void {
		this.#db.run(`
			CREATE TABLE IF NOT EXISTS skill_metadata (
				name TEXT NOT NULL,
				source_url TEXT NOT NULL,
				installed_at INTEGER NOT NULL,
				validated_models TEXT NOT NULL DEFAULT '[]',
				performance_delta REAL,
				rubric_score REAL,
				PRIMARY KEY (name, source_url)
			);
		`);
	}

	// ── Install / uninstall ──

	/** Record a skill installation. Updates source_url and timestamp if already tracked. */
	trackInstall(params: SkillInstallParams): void {
		const row = this.#db.prepare("SELECT 1 FROM skill_metadata WHERE name = ?").get(params.name) as
			| { 1: number }
			| undefined;

		if (row) {
			this.#db
				.prepare(
					`UPDATE skill_metadata
					 SET source_url = ?, installed_at = CAST(strftime('%s', 'now') AS INTEGER)
					 WHERE name = ?`,
				)
				.run(params.source_url, params.name);
		} else {
			this.#db
				.prepare(
					`INSERT INTO skill_metadata (name, source_url, installed_at, validated_models)
					 VALUES (?, ?, CAST(strftime('%s', 'now') AS INTEGER), '[]')`,
				)
				.run(params.name, params.source_url);
		}
	}

	/** Remove a skill from the registry. */
	trackUninstall(name: string): void {
		this.#db.prepare("DELETE FROM skill_metadata WHERE name = ?").run(name);
	}

	// ── Validation ──

	/** Record validation results for a skill against a specific model. */
	recordValidation(name: string, params: SkillValidationParams): void {
		const row = this.#db.prepare("SELECT validated_models FROM skill_metadata WHERE name = ?").get(name) as
			| { validated_models: string }
			| undefined;

		if (!row) {
			logger.warn("SkillRegistry.recordValidation: skill not found", { name });
			return;
		}

		let models: string[];
		try {
			models = JSON.parse(row.validated_models) as string[];
		} catch {
			models = [];
		}

		if (!models.includes(params.modelId)) {
			models.push(params.modelId);
		}

		this.#db
			.prepare(
				`UPDATE skill_metadata
				 SET validated_models = ?, performance_delta = ?, rubric_score = ?
				 WHERE name = ?`,
			)
			.run(JSON.stringify(models), params.performanceDelta, params.rubricScore, name);
	}

	// ── Queries ──

	/** Get metadata for a single skill. */
	getSkill(name: string): SkillRecord | undefined {
		const row = this.#db.prepare("SELECT * FROM skill_metadata WHERE name = ?").get(name) as SkillRow | undefined;
		return row ? this.#rowToRecord(row) : undefined;
	}

	/** List all tracked skills. */
	listSkills(): SkillRecord[] {
		const rows = this.#db.prepare("SELECT * FROM skill_metadata ORDER BY rowid DESC").all() as SkillRow[];
		return rows.map(r => this.#rowToRecord(r));
	}

	/**
	 * Find skills that have NOT been validated against the given model.
	 * Returns the skill names that need validation.
	 */
	getUnvalidatedSkills(modelId: string): SkillRecord[] {
		const rows = this.#db.prepare("SELECT * FROM skill_metadata").all() as SkillRow[];

		return rows
			.filter(row => {
				let models: string[];
				try {
					models = JSON.parse(row.validated_models) as string[];
				} catch {
					models = [];
				}
				return !models.includes(modelId);
			})
			.map(r => this.#rowToRecord(r));
	}

	/** Check if a skill has been validated against a given model. */
	isValidated(name: string, modelId: string): boolean {
		const row = this.#db.prepare("SELECT validated_models FROM skill_metadata WHERE name = ?").get(name) as
			| { validated_models: string }
			| undefined;

		if (!row) return false;

		let models: string[];
		try {
			models = JSON.parse(row.validated_models) as string[];
		} catch {
			return false;
		}
		return models.includes(modelId);
	}

	// ── Helpers ──

	#rowToRecord(row: SkillRow): SkillRecord {
		let validatedModels: string[];
		try {
			validatedModels = JSON.parse(row.validated_models) as string[];
		} catch {
			validatedModels = [];
		}

		return {
			name: row.name,
			source_url: row.source_url,
			installed_at: row.installed_at,
			validated_models: validatedModels,
			performance_delta: row.performance_delta ?? null,
			rubric_score: row.rubric_score ?? null,
		};
	}

	/** Close the database connection. */
	close(): void {
		this.#db.close();
	}
}

// ── SQL row shapes ──

interface SkillRow {
	name: string;
	source_url: string;
	installed_at: number;
	validated_models: string;
	performance_delta: number | null;
	rubric_score: number | null;
}
