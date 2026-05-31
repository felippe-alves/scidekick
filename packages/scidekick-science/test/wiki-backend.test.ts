import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { FilesystemWikiBackend, type WikiFrontmatter } from "../backend";

let tmpDir: string;
let backend: FilesystemWikiBackend;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sk-wiki-test-"));
	backend = new FilesystemWikiBackend(tmpDir);
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

const makePaper = (title: string): WikiFrontmatter => ({
	title,
	type: "paper",
	created: new Date().toISOString(),
	updated: new Date().toISOString(),
	tags: ["ml"],
	doi: "10.1234/example",
	authors: ["Author One"],
});

describe("FilesystemWikiBackend", () => {
	describe("save and get", () => {
		it("saves and retrieves an entry", async () => {
			const entry = await backend.save(makePaper("Test Paper"), "# Body content");
			expect(entry.slug).toBe("test-paper");
			expect(entry.frontmatter.title).toBe("Test Paper");
			expect(entry.frontmatter.type).toBe("paper");
			expect(entry.body).toBe("# Body content");

			const retrieved = await backend.get("test-paper");
			expect(retrieved).toBeDefined();
			expect(retrieved!.frontmatter.title).toBe("Test Paper");
		});

		it("updates an existing entry preserving created date", async () => {
			const first = await backend.save(makePaper("My Paper"), "v1");
			await Bun.sleep(2); // ensure updated timestamp differs
			const second = await backend.save(makePaper("My Paper"), "v2");
			expect(second.frontmatter.created).toBe(first.frontmatter.created);
			expect(second.frontmatter.updated > first.frontmatter.updated).toBe(true);
			expect(second.body).toBe("v2");
		});
		it("sanitizes slugs from titles", async () => {
			const entry = await backend.save(makePaper("Complex: Title! With @Symbols#"), "body");
			expect(entry.slug).toBe("complex-title-with-symbols");
		});

		it("returns null for nonexistent entries", async () => {
			expect(await backend.get("nonexistent")).toBeNull();
		});
	});

	describe("delete", () => {
		it("deletes an entry", async () => {
			await backend.save(makePaper("To Delete"), "body");
			expect(await backend.delete("to-delete")).toBe(true);
			expect(await backend.get("to-delete")).toBeNull();
		});

		it("returns false for nonexistent", async () => {
			expect(await backend.delete("nonexistent")).toBe(false);
		});
	});

	describe("query", () => {
		beforeEach(async () => {
			await backend.save(makePaper("Paper A"), "body A");
			await backend.save(makePaper("Paper B"), "body B");
		});

		it("filters by type", async () => {
			const results = await backend.query({ type: "paper" });
			expect(results).toHaveLength(2);
		});

		it("filters by tag", async () => {
			const results = await backend.query({ tag: "ml" });
			expect(results).toHaveLength(2);
		});

		it("filters by non-matching tag", async () => {
			const results = await backend.query({ tag: "physics" });
			expect(results).toHaveLength(0);
		});

		it("searches in title", async () => {
			const results = await backend.query({ search: "Paper A" });
			expect(results).toHaveLength(1);
		});

		it("searches in body", async () => {
			const results = await backend.query({ search: "body B" });
			expect(results).toHaveLength(1);
		});
	});

	describe("list", () => {
		it("returns empty for fresh backend", async () => {
			expect(await backend.list()).toHaveLength(0);
		});

		it("returns all slugs", async () => {
			await backend.save(makePaper("First"), "1");
			await backend.save(makePaper("Second"), "2");
			const slugs = await backend.list();
			expect(slugs).toHaveLength(2);
			expect(slugs).toContain("first");
			expect(slugs).toContain("second");
		});
	});

	describe("lint", () => {
		it("validates required fields", async () => {
			await backend.save({ title: "", type: "insight", created: "", updated: "", tags: [] }, "empty");
			const errors = await backend.lint("untitled");
			expect(errors.length).toBeGreaterThan(0);
		});

		it("validates paper needs doi or authors", async () => {
			await backend.save(
				{ title: "No Meta Paper", type: "paper", created: "now", updated: "now", tags: [] },
				"body",
			);
			const errors = await backend.lint("no-meta-paper");
			expect(errors.some(e => e.includes("doi"))).toBe(true);
		});

		it("validates hypothesis needs status", async () => {
			await backend.save(
				{ title: "No Status", type: "hypothesis", created: "now", updated: "now", tags: [] },
				"body",
			);
			const errors = await backend.lint("no-status");
			expect(errors.some(e => e.includes("status"))).toBe(true);
		});

		it("passes valid entry", async () => {
			await backend.save(makePaper("Complete Paper"), "# body");
			const errors = await backend.lint("complete-paper");
			expect(errors).toHaveLength(0);
		});
	});
});
