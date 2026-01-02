import type { BiomeSymbol } from "../../../types.js";

export function vegetationDensityForBiome(
  symbol: BiomeSymbol,
  params: {
    base: number;
    moistureWeight: number;
    humidityWeight: number;
    moistureNorm: number;
    humidityNorm: number;
    modifiers: Record<BiomeSymbol, { multiplier: number; bonus: number }>;
  }
): number {
  const { base, moistureWeight, humidityWeight, moistureNorm, humidityNorm, modifiers } = params;

  let density =
    base + moistureWeight * moistureNorm + humidityWeight * humidityNorm;

  const modifier = modifiers[symbol];
  density = density * modifier.multiplier + modifier.bonus;

  return Math.max(0, Math.min(1, density));
}
