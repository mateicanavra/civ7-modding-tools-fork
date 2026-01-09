export type BiomeSymbol =
  | "snow"
  | "tundra"
  | "boreal"
  | "temperateDry"
  | "temperateHumid"
  | "tropicalSeasonal"
  | "tropicalRainforest"
  | "desert";

export const BIOME_SYMBOL_ORDER: ReadonlyArray<BiomeSymbol> = [
  "snow",
  "tundra",
  "boreal",
  "temperateDry",
  "temperateHumid",
  "tropicalSeasonal",
  "tropicalRainforest",
  "desert",
];

export type FeatureKey =
  | "FEATURE_FOREST"
  | "FEATURE_RAINFOREST"
  | "FEATURE_TAIGA"
  | "FEATURE_SAVANNA_WOODLAND"
  | "FEATURE_SAGEBRUSH_STEPPE"
  | "FEATURE_MARSH"
  | "FEATURE_TUNDRA_BOG"
  | "FEATURE_MANGROVE"
  | "FEATURE_OASIS"
  | "FEATURE_WATERING_HOLE"
  | "FEATURE_REEF"
  | "FEATURE_COLD_REEF"
  | "FEATURE_ATOLL"
  | "FEATURE_LOTUS"
  | "FEATURE_ICE";

export const FEATURE_PLACEMENT_KEYS: ReadonlyArray<FeatureKey> = [
  "FEATURE_FOREST",
  "FEATURE_RAINFOREST",
  "FEATURE_TAIGA",
  "FEATURE_SAVANNA_WOODLAND",
  "FEATURE_SAGEBRUSH_STEPPE",
  "FEATURE_MARSH",
  "FEATURE_TUNDRA_BOG",
  "FEATURE_MANGROVE",
  "FEATURE_OASIS",
  "FEATURE_WATERING_HOLE",
  "FEATURE_REEF",
  "FEATURE_COLD_REEF",
  "FEATURE_ATOLL",
  "FEATURE_LOTUS",
  "FEATURE_ICE",
];

export type PlotEffectKey = `PLOTEFFECT_${string}`;

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
