import { describe, expect, it } from "bun:test";

import {
  planFloodplains,
  planStarts,
  planWonders,
} from "../../src/domain/placement/index.js";
import { runOpValidated } from "../support/compiler-helpers.js";

describe("placement plan operations", () => {
  it("plans wonders with plus-one default", () => {
    const result = runOpValidated(planWonders, { mapInfo: { NumNaturalWonders: 2 } }, {
      strategy: "default",
      config: {},
    });
    expect(result.wondersCount).toBe(3);
  });

  it("plans wonders without plus-one when disabled", () => {
    const result = runOpValidated(planWonders, { mapInfo: { NumNaturalWonders: 2 } }, {
      strategy: "default",
      config: { wondersPlusOne: false },
    });
    expect(result.wondersCount).toBe(2);
  });

  it("plans floodplains respecting min/max", () => {
    const result = runOpValidated(planFloodplains, {}, { strategy: "default", config: {} });
    expect(result.minLength).toBe(4);
    expect(result.maxLength).toBe(10);
  });

  it("normalizes floodplains maxLength >= minLength", () => {
    const result = runOpValidated(planFloodplains, {}, {
      strategy: "default",
      config: { minLength: 10, maxLength: 4 },
    });
    expect(result.minLength).toBe(10);
    expect(result.maxLength).toBe(10);
  });

  it("merges start overrides", () => {
    const baseStarts = {
      playersLandmass1: 1,
      playersLandmass2: 1,
      westContinent: { west: 0, east: 10, south: 0, north: 10, continent: 0 },
      eastContinent: { west: 10, east: 20, south: 0, north: 10, continent: 1 },
      startSectorRows: 2,
      startSectorCols: 2,
      startSectors: [1, 2],
    };

    const result = runOpValidated(planStarts, { baseStarts }, {
      strategy: "default",
      config: {
        overrides: {
          playersLandmass1: 3,
          startSectorRows: 3,
          startSectors: [5],
        },
      },
    });

    expect(result.playersLandmass1).toBe(3);
    expect(result.playersLandmass2).toBe(1);
    expect(result.startSectorRows).toBe(3);
    expect(result.startSectors).toEqual([5]);
  });
});
