import type { SwatchTypeEntry } from "@mapgen/domain/hydrology/climate/swatches/types.js";

export function chooseSwatchTypeWeighted(
  initialEntries: SwatchTypeEntry[],
  rand: (max: number, label: string) => number
): string {
  let entries = initialEntries;

  const totalW = entries.reduce((sum, entry) => sum + entry.w, 0) || 1;
  let roll = rand(totalW, "SwatchType");
  let chosenKey = entries[0]?.key || "macroDesertBelt";

  for (const entry of entries) {
    if (roll < entry.w) {
      chosenKey = entry.key;
      break;
    }
    roll -= entry.w;
  }

  return chosenKey;
}
