import type { FoundationDirectionalityConfig } from "@mapgen/config";
import type { SwatchTypeEntry } from "@mapgen/domain/hydrology/climate/swatches/types.js";

export function chooseSwatchTypeWeighted(
  initialEntries: SwatchTypeEntry[],
  rand: (max: number, label: string) => number,
  directionality: FoundationDirectionalityConfig | null | undefined
): string {
  let entries = initialEntries;

  // Apply directionality adjustments
  const DIR = directionality || {};
  const COH = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
  if (COH > 0) {
    const windDeg = (DIR?.primaryAxes?.windBiasDeg ?? 0) | 0;
    const plateDeg = (DIR?.primaryAxes?.plateAxisDeg ?? 0) | 0;
    const wRad = (windDeg * Math.PI) / 180;
    const pRad = (plateDeg * Math.PI) / 180;
    const alignZonal = Math.abs(Math.cos(wRad));
    const alignPlate = Math.abs(Math.cos(pRad));

    entries = entries.map((entry) => {
      let mul = 1;
      if (entry.key === "macroDesertBelt") {
        mul *= 1 + 0.4 * COH * alignZonal;
      } else if (entry.key === "equatorialRainbelt") {
        mul *= 1 + 0.25 * COH * alignZonal;
      } else if (entry.key === "mountainForests") {
        mul *= 1 + 0.2 * COH * alignPlate;
      } else if (entry.key === "greatPlains") {
        mul *= 1 + 0.2 * COH * alignZonal;
      }
      return { key: entry.key, w: Math.max(0, Math.round(entry.w * mul)) };
    });
  }

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
