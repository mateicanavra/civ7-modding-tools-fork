import { biomeSymbolFromIndex } from "../../classify-biomes.js";
import type { FeaturePlacementKey, FeaturesPlacementVegetatedRules } from "../schema.js";

export function pickVegetatedFeature(params: {
  symbolIndex: number;
  moistureValue: number;
  temperatureValue: number;
  vegetationValue: number;
  rules: Required<FeaturesPlacementVegetatedRules>;
}): FeaturePlacementKey | null {
  const { symbolIndex, moistureValue, temperatureValue, vegetationValue, rules } = params;
  const symbol = biomeSymbolFromIndex(symbolIndex);

  if (symbol === "snow") return null;
  if (symbol === "desert") {
    return vegetationValue > rules.desertSagebrushMinVegetation
      ? "FEATURE_SAGEBRUSH_STEPPE"
      : null;
  }
  if (symbol === "tundra") {
    return vegetationValue > rules.tundraTaigaMinVegetation && temperatureValue > rules.tundraTaigaMinTemperature
      ? "FEATURE_TAIGA"
      : null;
  }
  if (symbol === "boreal") return "FEATURE_TAIGA";
  if (symbol === "temperateDry") {
    return moistureValue > rules.temperateDryForestMoisture ||
      vegetationValue > rules.temperateDryForestVegetation
      ? "FEATURE_FOREST"
      : "FEATURE_SAGEBRUSH_STEPPE";
  }
  if (symbol === "temperateHumid") return "FEATURE_FOREST";
  if (symbol === "tropicalSeasonal") {
    return moistureValue > rules.tropicalSeasonalRainforestMoisture
      ? "FEATURE_RAINFOREST"
      : "FEATURE_SAVANNA_WOODLAND";
  }
  if (symbol === "tropicalRainforest") return "FEATURE_RAINFOREST";
  return null;
}
