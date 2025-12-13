import { describe, it, expect, beforeEach } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { bootstrap, MapOrchestrator, getStoryTags } from "../../src/index.js";
import { resetTunablesForTest } from "../../src/bootstrap/tunables.js";
import { resetStoryTags } from "../../src/story/tags.js";
import { resetStoryOverlays } from "../../src/story/overlays.js";

describe("smoke: minimal story parity (margins, hotspots, rifts)", () => {
  beforeEach(() => {
    resetTunablesForTest();
    resetStoryTags();
    resetStoryOverlays();
  });

  it("emits non-empty story tags when enabled", () => {
    // Deterministic RNG for stable assertions.
    let seed = 1 >>> 0;
    const adapter = createMockAdapter({
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
      stageConfig: {
        storySeed: true,
        storyHotspots: true,
        storyRifts: true,
      },
      overrides: {
        foundation: {
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
      },
    });

    const orchestrator = new MapOrchestrator(config, {
      adapter,
      logPrefix: "[TEST]",
    });

    orchestrator.generateMap();

    const tags = getStoryTags();
    expect(tags.activeMargin.size + tags.passiveShelf.size).toBeGreaterThan(0);
    expect(tags.hotspot.size).toBeGreaterThan(0);
    expect(tags.riftLine.size).toBeGreaterThan(0);
    expect(tags.riftShoulder.size).toBeGreaterThan(0);
  });
});

