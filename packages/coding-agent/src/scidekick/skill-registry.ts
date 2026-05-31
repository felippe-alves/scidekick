import { Database } from "bun:sqlite";
import { getAgentDbPath, logger } from "@oh-my-pi/pi-utils";

export interface SkillRecord {
	name: string;
	sourceUrl: string;
	installedAt: number;
	validatedModels: string[];
	performanceDelta: number | null;
	rubricScore: number | null;
}

export interface SkillInstallParams {
	name: string;
	sourceUrl: string;
}

export interface SkillValidationParams {
	modelId: string;
	performanceDelta: number;
	rubricScore: number;
}

interface SkillRow {
	name: string;
	source_url: string;
	installed_at: number;
	validated_models: string;
	performance_delta: number | null;
	rubric_score: number | null;
}

export class SkillRegistry {
	readonly #db: Database;

	constructor(dbPath: string = getAgentDbPath()) {
		this.#db = new Database(dbPath);
		this.#db.run("PRAGMA journal_mode=WAL");
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

	trackInstall(params: SkillInstallParams): void {
		const existing = this.#db.prepare("SELECT 1 FROM skill_metadata WHERE name = ?").get(params.name) as
			| { 1: number }
			| undefined;

		if (existing) {
			this.#db
				.prepare(
					`UPDATE skill_metadata
					 SET source_url = ?, installed_at = CAST(strftime('%s', 'now') AS INTEGER)
					 WHERE name = ?`,
				)
				.run(params.sourceUrl, params.name);
			return;
		}

		this.#db
			.prepare(
				`INSERT INTO skill_metadata (name, source_url, installed_at, validated_models)
				 VALUES (?, ?, CAST(strftime('%s', 'now') AS INTEGER), '[]')`,
			)
			.run(params.name, params.sourceUrl);
	}

	trackUninstall(name: string): void {
		this.#db.prepare("DELETE FROM skill_metadata WHERE name = ?").run(name);
	}

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

	getSkill(name: string): SkillRecord | undefined {
		const row = this.#db.prepare("SELECT * FROM skill_metadata WHERE name = ?").get(name) as SkillRow | undefined;
		return row ? this.#toRecord(row) : undefined;
	}

	listSkills(): SkillRecord[] {
		const rows = this.#db.prepare("SELECT * FROM skill_metadata ORDER BY rowid DESC").all() as SkillRow[];
		return rows.map(row => this.#toRecord(row));
	}

	getUnvalidatedSkills(modelId: string): SkillRecord[] {
		const rows = this.#db.prepare("SELECT * FROM skill_metadata").all() as SkillRow[];
		return rows
			.filter(row => !this.#parseValidatedModels(row.validated_models).includes(modelId))
			.map(row => this.#toRecord(row));
	}

	isValidated(name: string, modelId: string): boolean {
		const row = this.#db.prepare("SELECT validated_models FROM skill_metadata WHERE name = ?").get(name) as
			| { validated_models: string }
			| undefined;
		if (!row) return false;
		return this.#parseValidatedModels(row.validated_models).includes(modelId);
	}

	close(): void {
		this.#db.close();
	}

	#parseValidatedModels(value: string): string[] {
		try {
			return JSON.parse(value) as string[];
		} catch {
			return [];
		}
	}

	#toRecord(row: SkillRow): SkillRecord {
		return {
			name: row.name,
			sourceUrl: row.source_url,
			installedAt: row.installed_at,
			validatedModels: this.#parseValidatedModels(row.validated_models),
			performanceDelta: row.performance_delta,
			rubricScore: row.rubric_score,
		};
	}
}
