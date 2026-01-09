import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import {
  compileExecutionPlan,
  MissingDependencyError,
  PipelineExecutor,
  StepRegistry,
} from "@mapgen/engine/index.js";

const TEST_TAGS = {
  artifact: {
    placementInputs: "artifact:test.placementInputs",
    placementOutputs: "artifact:test.placementOutputs",
  },
  effect: {
    coastlinesApplied: "effect:test.coastlinesApplied",
    riversModeled: "effect:test.riversModeled",
    placementApplied: "effect:test.placementApplied",
  },
} as const;

const TEST_TAG_DEFINITIONS = [
  {
    id: TEST_TAGS.artifact.placementInputs,
    kind: "artifact",
    satisfies: (context: ExtendedMapContext, _state) =>
      (context.artifacts.get(TEST_TAGS.artifact.placementInputs) as { valid?: boolean } | undefined)
        ?.valid === true,
  },
  {
    id: TEST_TAGS.artifact.placementOutputs,
    kind: "artifact",
    satisfies: (context: ExtendedMapContext, _state) =>
      (context.artifacts.get(TEST_TAGS.artifact.placementOutputs) as { valid?: boolean } | undefined)
        ?.valid === true,
  },
  {
    id: TEST_TAGS.effect.coastlinesApplied,
    kind: "effect",
    satisfies: (_context: ExtendedMapContext, _state) => true,
  },
  {
    id: TEST_TAGS.effect.riversModeled,
    kind: "effect",
    satisfies: (_context: ExtendedMapContext, _state) => true,
  },
  {
    id: TEST_TAGS.effect.placementApplied,
    kind: "effect",
    satisfies: (context: ExtendedMapContext, _state) =>
      (context.artifacts.get(TEST_TAGS.artifact.placementOutputs) as { valid?: boolean } | undefined)
        ?.valid === true,
  },
] as const;

function buildTestEnv(width: number, height: number) {
  return {
    seed: 0,
    dimensions: { width, height },
    latitudeBounds: { topLatitude: 80, bottomLatitude: -80 },
    wrap: { wrapX: true, wrapY: false },
  };
}

function compilePlan<TContext>(
  registry: StepRegistry<TContext>,
  env: ReturnType<typeof buildTestEnv>,
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

describe("placement step contracts", () => {
  it("fails fast when placement runs without placementInputs", () => {
    const width = 4;
    const height = 4;
    const env = buildTestEnv(width, height);
    const adapter = createMockAdapter({ width, height, rng: () => 0 });
    const context = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      env
    );

    const registry = new StepRegistry<ExtendedMapContext>();
    registry.registerTags(TEST_TAG_DEFINITIONS);
    registry.register({
      id: "coastlines",
      phase: "morphology",
      requires: [],
      provides: [TEST_TAGS.effect.coastlinesApplied],
      run: (ctx) => {
        const ocean = ctx.adapter.getTerrainTypeIndex("TERRAIN_OCEAN");
        for (let x = 0; x < width; x++) {
          ctx.adapter.setTerrainType(x, 0, ocean);
        }
        ctx.adapter.expandCoasts(width, height);
      },
    });
    registry.register({
      id: "rivers",
      phase: "hydrology",
      requires: [],
      provides: [TEST_TAGS.effect.riversModeled],
      run: (ctx) => {
        const riverTerrain = ctx.adapter.getTerrainTypeIndex("TERRAIN_NAVIGABLE_RIVER");
        ctx.adapter.modelRivers(5, 15, riverTerrain);
      },
    });
    registry.register({
      id: "placement",
      phase: "placement",
      requires: [TEST_TAGS.artifact.placementInputs],
      provides: [TEST_TAGS.effect.placementApplied],
      run: (_context, _config) => {},
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });

    try {
      const plan = compilePlan(registry, env, ["coastlines", "rivers", "placement"]);
      executor.executePlan(context, plan);
      throw new Error("Expected placement gating to fail");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingDependencyError);
      expect((err as MissingDependencyError).stepId).toBe("placement");
      expect((err as MissingDependencyError).missing).toEqual([
        TEST_TAGS.artifact.placementInputs,
      ]);
    }
  });

  it("fails fast when placementInputs are published with an invalid payload", () => {
    const width = 4;
    const height = 4;
    const env = buildTestEnv(width, height);
    const adapter = createMockAdapter({ width, height, rng: () => 0 });
    const context = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      env
    );

    const registry = new StepRegistry<ExtendedMapContext>();
    registry.registerTags(TEST_TAG_DEFINITIONS);
    registry.register({
      id: "derive-placement-inputs",
      phase: "placement",
      requires: [],
      provides: [TEST_TAGS.artifact.placementInputs],
      run: (_context, _config) => {
        _context.artifacts.set(TEST_TAGS.artifact.placementInputs, { valid: false });
      },
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const plan = compilePlan(registry, env, ["derive-placement-inputs"]);
    const { stepResults } = executor.executePlan(context, plan);

    expect(stepResults).toHaveLength(1);
    expect(stepResults[0]?.success).toBe(false);
    expect(stepResults[0]?.error).toContain("did not satisfy declared provides");
    expect(stepResults[0]?.error).toContain(TEST_TAGS.artifact.placementInputs);
  });

  it("fails fast when placement outputs are missing", () => {
    const width = 4;
    const height = 4;
    const env = buildTestEnv(width, height);
    const adapter = createMockAdapter({ width, height, rng: () => 0 });
    const context = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      env
    );

    const registry = new StepRegistry<ExtendedMapContext>();
    registry.registerTags(TEST_TAG_DEFINITIONS);
    registry.register({
      id: "placement",
      phase: "placement",
      requires: [],
      provides: [TEST_TAGS.effect.placementApplied],
      run: (_context, _config) => {},
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const plan = compilePlan(registry, env, ["placement"]);
    const { stepResults } = executor.executePlan(context, plan);

    expect(stepResults).toHaveLength(1);
    expect(stepResults[0]?.success).toBe(false);
    expect(stepResults[0]?.error).toContain("did not satisfy declared provides");
    expect(stepResults[0]?.error).toContain(TEST_TAGS.effect.placementApplied);
  });

  it("fails fast when placement outputs are invalid", () => {
    const width = 4;
    const height = 4;
    const env = buildTestEnv(width, height);
    const adapter = createMockAdapter({ width, height, rng: () => 0 });
    const context = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      env
    );

    const registry = new StepRegistry<ExtendedMapContext>();
    registry.registerTags(TEST_TAG_DEFINITIONS);
    registry.register({
      id: "placement",
      phase: "placement",
      requires: [],
      provides: [TEST_TAGS.effect.placementApplied],
      run: (_context, _config) => {
        _context.artifacts.set(TEST_TAGS.artifact.placementOutputs, { valid: false });
      },
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const plan = compilePlan(registry, env, ["placement"]);
    const { stepResults } = executor.executePlan(context, plan);

    expect(stepResults).toHaveLength(1);
    expect(stepResults[0]?.success).toBe(false);
    expect(stepResults[0]?.error).toContain("did not satisfy declared provides");
    expect(stepResults[0]?.error).toContain(TEST_TAGS.effect.placementApplied);
  });
});
