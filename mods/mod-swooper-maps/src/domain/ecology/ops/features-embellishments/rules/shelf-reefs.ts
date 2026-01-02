import type { EngineAdapter } from "@civ7/adapter";

export function planShelfReefs(params: {
  adapter: EngineAdapter;
  reefIndex: number;
  inBounds: (x: number, y: number) => boolean;
  rand: (label: string, max: number) => number;
  shelfReefChance: number;
  shelfReefRadius: number;
  passiveShelf: Set<string>;
  canPlace: (x: number, y: number, featureIdx: number) => boolean;
  place: (x: number, y: number, featureIdx: number) => void;
}): void {
  const {
    adapter,
    reefIndex,
    inBounds,
    rand,
    shelfReefChance,
    shelfReefRadius,
    passiveShelf,
    canPlace,
    place,
  } = params;

  for (const key of passiveShelf) {
    const [sx, sy] = key.split(",").map(Number);

    for (let dy = -shelfReefRadius; dy <= shelfReefRadius; dy++) {
      for (let dx = -shelfReefRadius; dx <= shelfReefRadius; dx++) {
        const nx = sx + dx;
        const ny = sy + dy;
        if (!inBounds(nx, ny)) continue;
        if (!adapter.isWater(nx, ny)) continue;
        if (!canPlace(nx, ny, reefIndex)) continue;

        if (rand("Shelf Reef", 100) < shelfReefChance) {
          place(nx, ny, reefIndex);
        }
      }
    }
  }
}
