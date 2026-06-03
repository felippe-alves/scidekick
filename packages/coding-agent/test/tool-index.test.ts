import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { getSchemaPropertyKeys } from "../src/tool-discovery/tool-index";

describe("getSchemaPropertyKeys", () => {
	it("extracts keys from Zod object schemas", () => {
		const schema = z.object({
			name: z.string(),
			count: z.number(),
			flag: z.boolean().optional(),
		});
		expect(getSchemaPropertyKeys(schema)).toEqual(["count", "flag", "name"]);
	});

	it("extracts keys from JSON Schema objects", () => {
		const schema = {
			type: "object",
			properties: {
				host: { type: "string" },
				port: { type: "number" },
			},
		};
		expect(getSchemaPropertyKeys(schema)).toEqual(["host", "port"]);
	});

	it("returns empty for null", () => {
		expect(getSchemaPropertyKeys(null)).toEqual([]);
	});

	it("returns empty for non-object", () => {
		expect(getSchemaPropertyKeys("not-an-object")).toEqual([]);
	});

	it("returns empty for object without properties or shape", () => {
		expect(getSchemaPropertyKeys({})).toEqual([]);
		expect(getSchemaPropertyKeys({ unrelated: true })).toEqual([]);
	});

	it("prefers Zod shape over JSON properties when both present", () => {
		// A ZodObject has both `type: "object"` and a `shape`, plus
		// possibly a `properties` field set by some wrappers.
		const schema = z.object({ alpha: z.string(), beta: z.number() });
		// Simulate a stray properties field.
		(schema as Record<string, unknown>).properties = { gamma: { type: "string" } };
		expect(getSchemaPropertyKeys(schema)).toEqual(["alpha", "beta"]);
		delete (schema as Record<string, unknown>).properties;
	});
});
