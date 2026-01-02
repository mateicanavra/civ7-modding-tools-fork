import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import {
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

function buildTestSettings(width: number, height: number) {
  return {
    seed: 0,
    dimensions: { width, height },
    latitudeBounds: { topLatitude: 80, bottomLatitude: -80 },
    wrap: { wrapX: true, wrapY: false },
  };
}

describe("placement step contracts", () => {
  it("fails fast when placement runs without placementInputs", () => {
    const width = 4;
    const height = 4;
    const settings = buildTestSettings(width, height);
    const adapter = createMockAdapter({ width, height, rng: () => 0 });
    const context = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      {} as ExtendedMapContext["config"],
      settings
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
      executor.execute(context, ["coastlines", "rivers", "placement"]);
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
    const settings = buildTestSettings(width, height);
    const adapter = createMockAdapter({ width, height, rng: () => 0 });
    const context = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      {} as ExtendedMapContext["config"],
      settings
    );

    const registry = new StepRegistry<ExtendedMapContext>();
    registry.registerTags(TEST_TAG_DEFINITIONS);
    registry.register({
      id: "derivePlacementInputs",
      phase: "placement",
      requires: [],
      provides: [TEST_TAGS.artifact.placementInputs],
      run: (_context, _config) => {
        _context.artifacts.set(TEST_TAGS.artifact.placementInputs, { valid: false });
      },
    });

    const executor = new PipelineExecutor(registry, { log: () => {} });
    const { stepResults } = executor.execute(context, ["derivePlacementInputs"]);

    expect(stepResults).toHaveLength(1);
    expect(stepResults[0]?.success).toBe(false);
    expect(stepResults[0]?.error).toContain("did not satisfy declared provides");
    expect(stepResults[0]?.error).toContain(TEST_TAGS.artifact.placementInputs);
  });

  it("fails fast when placement outputs are missing", () => {
    const width = 4;
    const height = 4;
    const settings = buildTestSettings(width, height);
    const adapter = createMockAdapter({ width, height, rng: () => 0 });
    const context = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      {} as ExtendedMapContext["config"],
      settings
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
    const { stepResults } = executor.execute(context, ["placement"]);

    expect(stepResults).toHaveLength(1);
    expect(stepResults[0]?.success).toBe(false);
    expect(stepResults[0]?.error).toContain("did not satisfy declared provides");
    expect(stepResults[0]?.error).toContain(TEST_TAGS.effect.placementApplied);
  });

  it("fails fast when placement outputs are invalid", () => {
    const width = 4;
    const height = 4;
    const settings = buildTestSettings(width, height);
    const adapter = createMockAdapter({ width, height, rng: () => 0 });
    const context = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      {} as ExtendedMapContext["config"],
      settings
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
    const { stepResults } = executor.execute(context, ["placement"]);

    expect(stepResults).toHaveLength(1);
    expect(stepResults[0]?.success).toBe(false);
    expect(stepResults[0]?.error).toContain("did not satisfy declared provides");
    expect(stepResults[0]?.error).toContain(TEST_TAGS.effect.placementApplied);
  });
});
