import { describe, expect, it } from "bun:test";
import { Type } from "typebox";

import { defineOpContract } from "@mapgen/authoring/index.js";
import {
  normalizeOpsTopLevel,
  normalizeStrict,
  prefillOpDefaults,
} from "@mapgen/compiler/normalize.js";

describe("compiler normalize helpers", () => {
  it("reports unknown keys with stable paths", () => {
    const schema = Type.Object(
      {
        foo: Type.String(),
      },
      { additionalProperties: false }
    );

    const result = normalizeStrict(schema, { foo: "ok", extra: 1 }, "/config");
    expect(result.errors.some((err) => err.path === "/config/extra" && err.message === "Unknown key")).toBe(
      true
    );
  });

  it("handles null input with deterministic error paths", () => {
    const schema = Type.Object(
      {
        foo: Type.String(),
      },
      { additionalProperties: false }
    );

    const result = normalizeStrict(schema, null, "/config");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.path).toBe("/config");
  });

  it("defaults undefined input before strict normalization", () => {
    const schema = Type.Object(
      {
        foo: Type.String({ default: "bar" }),
      },
      { additionalProperties: false, default: {} }
    );

    const result = normalizeStrict(schema, undefined, "/config");
    expect(result.errors).toEqual([]);
    expect(result.value).toEqual({ foo: "bar" });
  });

  it("prefills op envelopes based on contract ops", () => {
    const op = defineOpContract({
      kind: "plan",
      id: "test/plan",
      input: Type.Object({}, { additionalProperties: false }),
      output: Type.Object({}, { additionalProperties: false }),
      strategies: {
        default: Type.Object({}, { additionalProperties: false, default: {} }),
      },
    } as const);

    const step = {
      contract: {
        ops: {
          trees: op,
        },
      },
    };

    const result = prefillOpDefaults(step, {}, "/config");
    expect(result.errors).toEqual([]);
    expect(result.value.trees).toEqual({ strategy: "default", config: {} });
  });

  it("reports op.missing when a contract op has no implementation", () => {
    const op = defineOpContract({
      kind: "plan",
      id: "test/plan",
      input: Type.Object({}, { additionalProperties: false }),
      output: Type.Object({}, { additionalProperties: false }),
      strategies: {
        default: Type.Object({}, { additionalProperties: false, default: {} }),
      },
    } as const);

    const step = {
      contract: {
        ops: {
          trees: op,
        },
      },
    };

    const result = normalizeOpsTopLevel(step, {}, { env: {}, knobs: {} }, {}, "/config/ops");
    expect(result.errors).toEqual([
      {
        code: "op.missing",
        path: "/config/ops/trees",
        message: 'Missing op implementation for key "trees"',
        opKey: "trees",
        opId: "test/plan",
      },
    ]);
  });

  it("reports op.normalize.failed when op.normalize throws", () => {
    const op = defineOpContract({
      kind: "plan",
      id: "test/plan",
      input: Type.Object({}, { additionalProperties: false }),
      output: Type.Object({}, { additionalProperties: false }),
      strategies: {
        default: Type.Object({}, { additionalProperties: false, default: {} }),
      },
    } as const);

    const step = {
      contract: {
        ops: {
          trees: op,
        },
      },
    };

    const result = normalizeOpsTopLevel(
      step,
      { trees: { strategy: "default", config: {} } },
      { env: {}, knobs: {} },
      {
        "test/plan": {
          id: "test/plan",
          normalize: () => {
            throw new Error("normalize exploded");
          },
        },
      },
      "/config/ops"
    );

    expect(result.errors).toEqual([
      {
        code: "op.normalize.failed",
        path: "/config/ops/trees",
        message: "normalize exploded",
        opKey: "trees",
        opId: "test/plan",
      },
    ]);
  });
});
