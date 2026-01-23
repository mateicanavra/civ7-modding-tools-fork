import { describe, expect, it } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import standardRecipe from "../../src/recipes/standard/recipe.js";
import { initializeStandardRuntime } from "../../src/recipes/standard/runtime.js";
import { createRealismEarthlikeConfig } from "../../src/maps/presets/realism/earthlike.config.js";
import { foundationArtifacts } from "../../src/recipes/standard/stages/foundation/artifacts.js";

function pQuantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const clamped = Math.max(0, Math.min(1, q));
  if (clamped <= 0) return sorted[0] ?? 0;
  if (clamped >= 1) return sorted[sorted.length - 1] ?? 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(clamped * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

function runStandardAndReadFoundation(params: { seed: number; width: number; height: number }) {
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
    | {
        id: Int16Array;
        boundaryCloseness: Uint8Array;
        boundaryType: Uint8Array;
        upliftPotential: Uint8Array;
        riftPotential: Uint8Array;
        tectonicStress: Uint8Array;
        shieldStability: Uint8Array;
        volcanism: Uint8Array;
      }
    | undefined;
  const plateGraph = context.artifacts.get(foundationArtifacts.plateGraph.id) as
    | { plates: ReadonlyArray<unknown> }
    | undefined;
  const plateTopology = context.artifacts.get(foundationArtifacts.plateTopology.id) as
    | { plates: ReadonlyArray<{ area: number }> }
    | undefined;

  expect(plates).toBeTruthy();
  expect(plateGraph).toBeTruthy();
  expect(plateTopology).toBeTruthy();

  return { width, height, plates: plates!, plateGraph: plateGraph!, plateTopology: plateTopology! };
}

describe("M11/U14 foundation realism invariants (earthlike preset)", () => {
  it("enforces hard + distribution invariants across seeds (no rendering)", () => {
    const width = 60;
    const height = 40;
    const seeds = [123, 424242, 9001];

    for (const seed of seeds) {
      const runA = runStandardAndReadFoundation({ seed, width, height });
      const runB = runStandardAndReadFoundation({ seed, width, height });

      // FND-HARD-DETERMINISM-PLATES
      expect(runA.plates.id).toEqual(runB.plates.id);
      expect(runA.plates.boundaryCloseness).toEqual(runB.plates.boundaryCloseness);
      expect(runA.plates.boundaryType).toEqual(runB.plates.boundaryType);
      expect(runA.plates.upliftPotential).toEqual(runB.plates.upliftPotential);
      expect(runA.plates.riftPotential).toEqual(runB.plates.riftPotential);
      expect(runA.plates.tectonicStress).toEqual(runB.plates.tectonicStress);
      expect(runA.plates.shieldStability).toEqual(runB.plates.shieldStability);
      expect(runA.plates.volcanism).toEqual(runB.plates.volcanism);

      const plates = runA.plates;
      const size = width * height;

      // FND-HARD-PLATE-ID-RANGE
      let minPlateId = Number.POSITIVE_INFINITY;
      let maxPlateId = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < size; i++) {
        const v = plates.id[i] ?? -1;
        if (v < minPlateId) minPlateId = v;
        if (v > maxPlateId) maxPlateId = v;
      }
      const plateCount = (runA.plateGraph.plates.length | 0) || 0;
      expect(minPlateId).toBeGreaterThanOrEqual(0);
      expect(maxPlateId).toBeLessThan(plateCount);

      // FND-HARD-BELT-EXISTS
      let sawBoundaryCloseness = false;
      let sawBoundaryType = false;
      for (let i = 0; i < size; i++) {
        if ((plates.boundaryCloseness[i] ?? 0) > 0) sawBoundaryCloseness = true;
        if ((plates.boundaryType[i] ?? 0) !== 0) sawBoundaryType = true;
        if (sawBoundaryCloseness && sawBoundaryType) break;
      }
      expect(sawBoundaryCloseness).toBe(true);
      expect(sawBoundaryType).toBe(true);

      // FND-HARD-REGIME-WIDTH-NOT-CAPPED
      let sawLowClosenessTyped = false;
      for (let i = 0; i < size; i++) {
        if ((plates.boundaryType[i] ?? 0) === 0) continue;
        if ((plates.boundaryCloseness[i] ?? 0) <= 64) {
          sawLowClosenessTyped = true;
          break;
        }
      }
      expect(sawLowClosenessTyped).toBe(true);

      // FND-DIST-BOUNDARY-BAND-FRACTION
      const boundaryBandThreshold = 128;
      let boundaryBandTiles = 0;
      for (let i = 0; i < size; i++) {
        if ((plates.boundaryCloseness[i] ?? 0) >= boundaryBandThreshold) boundaryBandTiles += 1;
      }
      const boundaryBandFraction = boundaryBandTiles / size;
      expect(boundaryBandFraction).toBeGreaterThanOrEqual(0.01);
      expect(boundaryBandFraction).toBeLessThanOrEqual(0.45);

      // FND-DIST-PLATE-AREA-TAIL
      const areas = runA.plateTopology.plates.map((p) => p.area | 0).slice().sort((a, b) => a - b);
      const p50 = pQuantile(areas, 0.5);
      const p90 = pQuantile(areas, 0.9);
      const ratio = p50 > 0 ? p90 / p50 : 0;
      expect(ratio).toBeGreaterThanOrEqual(1.4);
    }
  });
});
