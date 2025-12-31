import { describe, expect, it } from "bun:test";

import { EmptyStepConfigSchema } from "@mapgen/engine/step-config.js";
import { createRecipe, createStage, createStep } from "@mapgen/authoring/index.js";

describe("authoring SDK", () => {
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
});
