import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { EngineAdapter } from "@civ7/adapter";
import { writeHeightfield } from "@mapgen/core/types.js";
import { OCEAN_TERRAIN, FLAT_TERRAIN } from "@mapgen/core/terrain-constants.js";

export function applyLandmaskToTerrain(
  width: number,
  height: number,
  landMask: Uint8Array,
  ctx?: ExtendedMapContext | null,
  adapter?: Pick<EngineAdapter, "setTerrainType"> | null
): void {
  const setTerrain = (x: number, y: number, terrain: number, isLand: boolean): void => {
    if (ctx) {
      writeHeightfield(ctx, x, y, {
        terrain,
        elevation: isLand ? 10 : -1,
        isLand,
      });
    } else if (adapter) {
      adapter.setTerrainType(x, y, terrain);
    }
  };

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const isLand = landMask[idx] === 1;
      setTerrain(x, y, isLand ? FLAT_TERRAIN : OCEAN_TERRAIN, isLand);
    }
  }
}

