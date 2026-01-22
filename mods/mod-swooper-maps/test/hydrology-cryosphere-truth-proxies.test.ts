import { describe, it, expect } from "bun:test";
import computeCryosphereState from "../src/domain/hydrology/ops/compute-cryosphere-state/index.js";

describe("hydrology cryosphere truth proxies", () => {
  it("is deterministic and not solely temperature-derived", () => {
    const width = 2;
    const height = 1;

    const landMask = new Uint8Array([1, 1]);
    const surfaceTemperatureC = new Float32Array([-5, -5]);
    const rainfall = new Uint8Array([200, 0]);

    const first = computeCryosphereState.run(
      { width, height, landMask, surfaceTemperatureC, rainfall },
      computeCryosphereState.defaultConfig
    );
    const second = computeCryosphereState.run(
      { width, height, landMask, surfaceTemperatureC, rainfall },
      computeCryosphereState.defaultConfig
    );

    expect(Array.from(first.freezeIndex)).toEqual(Array.from(second.freezeIndex));
    expect(Array.from(first.snowCover)).toEqual(Array.from(second.snowCover));
    expect(Array.from(first.groundIce01)).toEqual(Array.from(second.groundIce01));
    expect(Array.from(first.permafrost01)).toEqual(Array.from(second.permafrost01));
    expect(Array.from(first.meltPotential01)).toEqual(Array.from(second.meltPotential01));

    expect(first.snowCover[0]).not.toBe(first.snowCover[1]);
    expect(first.groundIce01[0]).not.toBe(first.groundIce01[1]);
  });
});

