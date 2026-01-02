import { describe, expect, it } from "bun:test";
import { Type } from "typebox";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import { createRecipe, createStage, createStep } from "@mapgen/authoring/index.js";

const baseSettings = {
  seed: 1,
  dimensions: { width: 8, height: 6 },
  latitudeBounds: { topLatitude: 90, bottomLatitude: -90 },
  wrap: { wrapX: true, wrapY: false },
};

describe("authoring: hello recipe compile/execute", () => {
  it("compiles and executes a minimal recipe module", () => {
    const helloStep = createStep({
      id: "hello",
      phase: "foundation",
      requires: [],
      provides: [],
      schema: Type.Object({}, { additionalProperties: false }),
      run: (context) => {
        context.metrics.warnings.push("hello");
      },
    });

    const helloStage = createStage({
      id: "foundation",
      steps: [helloStep],
    });

    const recipe = createRecipe({
      id: "hello",
      namespace: "test",
      tagDefinitions: [],
      stages: [helloStage],
    });

    const adapter = createMockAdapter({ width: 8, height: 6, mapSizeId: 1 });
    const ctx = createExtendedMapContext(
      { width: 8, height: 6 },
      adapter,
      baseSettings
    );

    const plan = recipe.compile(baseSettings, { foundation: { hello: {} } });
    expect(plan.nodes).toHaveLength(1);
    expect(plan.nodes[0]?.stepId).toContain("hello");

    recipe.run(ctx, baseSettings, { foundation: { hello: {} } });
    expect(ctx.metrics.warnings).toContain("hello");
  });
});
