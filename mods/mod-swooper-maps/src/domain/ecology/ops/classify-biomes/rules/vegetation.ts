import type { BiomeSymbol } from "../../../types.js";

export function vegetationDensityForBiome(
  symbol: BiomeSymbol,
  params: {
    base: number;
    moistureWeight: number;
    humidityWeight: number;
    moistureNorm: number;
    humidityNorm: number;
  }
): number {
  const { base, moistureWeight, humidityWeight, moistureNorm, humidityNorm } = params;

  let density =
    base + moistureWeight * moistureNorm + humidityWeight * humidityNorm;

  switch (symbol) {
    case "desert":
      density *= 0.1;
      break;
    case "snow":
      density *= 0.05;
      break;
    case "tundra":
      density *= 0.35;
      break;
    case "boreal":
    case "temperateDry":
      density *= 0.75;
      break;
    case "tropicalRainforest":
      density = Math.min(1, density + 0.25);
      break;
    default:
      break;
  }

  return Math.max(0, Math.min(1, density));
}
