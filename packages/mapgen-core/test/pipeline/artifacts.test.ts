import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import type { MapConfig } from "../../src/bootstrap/types.js";
import { createExtendedMapContext } from "../../src/core/types.js";
import {
  PipelineExecutor,
  StepRegistry,
  M3_DEPENDENCY_TAGS,
} from "../../src/pipeline/index.js";
import { M3_STAGE_DEPENDENCY_SPINE } from "../../src/pipeline/standard.js";
import { isDependencyTagSatisfied } from "../../src/pipeline/tags.js";
import {
  computeRiverAdjacencyMask,
  publishClimateFieldArtifact,
  publishRiverAdjacencyArtifact,
} from "../../src/pipeline/artifacts.js";

describe("pipeline artifacts", () => {
  it("includes climate/river prerequisites for storyCorridorsPost in the standard dependency spine", () => {
    expect(M3_STAGE_DEPENDENCY_SPINE.storyCorridorsPost.requires).toEqual(
      expect.arrayContaining([
        M3_DEPENDENCY_TAGS.state.coastlinesApplied,
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
      {} as unknown as MapConfig
    );

    expect(
      isDependencyTagSatisfied(M3_DEPENDENCY_TAGS.artifact.climateField, ctx, {
        satisfied: new Set(),
      })
    ).toBe(false);

    publishClimateFieldArtifact(ctx);

    expect(
      isDependencyTagSatisfied(M3_DEPENDENCY_TAGS.artifact.climateField, ctx, {
        satisfied: new Set([M3_DEPENDENCY_TAGS.artifact.climateField]),
      })
    ).toBe(true);
  });

  it("fails provides when a step claims artifact:climateField but does not publish it", () => {
    const adapter = createMockAdapter({ width: 4, height: 3, rng: () => 0 });
    const ctx = createExtendedMapContext(
      { width: 4, height: 3 },
      adapter,
      {} as unknown as MapConfig
    );

    const registry = new StepRegistry<typeof ctx>();
    registry.register({
      id: "climateBaseline",
      phase: "hydrology",
      requires: [],
      provides: [M3_DEPENDENCY_TAGS.artifact.climateField],
      run: () => {},
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
      {} as unknown as MapConfig
    );

    const registry = new StepRegistry<typeof ctx>();
    registry.register({
      id: "rivers",
      phase: "hydrology",
      requires: [],
      provides: [M3_DEPENDENCY_TAGS.artifact.riverAdjacency],
      run: () => {
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
