import { describe, expect, it } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext, MOUNTAIN_TERRAIN } from "@swooper/mapgen-core";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import standardRecipe from "../../src/recipes/standard/recipe.js";
import { initializeStandardRuntime } from "../../src/recipes/standard/runtime.js";
import { createRealismEarthlikeConfig } from "../../src/maps/presets/realism/earthlike.config.js";
import { foundationArtifacts } from "../../src/recipes/standard/stages/foundation/artifacts.js";
import { morphologyArtifacts } from "../../src/recipes/standard/stages/morphology-pre/artifacts.js";
import {
  computeBeltToMountainCorrelation,
  computeMountainWallinessOddQ,
} from "../../src/recipes/standard/stages/map-morphology/steps/realism-metrics.js";

function runStandardAndReadInputs(params: { seed: number; width: number; height: number }) {
  const { seed, width, height } = params;

  const mapInfo = {
    GridWidth: width,
    GridHeight: height,
    MinLatitude: -85,
    MaxLatitude: 85,
    PlayersLandmass1: 4,
    PlayersLandmass2: 4,
    StartSectorRows: 4,
    StartSectorCols: 4,
  };

  const env = {
    seed,
    dimensions: { width, height },
    latitudeBounds: {
      topLatitude: mapInfo.MaxLatitude,
      bottomLatitude: mapInfo.MinLatitude,
    },
  };

  const adapter = createMockAdapter({
    width,
    height,
    mapInfo,
    mapSizeId: 1,
    rng: createLabelRng(seed),
  });
  const context = createExtendedMapContext({ width, height }, adapter, env);
  initializeStandardRuntime(context, { mapInfo, logPrefix: "[test]", storyEnabled: true });

  standardRecipe.run(context, env, createRealismEarthlikeConfig(), { log: () => {} });

  const plates = context.artifacts.get(foundationArtifacts.plates.id) as
    | { boundaryCloseness: Uint8Array; boundaryType: Uint8Array }
    | undefined;
  const topography = context.artifacts.get(morphologyArtifacts.topography.id) as
    | { landMask: Uint8Array }
    | undefined;

  expect(plates).toBeTruthy();
  expect(topography).toBeTruthy();

  const size = width * height;
  const mountainMask = new Uint8Array(size);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      mountainMask[i] = adapter.getTerrainType(x, y) === MOUNTAIN_TERRAIN ? 1 : 0;
    }
  }

  return { width, height, plates: plates!, landMask: topography!.landMask, mountainMask };
}

describe("M11/U14 morphology realism guardrails (earthlike preset)", () => {
  it("prevents mountain walls and keeps mountains correlated to convergent belts", () => {
    const width = 60;
    const height = 40;
    const seeds = [123, 424242, 9001];

    for (const seed of seeds) {
      const { plates, landMask, mountainMask } = runStandardAndReadInputs({ seed, width, height });

      const correlation = computeBeltToMountainCorrelation({
        width,
        height,
        landMask,
        mountainMask,
        boundaryType: plates.boundaryType,
        boundaryCloseness: plates.boundaryCloseness,
        nearClosenessMin: 64,
      });
      expect(correlation.nearConvergentLandTiles).toBeGreaterThan(0);
      expect(correlation.interiorLandTiles).toBeGreaterThan(0);
      expect(correlation.ratio).toBeGreaterThanOrEqual(3.0);

      const walliness = computeMountainWallinessOddQ({
        width,
        height,
        mountainMask,
        landMask,
        minComponentTiles: 20,
      });
      expect(walliness.walliness).toBeLessThanOrEqual(6.0);
    }
  });
});
