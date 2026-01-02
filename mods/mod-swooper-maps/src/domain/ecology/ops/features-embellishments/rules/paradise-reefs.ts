import type { EngineAdapter } from "@civ7/adapter";

export function planParadiseReefs(params: {
  adapter: EngineAdapter;
  reefIndex: number;
  inBounds: (x: number, y: number) => boolean;
  rand: (label: string, max: number) => number;
  paradiseReefChance: number;
  paradiseReefRadius: number;
  hotspotParadise: Set<string>;
  canPlace: (x: number, y: number, featureIdx: number) => boolean;
  place: (x: number, y: number, featureIdx: number) => void;
}): void {
  const {
    adapter,
    reefIndex,
    inBounds,
    rand,
    paradiseReefChance,
    paradiseReefRadius,
    hotspotParadise,
    canPlace,
    place,
  } = params;

  for (const key of hotspotParadise) {
    const [cx, cy] = key.split(",").map(Number);

    for (let dy = -paradiseReefRadius; dy <= paradiseReefRadius; dy++) {
      for (let dx = -paradiseReefRadius; dx <= paradiseReefRadius; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!inBounds(nx, ny)) continue;
        if (!adapter.isWater(nx, ny)) continue;
        if (!canPlace(nx, ny, reefIndex)) continue;

        if (rand("Paradise Reef", 100) < paradiseReefChance) {
          place(nx, ny, reefIndex);
        }
      }
    }
  }
}
