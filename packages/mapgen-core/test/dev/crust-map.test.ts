/**
 * Crust map visualization harness.
 *
 * Generates a deterministic plate field, assigns crust types, and renders
 * a compact ASCII map (C = continental, o = oceanic) for quick inspection.
 */

import { describe, it, expect } from "bun:test";
import { renderAsciiGrid } from "../../src/dev/index.js";
import { assignCrustTypes, buildPlateTopology, CrustType } from "../../src/world/index.js";
import { computePlatesVoronoi } from "../../src/world/index.js";
import type { CrustConfig } from "../../src/world/index.js";
import type { RngFunction } from "../../src/world/types.js";

function createDeterministicRng(seed = 1337): RngFunction {
  let state = seed >>> 0;
  return (max: number) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    if (max <= 0 || Number.isNaN(max)) return 0;
    return state % max;
  };
}

describe("Crust map harness", () => {
  it("renders continental vs oceanic plates as ASCII for manual review", () => {
    const width = 96;
    const height = 64;

    const plateRng = createDeterministicRng(42);
    const crustRng = createDeterministicRng(4242);

    const plates = computePlatesVoronoi(width, height, { count: 18 }, { rng: plateRng });
    const graph = buildPlateTopology(plates.plateId, width, height, plates.plateRegions.length);

    const crustConfig: CrustConfig = {
      continentalFraction: 0.42,
      clusteringBias: 0.72,
      microcontinentChance: 0.05,
    };

    const crustTypes = assignCrustTypes(graph, crustRng, crustConfig);

    let continentalTiles = 0;
    let oceanTiles = 0;
    for (let i = 0; i < plates.plateId.length; i++) {
      const plateId = plates.plateId[i];
      const crust = plateId >= 0 && plateId < crustTypes.length ? crustTypes[plateId] : 0;
      if (crust === CrustType.CONTINENTAL) continentalTiles++;
      else oceanTiles++;
    }

    const rows = renderAsciiGrid({
      width,
      height,
      sampleStep: 2,
      cellFn: (x, y) => {
        const idx = y * width + x;
        const plateId = plates.plateId[idx];
        const crust = plateId >= 0 && plateId < crustTypes.length ? crustTypes[plateId] : 0;
        const base = crust === CrustType.CONTINENTAL ? "C" : "o";

        return { base };
      },
    });

    // Keep output compact for CI logs; primary use is local inspection
    console.log("[crust harness] C = continental, o = oceanic");
    console.log(rows.join("\n"));

    expect(crustTypes.length).toBe(plates.plateRegions.length);
    expect(continentalTiles).toBeGreaterThan(0);
    expect(oceanTiles).toBeGreaterThan(0);
  });
});
