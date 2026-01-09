import { describe, expect, it } from "bun:test";
import { Type } from "typebox";

import { ExecutionPlanCompileError } from "@mapgen/engine/index.js";
import { EmptyStepConfigSchema } from "@mapgen/engine/step-config.js";
import {
  createRecipe,
  createStage,
  createStep,
  defineStepContract,
} from "@mapgen/authoring/index.js";

describe("authoring SDK", () => {
  const baseSettings = {
    seed: 42,
    dimensions: { width: 2, height: 2 },
    latitudeBounds: { topLatitude: 90, bottomLatitude: -90 },
    wrap: { wrapX: true, wrapY: false },
  };

  const makeContract = (id: string, schema = EmptyStepConfigSchema) =>
    defineStepContract({
      id,
      phase: "foundation",
      requires: [],
      provides: [],
      schema,
    });

  it("createStep rejects missing schema", () => {
    expect(() =>
      createStep(
        {
          id: "alpha",
          phase: "foundation",
          requires: [],
          provides: [],
        } as any,
        { run: () => {} }
      )
    ).toThrow(/schema/);
  });

  it("createStep accepts explicit empty schema", () => {
    expect(() =>
      createStep(makeContract("alpha"), { run: () => {} })
    ).not.toThrow();
  });

  it("defineStepContract rejects non-kebab step ids", () => {
    expect(() =>
      defineStepContract({
        id: "BadId",
        phase: "foundation",
        requires: [],
        provides: [],
        schema: EmptyStepConfigSchema,
      })
    ).toThrow(/BadId/);
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

  it("createStage rejects non-kebab step ids with stage context", () => {
    let error: Error | null = null;
    try {
      createStage({
        id: "foundation",
        steps: [
          {
            id: "BadId",
            phase: "foundation",
            requires: [],
            provides: [],
            schema: EmptyStepConfigSchema,
            run: () => {},
          },
        ],
      } as any);
    } catch (err) {
      error = err as Error;
    }
    expect(error?.message).toContain("foundation");
    expect(error?.message).toContain("BadId");
  });

  it("createRecipe rejects missing tagDefinitions", () => {
    const step = createStep(makeContract("alpha"), { run: () => {} });
    const stage = createStage({ id: "foundation", steps: [step] });

    expect(() =>
      createRecipe({
        id: "core.base",
        stages: [stage],
      } as any)
    ).toThrow(/tagDefinitions/);
  });

  it("createRecipe produces Recipe schema v2 (no instance ids)", () => {
    const stepA = createStep(makeContract("alpha"), { run: () => {} });
    const stepB = createStep(makeContract("beta"), { run: () => {} });
    const stage = createStage({ id: "foundation", steps: [stepA, stepB] });

    const recipe = createRecipe({
      id: "core.base",
      tagDefinitions: [],
      stages: [stage],
    });

    expect(recipe.recipe.schemaVersion).toBe(2);
    expect(recipe.recipe.steps[0]).toHaveProperty("id");
    expect(recipe.recipe.steps[0]).not.toHaveProperty("instanceId");
  });

  it("createRecipe derives deterministic step ids", () => {
    const step = createStep(makeContract("alpha"), { run: () => {} });
    const stage = createStage({ id: "foundation", steps: [step] });
    const recipe = createRecipe({ id: "core.base", tagDefinitions: [], stages: [stage] });

    expect(recipe.recipe.steps[0]?.id).toBe("core.base.foundation.alpha");
  });

  it("createRecipe rejects invalid tag prefixes", () => {
    const step = createStep(
      defineStepContract({
        id: "alpha",
        phase: "foundation",
        requires: ["bad:tag"],
        provides: [],
        schema: EmptyStepConfigSchema,
      }),
      { run: () => {} }
    );
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
    const step = createStep(makeContract("alpha", schema), { run: () => {} });
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
