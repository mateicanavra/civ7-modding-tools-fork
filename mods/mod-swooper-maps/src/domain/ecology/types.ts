export const BIOME_SYMBOL_ORDER = [
  "snow",
  "tundra",
  "boreal",
  "temperateDry",
  "temperateHumid",
  "tropicalSeasonal",
  "tropicalRainforest",
  "desert",
] as const;

export type BiomeSymbol = (typeof BIOME_SYMBOL_ORDER)[number];

export const BIOME_SYMBOL_TO_INDEX: Readonly<Record<BiomeSymbol, number>> = Object.freeze(
  BIOME_SYMBOL_ORDER.reduce(
    (acc, symbol, index) => {
      acc[symbol] = index;
      return acc;
    },
    {} as Record<BiomeSymbol, number>
  )
);

export function biomeSymbolFromIndex(index: number): BiomeSymbol {
  return BIOME_SYMBOL_ORDER[Math.max(0, Math.min(BIOME_SYMBOL_ORDER.length - 1, index))];
}
