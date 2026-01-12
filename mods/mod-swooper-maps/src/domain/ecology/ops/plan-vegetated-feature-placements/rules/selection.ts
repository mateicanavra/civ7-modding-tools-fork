import { biomeSymbolFromIndex } from "@mapgen/domain/ecology/types.js";

type VegetatedRules = {
  desertSagebrushMinVegetation: number;
  desertSagebrushMaxAridity: number;
  tundraTaigaMinVegetation: number;
  tundraTaigaMinTemperature: number;
  tundraTaigaMaxFreeze: number;
  temperateDryForestMoisture: number;
  temperateDryForestMaxAridity: number;
  temperateDryForestVegetation: number;
  tropicalSeasonalRainforestMoisture: number;
  tropicalSeasonalRainforestMaxAridity: number;
};

/**
 * Picks a vegetated feature key for the tile based on biome and climate signals.
 */
export function pickVegetatedFeature(params: {
  symbolIndex: number;
  moistureValue: number;
  temperatureValue: number;
  vegetationValue: number;
  aridityIndex: number;
  freezeIndex: number;
  rules: VegetatedRules;
}) {
  const {
    symbolIndex,
    moistureValue,
    temperatureValue,
    vegetationValue,
    aridityIndex,
    freezeIndex,
    rules,
  } = params;
  const symbol = biomeSymbolFromIndex(symbolIndex);

  if (symbol === "snow") return null;
  if (symbol === "desert") {
    if (aridityIndex > rules.desertSagebrushMaxAridity) return null;
    return vegetationValue > rules.desertSagebrushMinVegetation
      ? "FEATURE_SAGEBRUSH_STEPPE"
      : null;
  }
  if (symbol === "tundra") {
    if (freezeIndex > rules.tundraTaigaMaxFreeze) return null;
    return vegetationValue > rules.tundraTaigaMinVegetation &&
      temperatureValue > rules.tundraTaigaMinTemperature
      ? "FEATURE_TAIGA"
      : null;
  }
  if (symbol === "boreal") return "FEATURE_TAIGA";
  if (symbol === "temperateDry") {
    if (aridityIndex > rules.temperateDryForestMaxAridity) return "FEATURE_SAGEBRUSH_STEPPE";
    return moistureValue > rules.temperateDryForestMoisture ||
      vegetationValue > rules.temperateDryForestVegetation
      ? "FEATURE_FOREST"
      : "FEATURE_SAGEBRUSH_STEPPE";
  }
  if (symbol === "temperateHumid") return "FEATURE_FOREST";
  if (symbol === "tropicalSeasonal") {
    if (aridityIndex > rules.tropicalSeasonalRainforestMaxAridity) {
      return "FEATURE_SAVANNA_WOODLAND";
    }
    return moistureValue > rules.tropicalSeasonalRainforestMoisture
      ? "FEATURE_RAINFOREST"
      : "FEATURE_SAVANNA_WOODLAND";
  }
  if (symbol === "tropicalRainforest") return "FEATURE_RAINFOREST";
  return null;
}
