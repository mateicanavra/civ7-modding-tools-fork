import { describe, expect, it } from "bun:test";
import { Type } from "typebox";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@mapgen/core/types.js";

import {
  createRecipe,
  createStage,
  createStep,
  defineArtifact,
  defineStep,
  implementArtifacts,
} from "@mapgen/authoring/index.js";
import {
  compileExecutionPlan,
  InvalidDependencyTagDemoError,
  PipelineExecutor,
  StepRegistry,
  TagRegistry,
  UnknownDependencyTagError,
  UnsatisfiedProvidesError,
} from "@mapgen/engine/index.js";

const TEST_TAGS = {
  effect: {
    biomesApplied: "effect:test.biomesApplied",
    coastlinesApplied: "effect:test.coastlinesApplied",
  },
} as const;

const baseEnv = {
  seed: 0,
  dimensions: { width: 2, height: 2 },
  latitudeBounds: { topLatitude: 0, bottomLatitude: 0 },
  wrap: { wrapX: false, wrapY: false },
};

const EmptyKnobsSchema = Type.Object({}, { additionalProperties: false, default: {} });

function compilePlan<TContext>(
  registry: StepRegistry<TContext>,
  env: typeof baseEnv,
  steps: readonly string[]
) {
  return compileExecutionPlan(
    {
      recipe: {
        schemaVersion: 2,
        steps: steps.map((id) => ({ id, config: {} })),
      },
      env,
    },
    registry
  );
}

describe("tag registry", () => {
  it("fails fast on unknown dependency tags at registration", () => {
    const registry = new StepRegistry<unknown>();

    expect(() =>
      registry.register({
        id: "alpha",
        phase: "foundation",
        requires: ["artifact:missing"],
        provides: [],
        run: () => {},
      })
    ).toThrow(UnknownDependencyTagError);
  });

  it("fails fast on invalid demo payloads", () => {
    const registry = new TagRegistry();

    expect(() =>
      registry.registerTag({
        id: "artifact:demo",
        kind: "artifact",
        demo: "bad",
        validateDemo: (demo) => typeof demo === "number",
      })
    ).toThrow(InvalidDependencyTagDemoError);
  });

  it("surfaces effect postcondition failures with the effect tag id", () => {
    const adapter = createMockAdapter({ width: 2, height: 2 });
    const ctx = createExtendedMapContext({ width: 2, height: 2 }, adapter, baseEnv);

    const registry = new StepRegistry<typeof ctx>();
    registry.registerTag({
      id: TEST_TAGS.effect.biomesApplied,
      kind: "effect",
      satisfies: (_context, _state) => false,
    });
    registry.register({
      id: "biomes",
      phase: "ecology",
      requires: [],
      provides: [TEST_TAGS.effect.biomesApplied],
      run: () => {},
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const plan = compilePlan(registry, baseEnv, ["biomes"]);
    const { stepResults } = executor.executePlanReport(ctx, plan);

    expect(stepResults[0]?.success).toBe(false);
    expect(stepResults[0]?.error).toContain(TEST_TAGS.effect.biomesApplied);
  });

  it("accepts provides when effect postconditions pass", () => {
    const adapter = createMockAdapter({ width: 2, height: 2 });
    const ctx = createExtendedMapContext({ width: 2, height: 2 }, adapter, baseEnv);

    const registry = new StepRegistry<typeof ctx>();
    registry.registerTag({
      id: TEST_TAGS.effect.coastlinesApplied,
      kind: "effect",
      satisfies: (_context, _state) => true,
    });
    registry.register({
      id: "coastlines",
      phase: "morphology",
      requires: [],
      provides: [TEST_TAGS.effect.coastlinesApplied],
      run: () => {},
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const plan = compilePlan(registry, baseEnv, ["coastlines"]);
    const { stepResults } = executor.executePlanReport(ctx, plan);

    expect(stepResults[0]?.success).toBe(true);
  });

  it("fails fast when a provider step skips artifact publish", () => {
    const artifact = defineArtifact({
      name: "artifactFoo",
      id: "artifact:test.foo",
      schema: Type.Object({}, { additionalProperties: false }),
    });

    const step = createStep(
      defineStep({
        id: "alpha",
        phase: "foundation",
        requires: [],
        provides: [],
        artifacts: { provides: [artifact] },
        schema: Type.Object({}, { additionalProperties: false }),
      }),
      {
        artifacts: implementArtifacts([artifact], { artifactFoo: {} }),
        run: () => {},
      }
    );

    const stage = createStage({ id: "foundation", knobsSchema: EmptyKnobsSchema, steps: [step] });
    const recipe = createRecipe({
      id: "core.base",
      tagDefinitions: [],
      stages: [stage],
      compileOpsById: {},
    });

    const adapter = createMockAdapter({ width: 2, height: 2 });
    const ctx = createExtendedMapContext({ width: 2, height: 2 }, adapter, baseEnv);

    expect(() => recipe.run(ctx, baseEnv)).toThrow(UnsatisfiedProvidesError);
  });
});
