import { describe, expect, it } from "bun:test";

import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { implementArtifacts } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology/ops";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "@mapgen/domain/narrative/overlays/index.js";

import biomesStep from "../../src/recipes/standard/stages/ecology/steps/biomes/index.js";
import { hydrologyPreArtifacts } from "../../src/recipes/standard/stages/hydrology-pre/artifacts.js";
import { narrativePreArtifacts } from "../../src/recipes/standard/stages/narrative-pre/artifacts.js";
import { normalizeOpSelectionOrThrow } from "../support/compiler-helpers.js";
import { buildTestDeps } from "../support/step-deps.js";

describe("biomes step", () => {
  it("assigns marine biome to water tiles", () => {
    const width = 4;
    const height = 3;
    const size = width * height;
    const env = {
      seed: 0,
      dimensions: { width, height },
      latitudeBounds: { topLatitude: 0, bottomLatitude: 0 },
    };

    const adapter = createMockAdapter({ width, height });
    adapter.fillWater(false);
    adapter.setWater(0, 0, true);

    const ctx = createExtendedMapContext({ width, height }, adapter, env);

    ctx.buffers.heightfield.landMask.fill(1);
    ctx.buffers.heightfield.landMask[0] = 0;
    ctx.buffers.heightfield.elevation.fill(0);

    ctx.buffers.climate.rainfall.fill(120);
    ctx.buffers.climate.humidity.fill(80);

    const hydrologyArtifacts = implementArtifacts(
      [hydrologyPreArtifacts.heightfield, hydrologyPreArtifacts.climateField],
      { heightfield: {}, climateField: {} }
    );
    hydrologyArtifacts.heightfield.publish(ctx, ctx.buffers.heightfield);
    hydrologyArtifacts.climateField.publish(ctx, ctx.buffers.climate);

    const narrativeArtifacts = implementArtifacts([narrativePreArtifacts.overlays], {
      overlays: {},
    });
    narrativeArtifacts.overlays.publish(ctx, ctx.overlays);
    publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.CORRIDORS, {
      kind: STORY_OVERLAY_KEYS.CORRIDORS,
      version: 1,
      width,
      height,
      active: [],
      summary: {
        seaLane: [],
        islandHop: [],
        landOpen: [],
        riverChain: [],
        kindByTile: {},
        styleByTile: {},
        attributesByTile: {},
      },
    });
    publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.RIFTS, {
      kind: STORY_OVERLAY_KEYS.RIFTS,
      version: 1,
      width,
      height,
      active: [],
      passive: [],
      summary: {
        rifts: 0,
        lineTiles: 0,
        shoulderTiles: 0,
        kind: "test",
      },
    });

    const classifyConfig = normalizeOpSelectionOrThrow(ecology.ops.classifyBiomes, {
      strategy: "default",
      config: {},
    });

    const ops = ecology.ops.bind(biomesStep.contract.ops!).runtime;
    biomesStep.run(
      ctx,
      {
        classify: classifyConfig,
        bindings: {},
      },
      ops,
      buildTestDeps(biomesStep)
    );

    const marineId = adapter.getBiomeGlobal("BIOME_MARINE");
    expect(ctx.fields.biomeId[0]).toBe(marineId);

    const landIdx = 1;
    expect(ctx.fields.biomeId[landIdx]).not.toBe(marineId);
    expect(ctx.fields.biomeId[landIdx]).toBeGreaterThanOrEqual(0);
  });
});
