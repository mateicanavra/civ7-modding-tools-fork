import { describe, it, expect, beforeEach } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { parseConfig } from "../../src/config/index.js";
import { bindTunables, resetTunablesForTest } from "../../src/bootstrap/tunables.js";
import { createExtendedMapContext } from "../../src/core/types.js";
import { storyTagPaleoHydrology } from "../../src/story/paleo.js";
import { COAST_TERRAIN, FLAT_TERRAIN } from "../../src/core/terrain-constants.js";

describe("story/paleo", () => {
  beforeEach(() => {
    resetTunablesForTest();
    bindTunables(
      parseConfig({
        climate: {
          story: {
            paleo: {
              maxDeltas: 1,
              deltaFanRadius: 1,
              deltaMarshChance: 0,
              maxOxbows: 0,
              maxFossilChannels: 0,
            },
          },
        },
      })
    );
  });

  it("applies a delta rainfall fan on coastal river-adjacent tiles", () => {
    const width = 12;
    const height = 8;
    const adapter = createMockAdapter({
      width,
      height,
      defaultTerrainType: FLAT_TERRAIN,
      defaultRainfall: 50,
    });

    // Water row at y=0 (coast) so y=1 becomes coastal land.
    for (let x = 0; x < width; x++) {
      (adapter as any).setWater(x, 0, true);
      adapter.setTerrainType(x, 0, COAST_TERRAIN);
    }

    // Treat everything as "adjacent to rivers" for this unit test.
    (adapter as any).isAdjacentToRivers = () => true;

    const ctx = createExtendedMapContext({ width, height }, adapter, parseConfig({}));
    ctx.buffers?.climate?.rainfall?.fill(50);
    ctx.fields?.rainfall?.fill(50);

    const summary = storyTagPaleoHydrology(ctx);
    expect(summary.deltas).toBe(1);
    expect(adapter.getRainfall(1, 1)).toBeGreaterThan(50);
  });
});
