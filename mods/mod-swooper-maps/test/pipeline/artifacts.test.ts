import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { implementArtifacts } from "@swooper/mapgen-core/authoring";
import {
  compileExecutionPlan,
  PipelineExecutor,
  StepRegistry,
  isDependencyTagSatisfied,
} from "@swooper/mapgen-core/engine";
import { hydrologyHydrographyArtifacts } from "../../src/recipes/standard/stages/hydrology-hydrography/artifacts.js";
import { hydrologyClimateBaselineArtifacts } from "../../src/recipes/standard/stages/hydrology-climate-baseline/artifacts.js";
import { M3_DEPENDENCY_TAGS, STANDARD_TAG_DEFINITIONS } from "../../src/recipes/standard/tags.js";

const baseEnv = {
  seed: 0,
  dimensions: { width: 4, height: 3 },
  latitudeBounds: { topLatitude: 0, bottomLatitude: 0 },
};

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

describe("pipeline artifacts", () => {
  it("treats artifact:climateField as unsatisfied until published", () => {
    const adapter = createMockAdapter({ width: 4, height: 3, rng: () => 0 });
    const ctx = createExtendedMapContext(
      { width: 4, height: 3 },
      adapter,
      baseEnv
    );
    const climateArtifacts = implementArtifacts([hydrologyClimateBaselineArtifacts.climateField], {
      climateField: {},
    });

    const registry = new StepRegistry<typeof ctx>();
    registry.registerTags([
      ...STANDARD_TAG_DEFINITIONS,
      {
        id: hydrologyClimateBaselineArtifacts.climateField.id,
        kind: "artifact",
        satisfies: climateArtifacts.climateField.satisfies,
      },
    ]);
    const tagRegistry = registry.getTagRegistry();

    expect(
      isDependencyTagSatisfied(hydrologyClimateBaselineArtifacts.climateField.id, ctx, {
        satisfied: new Set(),
      }, tagRegistry)
    ).toBe(false);

    climateArtifacts.climateField.publish(ctx, ctx.buffers.climate);

    expect(
      isDependencyTagSatisfied(hydrologyClimateBaselineArtifacts.climateField.id, ctx, {
        satisfied: new Set([hydrologyClimateBaselineArtifacts.climateField.id]),
      }, tagRegistry)
    ).toBe(true);
  });

  it("treats preallocated field buffers as unsatisfied until provided", () => {
    const adapter = createMockAdapter({ width: 4, height: 3, rng: () => 0 });
    const ctx = createExtendedMapContext(
      { width: 4, height: 3 },
      adapter,
      baseEnv
    );
    const registry = new StepRegistry<typeof ctx>();
    registry.registerTags(STANDARD_TAG_DEFINITIONS);
    const tagRegistry = registry.getTagRegistry();

    expect(
      isDependencyTagSatisfied(M3_DEPENDENCY_TAGS.field.terrainType, ctx, {
        satisfied: new Set(),
      }, tagRegistry)
    ).toBe(false);

    expect(
      isDependencyTagSatisfied(M3_DEPENDENCY_TAGS.field.terrainType, ctx, {
        satisfied: new Set([M3_DEPENDENCY_TAGS.field.terrainType]),
      }, tagRegistry)
    ).toBe(true);
  });

  it("fails provides when a step claims artifact:climateField but does not publish it", () => {
    const adapter = createMockAdapter({ width: 4, height: 3, rng: () => 0 });
    const ctx = createExtendedMapContext(
      { width: 4, height: 3 },
      adapter,
      baseEnv
    );
    const climateArtifacts = implementArtifacts([hydrologyClimateBaselineArtifacts.climateField], {
      climateField: {},
    });

    const registry = new StepRegistry<typeof ctx>();
    registry.registerTags([
      ...STANDARD_TAG_DEFINITIONS,
      {
        id: hydrologyClimateBaselineArtifacts.climateField.id,
        kind: "artifact",
        satisfies: climateArtifacts.climateField.satisfies,
      },
    ]);
    registry.register({
      id: "climate-baseline",
      phase: "hydrology",
      requires: [],
      provides: [hydrologyClimateBaselineArtifacts.climateField.id],
      run: (_context, _config) => {},
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const plan = compilePlan(registry, baseEnv, ["climate-baseline"]);
    const { stepResults } = executor.executePlanReport(ctx, plan);

    expect(stepResults[0]?.success).toBe(false);
    expect(stepResults[0]?.error).toContain("did not satisfy declared provides");
  });

  it("accepts provides when a step publishes artifact:hydrology.hydrography", () => {
    const adapter = createMockAdapter({ width: 4, height: 3, rng: () => 0 });
    const ctx = createExtendedMapContext(
      { width: 4, height: 3 },
      adapter,
      baseEnv
    );
    const hydrographyArtifacts = implementArtifacts([hydrologyHydrographyArtifacts.hydrography], {
      hydrography: {},
    });

    const registry = new StepRegistry<typeof ctx>();
    registry.registerTags([
      ...STANDARD_TAG_DEFINITIONS,
      {
        id: hydrologyHydrographyArtifacts.hydrography.id,
        kind: "artifact",
        satisfies: hydrographyArtifacts.hydrography.satisfies,
      },
    ]);
    registry.register({
      id: "rivers",
      phase: "hydrology",
      requires: [],
      provides: [hydrologyHydrographyArtifacts.hydrography.id],
      run: (_context, _config) => {
        const size = ctx.dimensions.width * ctx.dimensions.height;
        hydrographyArtifacts.hydrography.publish(ctx, {
          runoff: new Float32Array(size),
          discharge: new Float32Array(size),
          riverClass: new Uint8Array(size),
          sinkMask: new Uint8Array(size),
          outletMask: new Uint8Array(size),
        });
      },
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const plan = compilePlan(registry, baseEnv, ["rivers"]);
    const { stepResults } = executor.executePlanReport(ctx, plan);

    expect(stepResults[0]?.success).toBe(true);
    const hydro = ctx.artifacts.get(hydrologyHydrographyArtifacts.hydrography.id) as
      | { runoff?: unknown; discharge?: unknown; riverClass?: unknown; sinkMask?: unknown; outletMask?: unknown }
      | undefined;
    expect(hydro?.runoff).toBeInstanceOf(Float32Array);
    expect(hydro?.discharge).toBeInstanceOf(Float32Array);
    expect(hydro?.riverClass).toBeInstanceOf(Uint8Array);
    expect(hydro?.sinkMask).toBeInstanceOf(Uint8Array);
    expect(hydro?.outletMask).toBeInstanceOf(Uint8Array);
  });
});
