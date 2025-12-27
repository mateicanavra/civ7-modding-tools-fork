import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import type { MapGenConfig } from "@mapgen/config/index.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import { M3_DEPENDENCY_TAGS, M3_STAGE_DEPENDENCY_SPINE, M4_EFFECT_TAGS, registerBaseTags } from "@mapgen/base/index.js";
import {
  PipelineExecutor,
  StepRegistry,
} from "@mapgen/pipeline/index.js";
import { isDependencyTagSatisfied } from "@mapgen/pipeline/tags.js";
import {
  computeRiverAdjacencyMask,
  publishClimateFieldArtifact,
  publishRiverAdjacencyArtifact,
} from "@mapgen/base/pipeline/artifacts.js";

describe("pipeline artifacts", () => {
  it("requires artifact:heightfield for climate baseline and swatches", () => {
    expect(M3_STAGE_DEPENDENCY_SPINE.climateBaseline.requires).toContain(
      M3_DEPENDENCY_TAGS.artifact.heightfield
    );
    expect(M3_STAGE_DEPENDENCY_SPINE.storySwatches.requires).toContain(
      M3_DEPENDENCY_TAGS.artifact.heightfield
    );
  });

  it("includes climate/river prerequisites for storyCorridorsPost in the standard dependency spine", () => {
    expect(M3_STAGE_DEPENDENCY_SPINE.storyCorridorsPost.requires).toEqual(
      expect.arrayContaining([
        M4_EFFECT_TAGS.engine.coastlinesApplied,
        M3_DEPENDENCY_TAGS.artifact.climateField,
        M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
      ])
    );
    expect(M3_STAGE_DEPENDENCY_SPINE.storyCorridorsPost.requires).not.toContain(
      M3_DEPENDENCY_TAGS.artifact.storyOverlays
    );
  });

  it("treats artifact:climateField as unsatisfied until published", () => {
    const adapter = createMockAdapter({ width: 4, height: 3, rng: () => 0 });
    const ctx = createExtendedMapContext(
      { width: 4, height: 3 },
      adapter,
      {} as unknown as MapGenConfig
    );
    const registry = new StepRegistry<typeof ctx>();
    registerBaseTags(registry);
    const tagRegistry = registry.getTagRegistry();

    expect(
      isDependencyTagSatisfied(M3_DEPENDENCY_TAGS.artifact.climateField, ctx, {
        satisfied: new Set(),
      }, tagRegistry)
    ).toBe(false);

    publishClimateFieldArtifact(ctx);

    expect(
      isDependencyTagSatisfied(M3_DEPENDENCY_TAGS.artifact.climateField, ctx, {
        satisfied: new Set([M3_DEPENDENCY_TAGS.artifact.climateField]),
      }, tagRegistry)
    ).toBe(true);
  });

  it("treats preallocated field buffers as unsatisfied until provided", () => {
    const adapter = createMockAdapter({ width: 4, height: 3, rng: () => 0 });
    const ctx = createExtendedMapContext(
      { width: 4, height: 3 },
      adapter,
      {} as unknown as MapGenConfig
    );
    const registry = new StepRegistry<typeof ctx>();
    registerBaseTags(registry);
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
      {} as unknown as MapGenConfig
    );

    const registry = new StepRegistry<typeof ctx>();
    registerBaseTags(registry);
    registry.register({
      id: "climateBaseline",
      phase: "hydrology",
      requires: [],
      provides: [M3_DEPENDENCY_TAGS.artifact.climateField],
      run: (_context, _config) => {},
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const { stepResults } = executor.execute(ctx, ["climateBaseline"]);

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
      {} as unknown as MapGenConfig
    );

    const registry = new StepRegistry<typeof ctx>();
    registerBaseTags(registry);
    registry.register({
      id: "rivers",
      phase: "hydrology",
      requires: [],
      provides: [M3_DEPENDENCY_TAGS.artifact.riverAdjacency],
      run: (_context, _config) => {
        const mask = computeRiverAdjacencyMask(ctx);
        publishRiverAdjacencyArtifact(ctx, mask);
      },
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const { stepResults } = executor.execute(ctx, ["rivers"]);

    expect(stepResults[0]?.success).toBe(true);
    expect(ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.riverAdjacency)).toBeInstanceOf(Uint8Array);
  });
});
