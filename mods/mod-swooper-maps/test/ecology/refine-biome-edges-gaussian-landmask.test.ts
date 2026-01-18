import { describe, expect, it } from "bun:test";
import ecology from "@mapgen/domain/ecology/ops";

describe("refineBiomeEdges (gaussian)", () => {
  it("does not smear water sentinel biomes into land", () => {
    const width = 4;
    const height = 3;
    const size = width * height;
    const landMask = new Uint8Array(size).fill(1);
    const biomeIndex = new Uint8Array(size).fill(7);

    for (let y = 0; y < height; y++) {
      const idx = y * width;
      landMask[idx] = 0;
      biomeIndex[idx] = 255;
    }

    const out = ecology.ops.refineBiomeEdges.run(
      { width, height, biomeIndex, landMask },
      { strategy: "gaussian", config: { radius: 1, iterations: 1 } }
    );

    for (let i = 0; i < size; i++) {
      if (landMask[i] === 0) {
        expect(out.biomeIndex[i]).toBe(255);
      } else {
        expect(out.biomeIndex[i]).not.toBe(255);
      }
    }
  });
});
