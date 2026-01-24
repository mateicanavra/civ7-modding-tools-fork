import { describe, it, expect } from "bun:test";
import computeSubstrate from "../../src/domain/morphology/ops/compute-substrate/index.js";

describe("m11 substrate (material-driven)", () => {
  it("changes erodibilityK when crust/material differs (uplift/rift held constant)", () => {
    const width = 2;
    const height = 1;

    const upliftPotential = new Uint8Array([128, 128]);
    const riftPotential = new Uint8Array([0, 0]);
    const boundaryCloseness = new Uint8Array([0, 0]);
    const boundaryType = new Uint8Array([0, 0]);
    const crustType = new Uint8Array([1, 0]);
    const crustAge = new Uint8Array([0, 0]);

    const first = computeSubstrate.run(
      {
        width,
        height,
        upliftPotential,
        riftPotential,
        boundaryCloseness,
        boundaryType,
        crustType,
        crustAge,
      },
      computeSubstrate.defaultConfig
    );

    const second = computeSubstrate.run(
      {
        width,
        height,
        upliftPotential,
        riftPotential,
        boundaryCloseness,
        boundaryType,
        crustType,
        crustAge,
      },
      computeSubstrate.defaultConfig
    );

    expect(Array.from(first.erodibilityK)).toEqual(Array.from(second.erodibilityK));
    expect(Array.from(first.sedimentDepth)).toEqual(Array.from(second.sedimentDepth));

    expect(first.erodibilityK[0]).not.toBe(first.erodibilityK[1]);
  });
});

