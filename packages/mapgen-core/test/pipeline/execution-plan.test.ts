import { describe, it, expect } from "bun:test";
import { Type } from "typebox";
import { createMockAdapter } from "@civ7/adapter";
import type { MapConfig } from "@mapgen/bootstrap/types.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";

import {
  compileExecutionPlan,
  ExecutionPlanCompileError,
  PipelineExecutor,
  StepRegistry,
} from "@mapgen/pipeline/index.js";

const baseSettings = {
  seed: 123,
  dimensions: { width: 10, height: 10 },
  latitudeBounds: { topLatitude: 80, bottomLatitude: -80 },
  wrap: { wrapX: true, wrapY: false },
};

describe("compileExecutionPlan", () => {
  it("compiles a linear recipe into ordered plan nodes", () => {
    const registry = new StepRegistry<unknown>();
    registry.register({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: ["artifact:foundation"],
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
          schemaVersion: 1,
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
    expect(plan.nodes[0].nodeId).toBe("alpha");
    expect(plan.nodes[0].stepId).toBe("alpha");
    expect(plan.nodes[0].phase).toBe("foundation");
    expect(plan.nodes[0].config).toEqual({ value: 3 });
    expect(plan.nodes[0].requires).toEqual([]);
    expect(plan.nodes[0].provides).toEqual(["artifact:foundation"]);
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
          schemaVersion: 1,
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

  it("fails fast on unknown step IDs", () => {
    const registry = new StepRegistry<unknown>();

    expect(() =>
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 1,
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
            schemaVersion: 1,
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
            schemaVersion: 1,
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

  it("fails on invalid run request shape", () => {
    const registry = new StepRegistry<unknown>();

    try {
      compileExecutionPlan(
        {
          recipe: {
            schemaVersion: 1,
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
            schemaVersion: 1,
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
          schemaVersion: 1,
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
      {} as unknown as MapConfig
    );
    const executor = new PipelineExecutor(registry, { log: () => {} });
    executor.executePlan(context, plan);

    expect(observedConfig).toEqual({ value: 7 });
  });
});
