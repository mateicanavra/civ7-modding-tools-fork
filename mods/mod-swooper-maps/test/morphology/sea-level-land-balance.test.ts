import { describe, expect, it } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import standardRecipe, { type StandardRecipeConfig } from "../../src/recipes/standard/recipe.js";
import { initializeStandardRuntime } from "../../src/recipes/standard/runtime.js";
import { createRealismEarthlikeConfig } from "../../src/maps/presets/realism/earthlike.config.js";
import { resolveSeaLevel } from "../../src/domain/morphology/ops/compute-sea-level/rules/index.js";

function runAndMeasureLandWater(params: {
  seed: number;
  width: number;
  height: number;
  config: StandardRecipeConfig;
}): { landPct: number; waterPct: number; seaLevel: number } {
  const { seed, width, height, config } = params;

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

  standardRecipe.run(context, env, config, { log: () => {} });

  const topography = context.artifacts.get("artifact:morphology.topography") as
    | { landMask: Uint8Array; seaLevel: number }
    | undefined;
  expect(topography).toBeTruthy();

  const size = width * height;
  let landCount = 0;
  for (let i = 0; i < size; i++) {
    if ((topography!.landMask[i] ?? 0) === 1) landCount++;
  }
  const waterCount = size - landCount;

  return {
    seaLevel: topography!.seaLevel,
    landPct: (landCount / size) * 100,
    waterPct: (waterCount / size) * 100,
  };
}

describe("Sea-level selection (regression guard)", () => {
  it("can move toward more water (higher targetPct) to satisfy boundary share backstops", () => {
    const values: number[] = [];
    for (let i = 0; i < 100; i++) values.push(i);

    const elevation = new Int16Array(100);
    const boundaryCloseness = new Uint8Array(100);
    const upliftPotential = new Uint8Array(100);

    // Only the highest elevations are "boundary band"; to increase boundaryShare among land,
    // the solver must choose a higher seaLevel (i.e. more water / higher targetPct).
    for (let i = 0; i < 100; i++) {
      elevation[i] = i;
      boundaryCloseness[i] = i >= 90 ? 255 : 0;
    }

    const seaLevel = resolveSeaLevel({
      values,
      targetPct: 60,
      elevation,
      boundaryCloseness,
      upliftPotential,
      boundaryTarget: 0.6,
      continentalTarget: null,
      boundaryThreshold: 200,
      upliftThreshold: 128,
    });

    // The 60th-percentile seaLevel would be ~60; satisfying boundaryShare>=0.6 requires a much higher seaLevel.
    expect(seaLevel).toBeGreaterThan(70);
    expect(seaLevel).toBeGreaterThanOrEqual(83);
  });

  it("does not collapse to a land-dominant world when hypsometry backstops are enabled", () => {
    const seed = 123;
    const width = 100;
    const height = 64;

    const base = createRealismEarthlikeConfig();
    const baseline = runAndMeasureLandWater({ seed, width, height, config: base });

    // Earthlike should remain ocean-dominant by default (avoid accidental all-land worlds).
    expect(baseline.waterPct).toBeGreaterThanOrEqual(50);
    expect(baseline.waterPct).toBeLessThanOrEqual(80);

    const withBackstops: StandardRecipeConfig = {
      ...base,
      "morphology-pre": {
        ...base["morphology-pre"],
        advanced: {
          ...(base["morphology-pre"] as any)?.advanced,
          "landmass-plates": {
            ...((base["morphology-pre"] as any)?.advanced?.["landmass-plates"] ?? {}),
            seaLevel: {
              strategy: "default",
              config: {
                targetWaterPercent: 63,
                targetScalar: 1,
                variance: 1.5,
                boundaryShareTarget: 0.08,
                continentalFraction: 0.39,
              },
            },
          },
        },
      },
    };

    const backed = runAndMeasureLandWater({ seed, width, height, config: withBackstops });
    expect(backed.waterPct).toBeGreaterThanOrEqual(45);
    expect(backed.waterPct).toBeLessThanOrEqual(85);
    expect(backed.seaLevel).toBeGreaterThan(-1000);
  });
});
