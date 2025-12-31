import { describe, expect, it } from "bun:test";

import { biomeSymbolFromIndex, classifyBiomes } from "../../src/domain/ecology/ops/classify-biomes.js";

describe("classifyBiomes operation", () => {
  it("maps temperature + moisture into biome symbols", () => {
    const width = 3;
    const height = 2;
    const size = width * height;

    const rainfall = new Uint8Array([210, 130, 70, 35, 180, 50]);
    const humidity = new Uint8Array([180, 80, 30, 20, 160, 10]);
    const elevation = new Int16Array([0, 200, 500, 800, 100, 0]);
    const latitude = new Float32Array([0, 10, 25, 40, 65, 15]);
    const landMask = new Uint8Array([1, 1, 1, 1, 1, 0]);

    const result = classifyBiomes.run(
      {
        width,
        height,
        rainfall,
        humidity,
        elevation,
        latitude,
        landMask,
      },
      classifyBiomes.defaultConfig
    );

    expect(result.biomeIndex.length).toBe(size);
    expect(result.vegetationDensity.length).toBe(size);
    expect(result.effectiveMoisture.length).toBe(size);

    expect(biomeSymbolFromIndex(result.biomeIndex[0]!)).toBe("tropicalRainforest");
    expect(biomeSymbolFromIndex(result.biomeIndex[2]!)).toBe("temperateDry");
    expect(biomeSymbolFromIndex(result.biomeIndex[3]!)).toBe("desert");
    expect(biomeSymbolFromIndex(result.biomeIndex[4]!)).toBe("snow");
    expect(result.biomeIndex[5]).toBe(255);
  });
});
