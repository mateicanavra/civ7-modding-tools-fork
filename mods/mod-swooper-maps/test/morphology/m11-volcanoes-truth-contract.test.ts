import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import standardRecipe from "../../src/recipes/standard/recipe.js";
import { initializeStandardRuntime } from "../../src/recipes/standard/runtime.js";
import { swooperEarthlikeConfig } from "../../src/maps/presets/swooper-earthlike.config.js";

type MorphologyTopographyArtifact = {
  landMask: Uint8Array;
};

type VolcanoKind = "subductionArc" | "rift" | "hotspot";
type MorphologyVolcanoesArtifact = {
  volcanoMask: Uint8Array;
  volcanoes: Array<{ tileIndex: number; kind: VolcanoKind; strength01: number }>;
};

describe("m11 volcanoes truth contract", () => {
  it("enforces land-only, stable ordering, and mask/list consistency", () => {
    const width = 20;
    const height = 12;
    const seed = 424242;

    const mapInfo = {
      GridWidth: width,
      GridHeight: height,
      MinLatitude: -60,
      MaxLatitude: 60,
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
      trace: { steps: {} },
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

    standardRecipe.run(context, env, swooperEarthlikeConfig, { log: () => {} });

    const topography = context.artifacts.get("artifact:morphology.topography") as MorphologyTopographyArtifact | undefined;
    const volcanoes = context.artifacts.get("artifact:morphology.volcanoes") as MorphologyVolcanoesArtifact | undefined;
    expect(topography?.landMask).toBeInstanceOf(Uint8Array);
    expect(volcanoes?.volcanoMask).toBeInstanceOf(Uint8Array);
    expect(Array.isArray(volcanoes?.volcanoes)).toBe(true);

    const size = width * height;
    const landMask = topography!.landMask;
    const volcanoMask = volcanoes!.volcanoMask;
    const list = volcanoes!.volcanoes;

    expect(landMask.length).toBe(size);
    expect(volcanoMask.length).toBe(size);

    let lastTileIndex = -1;
    const seen = new Set<number>();
    for (const entry of list) {
      expect(Number.isInteger(entry.tileIndex)).toBe(true);
      expect(entry.tileIndex).toBeGreaterThanOrEqual(0);
      expect(entry.tileIndex).toBeLessThan(size);
      expect(entry.tileIndex).toBeGreaterThan(lastTileIndex);
      lastTileIndex = entry.tileIndex;

      expect(entry.kind === "subductionArc" || entry.kind === "rift" || entry.kind === "hotspot").toBe(true);
      expect(entry.strength01).toBeGreaterThanOrEqual(0);
      expect(entry.strength01).toBeLessThanOrEqual(1);

      expect(landMask[entry.tileIndex]).toBe(1);
      expect(volcanoMask[entry.tileIndex]).toBe(1);

      expect(seen.has(entry.tileIndex)).toBe(false);
      seen.add(entry.tileIndex);
    }

    let maskCount = 0;
    for (let i = 0; i < volcanoMask.length; i++) if (volcanoMask[i] === 1) maskCount++;
    expect(maskCount).toBe(list.length);
  });
});

