import { describe, expect, it } from "bun:test";
import { Type } from "typebox";

import { ExecutionPlanCompileError } from "@mapgen/engine/index.js";
import { EmptyStepConfigSchema } from "@mapgen/engine/step-config.js";
import { createRecipe, createStage, createStep } from "@mapgen/authoring/index.js";

describe("authoring SDK", () => {
  const baseSettings = {
    seed: 42,
    dimensions: { width: 2, height: 2 },
    latitudeBounds: { topLatitude: 90, bottomLatitude: -90 },
    wrap: { wrapX: true, wrapY: false },
  };

  it("createStep rejects missing schema", () => {
    expect(() =>
      createStep({
        id: "alpha",
        phase: "foundation",
        requires: [],
        provides: [],
        run: () => {},
      } as any)
    ).toThrow(/schema/);
  });

  it("createStep accepts explicit empty schema", () => {
    expect(() =>
      createStep({
        id: "alpha",
        phase: "foundation",
        requires: [],
        provides: [],
        schema: EmptyStepConfigSchema,
        run: () => {},
      })
    ).not.toThrow();
  });

  it("createStage rejects steps without explicit schemas", () => {
    expect(() =>
      createStage({
        id: "foundation",
        steps: [
          {
            id: "alpha",
            phase: "foundation",
            requires: [],
            provides: [],
            run: () => {},
          },
        ],
      } as any)
    ).toThrow(/schema/);
  });

  it("createRecipe rejects missing tagDefinitions", () => {
    const step = createStep({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      schema: EmptyStepConfigSchema,
      run: () => {},
    });
    const stage = createStage({ id: "foundation", steps: [step] });

    expect(() =>
      createRecipe({
        id: "core.base",
        stages: [stage],
      } as any)
    ).toThrow(/tagDefinitions/);
  });

  it("createRecipe rejects duplicate instanceId values", () => {
    const stepA = createStep({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      schema: EmptyStepConfigSchema,
      run: () => {},
      instanceId: "dup",
    });
    const stepB = createStep({
      id: "beta",
      phase: "foundation",
      requires: [],
      provides: [],
      schema: EmptyStepConfigSchema,
      run: () => {},
      instanceId: "dup",
    });
    const stage = createStage({ id: "foundation", steps: [stepA, stepB] });

    expect(() =>
      createRecipe({
        id: "core.base",
        tagDefinitions: [],
        stages: [stage],
      })
    ).toThrow(/instanceId/);
  });

  it("createRecipe derives deterministic step ids", () => {
    const step = createStep({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      schema: EmptyStepConfigSchema,
      run: () => {},
    });
    const stage = createStage({ id: "foundation", steps: [step] });
    const recipe = createRecipe({ id: "core.base", tagDefinitions: [], stages: [stage] });

    expect(recipe.recipe.steps[0]?.id).toBe("core.base.foundation.alpha");
  });

  it("createRecipe rejects invalid tag prefixes", () => {
    const step = createStep({
      id: "alpha",
      phase: "foundation",
      requires: ["bad:tag"],
      provides: [],
      schema: EmptyStepConfigSchema,
      run: () => {},
    });
    const stage = createStage({ id: "foundation", steps: [step] });

    expect(() =>
      createRecipe({ id: "core.base", tagDefinitions: [], stages: [stage] })
    ).toThrow(/Invalid dependency tag/);
  });

  it("compile applies schema defaults and rejects unknown keys", () => {
    const schema = Type.Object(
      {
        count: Type.Number({ default: 2 }),
      },
      { additionalProperties: false }
    );
    const step = createStep({
      id: "alpha",
      phase: "foundation",
      requires: [],
      provides: [],
      schema,
      run: () => {},
    });
    const stage = createStage({ id: "foundation", steps: [step] });
    const recipe = createRecipe({ id: "core.base", tagDefinitions: [], stages: [stage] });

    const plan = recipe.compile(baseSettings);
    expect(plan.nodes[0]?.config).toEqual({ count: 2 });

    expect(() =>
      recipe.compile(baseSettings, {
        foundation: { alpha: { count: 1, extra: "nope" } },
      })
    ).toThrow(ExecutionPlanCompileError);
  });
});
