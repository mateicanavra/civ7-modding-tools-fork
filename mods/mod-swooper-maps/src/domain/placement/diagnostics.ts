import type { EngineAdapter } from "@civ7/adapter";
import { DEV } from "@swooper/mapgen-core";
import { HILL_TERRAIN, MOUNTAIN_TERRAIN, getTerrainSymbol } from "@swooper/mapgen-core";

export function logTerrainStats(adapter: EngineAdapter, width: number, height: number, stage: string): void {
  if (!DEV.ENABLED) return;
  let flat = 0;
  let hill = 0;
  let mtn = 0;
  let water = 0;
  const total = width * height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) {
        water++;
        continue;
      }
      const t = adapter.getTerrainType(x, y);
      if (t === MOUNTAIN_TERRAIN) mtn++;
      else if (t === HILL_TERRAIN) hill++;
      else flat++;
    }
  }

  const land = Math.max(1, flat + hill + mtn);
  console.log(`[Placement] Stats (${stage}):`);
  console.log(`  Water: ${((water / total) * 100).toFixed(1)}%`);
  console.log(`  Land:  ${((land / total) * 100).toFixed(1)}% (${land} tiles)`);
  console.log(`    Mtn:  ${((mtn / land) * 100).toFixed(1)}%`);
  console.log(`    Hill: ${((hill / land) * 100).toFixed(1)}%`);
  console.log(`    Flat: ${((flat / land) * 100).toFixed(1)}%`);
}

export function logAsciiMap(adapter: EngineAdapter, width: number, height: number): void {
  if (!DEV.ENABLED) return;
  console.log("[Placement] Final Map ASCII:");

  for (let y = height - 1; y >= 0; y--) {
    let row = "";
    if (y % 2 !== 0) row += " ";
    for (let x = 0; x < width; x++) {
      const t = adapter.getTerrainType(x, y);
      row += getTerrainSymbol(t) + " ";
    }
    console.log(row);
  }
}

