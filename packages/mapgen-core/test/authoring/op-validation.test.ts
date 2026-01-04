import { describe, expect, it } from "bun:test";
import { Type } from "typebox";

import {
  OpValidationError,
  TypedArraySchemas,
  createOp,
  type ValidationError,
} from "@mapgen/authoring/index.js";

describe("domain op validation surface", () => {
  const InputSchema = Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      field: TypedArraySchemas.u8({ description: "Field per tile (0..255)." }),
    },
    { additionalProperties: false }
  );

  const OutputSchema = Type.Object(
    {
      out: TypedArraySchemas.u8({ description: "Output field per tile (0..255)." }),
    },
    { additionalProperties: false }
  );

  const ConfigSchema = Type.Object(
    {
      mode: Type.Optional(Type.Literal("ok", { default: "ok" })),
    },
    { additionalProperties: false, default: {} }
  );

  const op = createOp({
    kind: "compute",
    id: "test/opValidation",
    input: InputSchema,
    output: OutputSchema,
    strategies: {
      default: {
        config: ConfigSchema,
        run: (input) => {
          const size = input.width * input.height;
          return { out: new Uint8Array(size) };
        },
      },
    },
    customValidate: (input, config) => {
      const errors: ValidationError[] = [];
      if (config.config?.mode === ("bad" as any)) {
        errors.push({
          path: "/config/config/mode",
          message: "Invalid mode",
          code: "custom.mode",
        });
      }
      if (input.width * input.height !== input.field.length) {
        errors.push({ path: "/input/field", message: "Custom grid mismatch" });
      }
      return errors;
    },
  } as const);

  it("validate returns ok for valid inputs", () => {
    const input = { width: 2, height: 2, field: new Uint8Array(4) };
    const res = op.validate(input, op.defaultConfig);
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it("validate catches typed-array ctor mismatch", () => {
    const input = { width: 2, height: 2, field: new Int16Array(4) as any };
    const res = op.validate(input, op.defaultConfig);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.path === "/input/field" && /Expected Uint8Array/.test(e.message))).toBe(true);
  });

  it("validate includes customValidate errors", () => {
    const input = { width: 2, height: 2, field: new Uint8Array(4) };
    const res = op.validate(input, { strategy: "default", config: { mode: "bad" as any } });
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.code === "custom.mode")).toBe(true);
  });

  it("runValidated throws OpValidationError on input failure", () => {
    const input = { width: 2, height: 2, field: new Int16Array(4) as any };
    expect(() => op.runValidated(input, op.defaultConfig)).toThrow(OpValidationError);
  });

  it("runValidated can validate outputs when toggled", () => {
    const badOutputOp = createOp({
      kind: "compute",
      id: "test/opValidationOutput",
      input: InputSchema,
      output: OutputSchema,
      strategies: {
        default: {
          config: ConfigSchema,
          run: (input) => {
            const size = input.width * input.height;
            // Wrong ctor + wrong length
            return { out: new Int16Array(size - 1) as any };
          },
        },
      },
    } as const);

    const input = { width: 3, height: 3, field: new Uint8Array(9) };

    expect(() =>
      badOutputOp.runValidated(input, badOutputOp.defaultConfig, { validateOutput: false })
    ).not.toThrow();
    expect(() =>
      badOutputOp.runValidated(input, badOutputOp.defaultConfig, { validateOutput: true })
    ).toThrow(OpValidationError);
  });

  it("validate can optionally validate a provided output value", () => {
    const input = { width: 2, height: 2, field: new Uint8Array(4) };
    const output = { out: new Uint8Array(3) };
    const res = op.validate(input, op.defaultConfig, { validateOutput: true, output });
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.path === "/output/out" && /Expected length/.test(e.message))).toBe(true);
  });
});
