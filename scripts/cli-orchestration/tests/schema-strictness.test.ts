import { describe, expect, it } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

type JsonSchema = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function walkSchema(schema: unknown, path: string, errors: string[]) {
  const record = asRecord(schema);
  if (!record) {
    return;
  }

  const type = record.type;
  if (type === "object") {
    const properties = asRecord(record.properties);
    if (properties && Object.keys(properties).length > 0) {
      const required = record.required;
      if (!Array.isArray(required)) {
        errors.push(`${path}: missing required[] for object with properties`);
      } else {
        const requiredSet = new Set(required.filter((value) => typeof value === "string"));
        for (const key of Object.keys(properties)) {
          if (!requiredSet.has(key)) {
            errors.push(`${path}: required[] missing key '${key}'`);
          }
        }
      }

      for (const [key, value] of Object.entries(properties)) {
        walkSchema(value, `${path}.properties.${key}`, errors);
      }
    }

    if (record.additionalProperties && typeof record.additionalProperties === "object") {
      walkSchema(record.additionalProperties, `${path}.additionalProperties`, errors);
    }
  }

  if (type === "array" && record.items) {
    walkSchema(record.items, `${path}.items`, errors);
  }

  for (const keyword of ["anyOf", "oneOf", "allOf"] as const) {
    const variants = record[keyword];
    if (Array.isArray(variants)) {
      variants.forEach((variant, index) => walkSchema(variant, `${path}.${keyword}[${index}]`, errors));
    }
  }
}

async function loadSchema(schemaPath: string): Promise<JsonSchema> {
  const raw = await readFile(schemaPath, "utf8");
  return JSON.parse(raw) as JsonSchema;
}

describe("codex output schemas", () => {
  it("include required[] entries for every object property", async () => {
    const schemasDir = join(process.cwd(), "scripts", "cli-orchestration", "schemas");
    const schemaFiles = (await readdir(schemasDir)).filter((file) => file.endsWith(".json"));

    const errors: string[] = [];
    for (const file of schemaFiles) {
      const schemaPath = join(schemasDir, file);
      const schema = await loadSchema(schemaPath);
      walkSchema(schema, file, errors);
    }

    expect(errors).toEqual([]);
  });
});

