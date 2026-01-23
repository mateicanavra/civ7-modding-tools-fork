import { describe, expect, it } from "bun:test";

import { planIslandChains } from "../../src/domain/morphology/ops/index.js";

describe("morphology/plan-island-chains", () => {
  it("treats microcontinentChance as a per-map roll (not per-tile spam)", () => {
    const width = 96;
    const height = 64;
    const size = width * height;

    // Start from an all-ocean world so the microcontinent reservoir has candidates.
    const landMask = new Uint8Array(size);
    const boundaryCloseness = new Uint8Array(size);
    const boundaryType = new Uint8Array(size);
    const volcanism = new Uint8Array(size);

    const result = planIslandChains.run(
      {
        width,
        height,
        landMask,
        boundaryCloseness,
        boundaryType,
        volcanism,
        rngSeed: 1337,
      },
      {
        strategy: "default",
        config: {
          islands: {
            // Disable normal island seeding so the test isolates microcontinents.
            fractalThresholdPercent: 85,
            minDistFromLandRadius: 4,
            baseIslandDenNearActive: 999999,
            baseIslandDenElse: 999999,
            hotspotSeedDenom: 999999,
            clusterMax: 10,
            microcontinentChance: 1,
          },
        },
      }
    );

    expect(result.edits.length).toBeGreaterThanOrEqual(20);
    // If microcontinents were seeded per-tile, we'd see hundreds/thousands of edits.
    expect(result.edits.length).toBeLessThanOrEqual(200);
    expect(result.edits.some((edit) => edit.kind === "peak")).toBe(true);
  });
});
