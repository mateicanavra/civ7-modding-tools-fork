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
import { computeRiverAdjacencyMask } from "../../src/recipes/standard/stages/hydrology-hydrography/river-adjacency.js";
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

  it("accepts provides when a step publishes artifact:riverAdjacency", () => {
    const adapter = createMockAdapter({ width: 4, height: 3, rng: () => 0 });
    (adapter as unknown as { isAdjacentToRivers: (x: number, y: number) => boolean }).isAdjacentToRivers =
      (x, y) => x === 1 && y === 1;

    const ctx = createExtendedMapContext(
      { width: 4, height: 3 },
      adapter,
      baseEnv
    );
    const riverArtifacts = implementArtifacts([hydrologyHydrographyArtifacts.riverAdjacency], {
      riverAdjacency: {},
    });

    const registry = new StepRegistry<typeof ctx>();
    registry.registerTags([
      ...STANDARD_TAG_DEFINITIONS,
      {
        id: hydrologyHydrographyArtifacts.riverAdjacency.id,
        kind: "artifact",
        satisfies: riverArtifacts.riverAdjacency.satisfies,
      },
    ]);
    registry.register({
      id: "rivers",
      phase: "hydrology",
      requires: [],
      provides: [hydrologyHydrographyArtifacts.riverAdjacency.id],
      run: (_context, _config) => {
        const mask = computeRiverAdjacencyMask(ctx);
        riverArtifacts.riverAdjacency.publish(ctx, mask);
      },
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const plan = compilePlan(registry, baseEnv, ["rivers"]);
    const { stepResults } = executor.executePlanReport(ctx, plan);

    expect(stepResults[0]?.success).toBe(true);
    expect(ctx.artifacts.get(hydrologyHydrographyArtifacts.riverAdjacency.id)).toBeInstanceOf(Uint8Array);
  });
});
