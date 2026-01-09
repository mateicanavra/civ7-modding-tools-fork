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
  const EmptyKnobsSchema = Type.Object({}, { additionalProperties: false, default: {} });

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
        knobsSchema: EmptyKnobsSchema,
        steps: [
          {
            contract: {
              id: "alpha",
              phase: "foundation",
              requires: [],
              provides: [],
            } as any,
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
        knobsSchema: EmptyKnobsSchema,
        steps: [
          {
            contract: {
              id: "BadId",
              phase: "foundation",
              requires: [],
              provides: [],
              schema: EmptyStepConfigSchema,
            },
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

  it("createStage computes surfaceSchema for internal stages", () => {
    const step = createStep(makeContract("alpha"), { run: () => {} });
    const stage = createStage({ id: "foundation", knobsSchema: EmptyKnobsSchema, steps: [step] });
    const props = (stage.surfaceSchema as any).properties as Record<string, unknown>;
    expect(props).toHaveProperty("knobs");
    expect(props).toHaveProperty("alpha");
  });

  it("createStage supports public schema with compile mapping", () => {
    const step = createStep(makeContract("alpha"), { run: () => {} });
    const publicSchema = Type.Object(
      {
        climate: Type.Number(),
      },
      { additionalProperties: false, default: {} }
    );
    const stage = createStage({
      id: "foundation",
      knobsSchema: EmptyKnobsSchema,
      public: publicSchema,
      compile: ({ config }) => ({ alpha: { value: config.climate } }),
      steps: [step],
    });
    const props = (stage.surfaceSchema as any).properties as Record<string, unknown>;
    expect(props).toHaveProperty("knobs");
    expect(props).toHaveProperty("climate");
    expect(props).not.toHaveProperty("alpha");

    const internal = stage.toInternal({ env: {}, stageConfig: { knobs: {}, climate: 2 } });
    expect(internal.rawSteps).toEqual({ alpha: { value: 2 } });
  });

  it("createStage rejects reserved knobs key in steps or public schema", () => {
    const knobsStep = createStep(
      defineStepContract({
        id: "knobs",
        phase: "foundation",
        requires: [],
        provides: [],
        schema: EmptyStepConfigSchema,
      }),
      { run: () => {} }
    );
    expect(() =>
      createStage({
        id: "foundation",
        knobsSchema: EmptyKnobsSchema,
        steps: [knobsStep],
      })
    ).toThrow(/knobs/);

    const publicSchema = Type.Object(
      {
        knobs: Type.String(),
      },
      { additionalProperties: false, default: {} }
    );
    expect(() =>
      createStage({
        id: "foundation",
        knobsSchema: EmptyKnobsSchema,
        public: publicSchema,
        compile: () => ({ alpha: {} }),
        steps: [createStep(makeContract("alpha"), { run: () => {} })],
      })
    ).toThrow(/knobs/);
  });

  it("createStage rejects compile output with reserved knobs key", () => {
    const step = createStep(makeContract("alpha"), { run: () => {} });
    const publicSchema = Type.Object(
      {
        climate: Type.Number(),
      },
      { additionalProperties: false, default: {} }
    );
    const stage = createStage({
      id: "foundation",
      knobsSchema: EmptyKnobsSchema,
      public: publicSchema,
      compile: () => ({ knobs: {} }),
      steps: [step],
    });
    expect(() => stage.toInternal({ env: {}, stageConfig: { climate: 1 } })).toThrow(/knobs/);
  });

  it("createRecipe rejects missing tagDefinitions", () => {
    const step = createStep(makeContract("alpha"), { run: () => {} });
    const stage = createStage({ id: "foundation", knobsSchema: EmptyKnobsSchema, steps: [step] });

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
    const stage = createStage({
      id: "foundation",
      knobsSchema: EmptyKnobsSchema,
      steps: [stepA, stepB],
    });

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
    const stage = createStage({ id: "foundation", knobsSchema: EmptyKnobsSchema, steps: [step] });
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
    const stage = createStage({ id: "foundation", knobsSchema: EmptyKnobsSchema, steps: [step] });

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
    const stage = createStage({ id: "foundation", knobsSchema: EmptyKnobsSchema, steps: [step] });
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
