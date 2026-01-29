import { describe, expect, it } from "bun:test";

import { defaultStrategy } from "../src/domain/hydrology/ops/project-river-network/strategies/default.js";

describe("hydrology/project-river-network (default strategy)", () => {
  it("produces no rivers when all land discharge is zero", () => {
    const width = 4;
    const height = 3;
    const size = width * height;

    const out = defaultStrategy.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        discharge: new Float32Array(size).fill(0),
      },
      {
        widthCoeff: 0.25,
        dischargeExponent: 0.5,
        slopeWidthExponent: 0,
        confinementWidthExponent: 0,
        minorWidthTiles: 0.6,
        majorWidthTiles: 1.15,
        majorSlopeMax01: 1,
        majorConfinementMax01: 1,
        navigableWidthTiles: 1.75,
        navigableSlopeMax01: 1,
        navigableConfinementMax01: 1,
      }
    );

    expect(Array.from(out.riverClass)).toEqual(new Array(size).fill(0));
    expect(Array.from(out.navigableMask ?? new Uint8Array(size))).toEqual(new Array(size).fill(0));
  });

  it("does not classify zero-discharge land as rivers when some tiles have discharge", () => {
    const width = 4;
    const height = 3;
    const size = width * height;

    const discharge = new Float32Array(size).fill(0);
    discharge[0] = 10;

    const out = defaultStrategy.run(
      {
        width,
        height,
        landMask: new Uint8Array(size).fill(1),
        discharge,
      },
      {
        widthCoeff: 0.5,
        dischargeExponent: 0.5,
        slopeWidthExponent: 0,
        confinementWidthExponent: 0,
        minorWidthTiles: 0.6,
        majorWidthTiles: 1.15,
        majorSlopeMax01: 1,
        majorConfinementMax01: 1,
        navigableWidthTiles: 1.75,
        navigableSlopeMax01: 1,
        navigableConfinementMax01: 1,
      }
    );

    expect(out.riverClass[0]).toBe(2);
    expect(Array.from(out.riverClass.slice(1))).toEqual(new Array(size - 1).fill(0));
  });
  it("classifies rivers monotonically with discharge when slope/confinement are zero", () => {
    const width = 5;
    const height = 1;
    const size = width * height;

    const landMask = new Uint8Array(size).fill(1);
    const slope01 = new Float32Array(size).fill(0);
    const confinement01 = new Float32Array(size).fill(0);
    const discharge = new Float32Array([0, 1, 5, 20, 60]);

    const out = defaultStrategy.run(
      { width, height, landMask, discharge, slope01, confinement01 },
      {
        widthCoeff: 0.25,
        dischargeExponent: 0.5,
        slopeWidthExponent: 0,
        confinementWidthExponent: 0,
        minorWidthTiles: 0.6,
        majorWidthTiles: 1.15,
        majorSlopeMax01: 1,
        majorConfinementMax01: 1,
        navigableWidthTiles: 1.75,
        navigableSlopeMax01: 1,
        navigableConfinementMax01: 1,
      }
    );

    expect(out.channelWidthTiles).toBeInstanceOf(Float32Array);
    expect(out.channelWidthTiles.length).toBe(size);
    expect(Array.from(out.riverClass)).toEqual([0, 0, 0, 1, 2]);
  });

  it("suppresses major rivers when slope/confinement exceed major gates", () => {
    const width = 3;
    const height = 1;
    const size = width * height;

    const landMask = new Uint8Array(size).fill(1);
    const discharge = new Float32Array([100, 100, 100]);
    const slope01 = new Float32Array([0.1, 0.9, 0.1]);
    const confinement01 = new Float32Array([0.1, 0.1, 0.95]);

    const out = defaultStrategy.run(
      { width, height, landMask, discharge, slope01, confinement01 },
      {
        widthCoeff: 0.2,
        dischargeExponent: 0.5,
        slopeWidthExponent: 0,
        confinementWidthExponent: 0,
        minorWidthTiles: 0.6,
        majorWidthTiles: 1.15,
        majorSlopeMax01: 0.5,
        majorConfinementMax01: 0.8,
        navigableWidthTiles: 1.75,
        navigableSlopeMax01: 0.35,
        navigableConfinementMax01: 0.7,
      }
    );

    expect(Array.from(out.riverClass)).toEqual([2, 1, 1]);
  });
});
