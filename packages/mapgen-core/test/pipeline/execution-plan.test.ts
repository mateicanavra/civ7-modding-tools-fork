import { describe, it, expect } from "bun:test";
import { Type } from "typebox";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import { createOp, defineOpContract } from "@mapgen/authoring/index.js";

import {
  compileExecutionPlan,
  ExecutionPlanCompileError,
  PipelineExecutor,
  StepRegistry,
} from "@mapgen/engine/index.js";

const TEST_TAGS = {
  artifact: {
    foundationPlates: "artifact:test.foundationPlates",
  },
} as const;

const baseSettings = {
  seed: 123,
  dimensions: { width: 10, height: 10 },
  latitudeBounds: { topLatitude: 80, bottomLatitude: -80 },
  wrap: { wrapX: true, wrapY: false },
};

describe("compileExecutionPlan", () => {
  it("compiles a linear recipe into ordered plan nodes", () => {
    const registry = new StepRegistry<unknown>();
    registry.registerTags([
      { id: TEST_TAGS.artifact.foundationPlates, kind: "artifact" },
    ]);
    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [TEST_TAGS.artifact.foundationPlates],
      configSchema: Type.Object(
        {
          value: Type.Number({ default: 3 }),
        },
        { additionalProperties: false }
      ),
      run: (_context, _config) => {},
    });

    const plan = compileExecutionPlan(
      {
        recipe: {
          schemaVersion: 2,
          steps: [
            {
              id: "alpha",
              config: {},
            },
          ],
        },
        settings: baseSettings,
      },
      registry
    );

    expect(plan.nodes).toHaveLength(1);
    expect(plan.nodes[0].stepId).toBe("alpha");
    expect(plan.nodes[0].phase).toBe("foundation");
    expect(plan.nodes[0].config).toEqual({ value: 3 });
    expect(plan.nodes[0].requires).toEqual([]);
    expect(plan.nodes[0].provides).toEqual([TEST_TAGS.artifact.foundationPlates]);
  });

  it("omits disabled steps from the plan", () => {
    const registry = new StepRegistry<unknown>();
    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      run: (_context, _config) => {},
    });

    const plan = compileExecutionPlan(
      {
        recipe: {
          schemaVersion: 2,
          steps: [
            {
              id: "alpha",
              enabled: false,
            },
          ],
        },
        settings: baseSettings,
      },
      registry
    );

    expect(plan.nodes).toHaveLength(0);
  });

  it("rejects recipe schema versions other than v2", () => {
    const registry = new StepRegistry<unknown>();
    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      run: () => {},
    });

    expect(() =>
      compileExecutionPlan(
        {
          recipe: {
            // Intentionally invalid schema version to assert v1 is deprecated
            schemaVersion: 1 as unknown as 2,
            steps: [{ id: "alpha" }],
          },
          settings: baseSettings,
        },
        registry
      )
    ).toThrow(ExecutionPlanCompileError);

    try {
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 1 as unknown as 2,
            steps: [{ id: "alpha" }],
          },
          settings: baseSettings,
        },
        registry
      );
    } catch (err) {
      expect(err).toBeInstanceOf(ExecutionPlanCompileError);
      const errors = (err as ExecutionPlanCompileError).errors;
      expect(errors[0]?.code).toBe("runRequest.invalid");
      expect(errors[0]?.path).toBe("/recipe/schemaVersion");
    }
  });

  it("enforces unique step ids within a recipe", () => {
    const registry = new StepRegistry<unknown>();
    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      run: () => {},
    });

    expect(() =>
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 2,
            steps: [{ id: "alpha" }, { id: "alpha" }],
          },
          settings: baseSettings,
        },
        registry
      )
    ).toThrow(ExecutionPlanCompileError);

    try {
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 2,
            steps: [{ id: "alpha" }, { id: "alpha" }],
          },
          settings: baseSettings,
        },
        registry
      );
    } catch (err) {
      expect(err).toBeInstanceOf(ExecutionPlanCompileError);
      const errors = (err as ExecutionPlanCompileError).errors;
      expect(errors[0]?.code).toBe("runRequest.invalid");
      expect(errors[0]?.path).toBe("/recipe/steps/1/id");
      expect(errors[0]?.message).toContain('Duplicate step id "alpha"');
    }
  });

  it("fails fast on unknown step IDs", () => {
    const registry = new StepRegistry<unknown>();

    expect(() =>
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 2,
            steps: [{ id: "missing" }],
          },
          settings: baseSettings,
        },
        registry
      )
    ).toThrow(ExecutionPlanCompileError);

    try {
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 2,
            steps: [{ id: "missing" }],
          },
          settings: baseSettings,
        },
        registry
      );
      throw new Error("Expected compile to fail for unknown step");
    } catch (err) {
      expect(err).toBeInstanceOf(ExecutionPlanCompileError);
      const errors = (err as ExecutionPlanCompileError).errors;
      expect(errors[0].code).toBe("step.unknown");
      expect(errors[0].path).toBe("/recipe/steps/0/id");
    }
  });

  it("fails on invalid per-step config", () => {
    const registry = new StepRegistry<unknown>();
    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      configSchema: Type.Object(
        {
          value: Type.Number(),
        },
        { additionalProperties: false }
      ),
      run: (_context, _config) => {},
    });

    try {
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 2,
            steps: [{ id: "alpha", config: { value: "bad" } }],
          },
          settings: baseSettings,
        },
        registry
      );
      throw new Error("Expected compile to fail for invalid config");
    } catch (err) {
      expect(err).toBeInstanceOf(ExecutionPlanCompileError);
      const errors = (err as ExecutionPlanCompileError).errors;
      expect(errors[0].code).toBe("step.config.invalid");
      expect(errors[0].path).toContain("/recipe/steps/0/config");
    }
  });

  it("fails on unknown per-step config keys", () => {
    const registry = new StepRegistry<unknown>();
    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      configSchema: Type.Object(
        {
          value: Type.Number(),
        },
        { additionalProperties: false }
      ),
      run: (_context, _config) => {},
    });

    try {
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 2,
            steps: [{ id: "alpha", config: { value: 3, extra: 9 } }],
          },
          settings: baseSettings,
        },
        registry
      );
      throw new Error("Expected compile to fail for unknown config keys");
    } catch (err) {
      expect(err).toBeInstanceOf(ExecutionPlanCompileError);
      const errors = (err as ExecutionPlanCompileError).errors;
      expect(errors[0].code).toBe("step.config.invalid");
      expect(
        errors.some(
          (error) =>
            error.path === "/recipe/steps/0/config/extra" &&
            error.message === "Unknown key"
        )
      ).toBe(true);
    }
  });

  it("fails on null per-step config", () => {
    const registry = new StepRegistry<unknown>();
    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      configSchema: Type.Object(
        {
          value: Type.Number(),
        },
        { additionalProperties: false }
      ),
      run: (_context, _config) => {},
    });

    try {
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 2,
            steps: [{ id: "alpha", config: null }],
          },
          settings: baseSettings,
        },
        registry
      );
      throw new Error("Expected compile to fail for null config");
    } catch (err) {
      expect(err).toBeInstanceOf(ExecutionPlanCompileError);
      const errors = (err as ExecutionPlanCompileError).errors;
      expect(errors[0].code).toBe("runRequest.invalid");
      expect(
        errors.some((error) => error.path.includes("/recipe/steps/0/config"))
      ).toBe(true);
    }
  });

  it("fails on invalid run request shape", () => {
    const registry = new StepRegistry<unknown>();

    try {
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 2,
            steps: [],
          },
          settings: {
            seed: "bad",
          },
        },
        registry
      );
      throw new Error("Expected compile to fail for invalid run request");
    } catch (err) {
      expect(err).toBeInstanceOf(ExecutionPlanCompileError);
      const errors = (err as ExecutionPlanCompileError).errors;
      expect(errors[0].code).toBe("runRequest.invalid");
    }
  });

  it("rejects run request type coercion", () => {
    const registry = new StepRegistry<unknown>();
    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      run: (_context, _config) => {},
    });

    try {
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 2,
            steps: [{ id: "alpha" }],
          },
          settings: {
            ...baseSettings,
            seed: "123",
            wrap: {
              ...baseSettings.wrap,
              wrapX: "false",
            },
          },
        } as any,
        registry
      );
      throw new Error("Expected compile to fail for invalid run request types");
    } catch (err) {
      expect(err).toBeInstanceOf(ExecutionPlanCompileError);
    }
  });

  it("passes resolved config into step.run", () => {
    const registry = new StepRegistry<unknown>();
    let observedConfig: unknown = null;
    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      configSchema: Type.Object(
        {
          value: Type.Number({ default: 7 }),
        },
        { additionalProperties: false }
      ),
      run: (_context, config) => {
        observedConfig = config;
      },
    });

    const plan = compileExecutionPlan(
      {
        recipe: {
          schemaVersion: 2,
          steps: [{ id: "alpha", config: {} }],
        },
        settings: baseSettings,
      },
      registry
    );

    const adapter = createMockAdapter({ width: 2, height: 2, rng: () => 0 });
    const context = createExtendedMapContext(
      { width: 2, height: 2 },
      adapter,
      baseSettings
    );
    const executor = new PipelineExecutor(registry, { log: () => {} });
    executor.executePlan(context, plan);

    expect(observedConfig).toEqual({ value: 7 });
  });

  it("applies step normalize results into the plan", () => {
    const registry = new StepRegistry<unknown>();
    const OpConfigSchema = Type.Object(
      {
        value: Type.Number({ default: 2 }),
      },
      { additionalProperties: false, default: {} }
    );
    const opContract = defineOpContract({
      kind: "compute",
      id: "test/normalize/op",
      input: Type.Object({}, { additionalProperties: false }),
      output: Type.Object({}, { additionalProperties: false }),
      strategies: {
        default: OpConfigSchema,
      },
    });

    const op = createOp(opContract, {
      strategies: {
        default: {
          normalize: (config, ctx) => ({
            ...config,
            value: config.value + ctx.env.dimensions.width,
          }),
          run: () => ({}),
        },
      },
    });

    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      configSchema: Type.Object(
        {
          op: op.config,
        },
        {
          additionalProperties: false,
          default: { op: op.defaultConfig },
        }
      ),
      normalize: (config, ctx) => {
        return { op: op.normalize(config.op, ctx) };
      },
      run: () => {},
    });

    const plan = compileExecutionPlan(
      {
        recipe: {
          schemaVersion: 2,
          steps: [{ id: "alpha" }],
        },
        settings: baseSettings,
      },
      registry
    );

    expect(plan.nodes[0].config).toEqual({
      op: { strategy: "default", config: { value: 12 } },
    });
  });

  it("re-validates resolver output against the schema", () => {
    const registry = new StepRegistry<unknown>();
    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      configSchema: Type.Object(
        {
          value: Type.Number(),
        },
        { additionalProperties: false }
      ),
      normalize: () => ({ value: "bad" }),
      run: () => {},
    });

    expect(() =>
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 2,
            steps: [{ id: "alpha", config: { value: 1 } }],
          },
          settings: baseSettings,
        },
        registry
      )
    ).toThrow(ExecutionPlanCompileError);

    try {
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 2,
            steps: [{ id: "alpha", config: { value: 1 } }],
          },
          settings: baseSettings,
        },
        registry
      );
    } catch (err) {
      expect(err).toBeInstanceOf(ExecutionPlanCompileError);
      const errors = (err as ExecutionPlanCompileError).errors;
      expect(errors[0].code).toBe("step.config.invalid");
      expect(errors[0].path).toBe("/recipe/steps/0/config/value");
    }
  });
});
