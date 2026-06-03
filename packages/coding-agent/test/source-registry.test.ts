import { describe, expect, it } from "bun:test";
import { SourceRegistry } from "../src/session/source-registry";

describe("SourceRegistry", () => {
	it("starts empty", () => {
		const r = new SourceRegistry<string>();
		expect(r.snapshot()).toEqual([]);
		expect(r.sourceCount).toBe(0);
	});

	it("replaces a source and snapshots in order", () => {
		const r = new SourceRegistry<string>();
		r.replaceSource("builtin", ["/help", "/compact"]);
		expect(r.snapshot()).toEqual(["/help", "/compact"]);
		expect(r.sourceCount).toBe(1);
	});

	it("removes a source deterministically", () => {
		const r = new SourceRegistry<string>();
		r.replaceSource("builtin", ["/help"]);
		r.replaceSource("mcp", ["/prompt-a", "/prompt-b"]);
		r.removeSource("mcp");
		expect(r.snapshot()).toEqual(["/help"]);
		expect(r.sourceCount).toBe(1);
	});

	it("replaceSource clears a source when given an empty array", () => {
		const r = new SourceRegistry<string>();
		r.replaceSource("builtin", ["/help"]);
		r.replaceSource("builtin", []);
		expect(r.snapshot()).toEqual([]);
		expect(r.sourceCount).toBe(1); // source still registered, just empty
	});

	it("removeSource is no-op for unknown source", () => {
		const r = new SourceRegistry<string>();
		r.replaceSource("builtin", ["/help"]);
		r.removeSource("nonexistent");
		expect(r.snapshot()).toEqual(["/help"]);
	});

	it("preserves source ordering (first-registered wins)", () => {
		const r = new SourceRegistry<string>();
		r.replaceSource("builtin", ["a"]);
		r.replaceSource("mcp", ["b"]);
		r.replaceSource("plugin:foo", ["c"]);
		// Later replaceSource on the same source preserves insertion order.
		r.replaceSource("builtin", ["x"]);
		expect(r.snapshot()).toEqual(["x", "b", "c"]);
	});

	it("hasSource reports registration status", () => {
		const r = new SourceRegistry<string>();
		expect(r.hasSource("builtin")).toBe(false);
		r.replaceSource("builtin", ["/help"]);
		expect(r.hasSource("builtin")).toBe(true);
		r.removeSource("builtin");
		expect(r.hasSource("builtin")).toBe(false);
	});
});
