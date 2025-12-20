import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { bootstrap } from "@mapgen/index.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import { getStoryTags } from "@mapgen/domain/narrative/tags/index.js";
import { storyTagContinentalMargins, storyTagHotspotTrails, storyTagRiftValleys } from "@mapgen/domain/narrative/tagging/index.js";

describe("smoke: minimal story parity (margins, hotspots)", () => {
  it("emits non-empty story tags for margins/hotspots and fails fast for rifts without foundation", () => {
    // Deterministic RNG for stable assertions.
    let seed = 1 >>> 0;
    const adapter = createMockAdapter({
      width: 128,
      height: 80,
      mapSizeId: 1,
      mapInfo: {
        GridWidth: 128,
        GridHeight: 80,
        MinLatitude: -80,
        MaxLatitude: 80,
        NumNaturalWonders: 0,
        LakeGenerationFrequency: 0,
        PlayersLandmass1: 4,
        PlayersLandmass2: 4,
        StartSectorRows: 4,
        StartSectorCols: 4,
      },
      rng: (max) => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return max > 0 ? seed % max : 0;
      },
    });

    // Start with a deep ocean, then carve a large central continent.
    adapter.fillWater(true);
    for (let y = 20; y < 60; y++) {
      for (let x = 32; x < 96; x++) {
        adapter.setWater(x, y, false);
      }
    }

    const config = bootstrap({
      overrides: {
        margins: {
          activeFraction: 0.3,
          passiveFraction: 0.3,
          minSegmentLength: 8,
        },
        story: {
          hotspot: {
            maxTrails: 4,
            steps: 8,
            stepLen: 2,
            minDistFromLand: 3,
            minTrailSeparation: 8,
          },
          rift: {
            maxRiftsPerMap: 2,
            lineSteps: 12,
            stepLen: 2,
            shoulderWidth: 1,
          },
        },
      },
    });

    const ctx = createExtendedMapContext({ width: 128, height: 80 }, adapter, config);
    storyTagContinentalMargins(ctx);
    storyTagHotspotTrails(ctx);
    expect(() => storyTagRiftValleys(ctx)).toThrow("FoundationContext");

    const tags = getStoryTags(ctx);
    expect(tags.activeMargin.size + tags.passiveShelf.size).toBeGreaterThan(0);
    expect(tags.hotspot.size).toBeGreaterThan(0);
  });
});
