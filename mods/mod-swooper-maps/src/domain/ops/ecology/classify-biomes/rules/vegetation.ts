import type { BiomeSymbol } from '../../../../ecology/types.js';

export function vegetationDensityForBiome(
  symbol: BiomeSymbol,
  params: {
    base: number;
    moistureWeight: number;
    humidityWeight: number;
    moistureNorm: number;
    humidityNorm: number;
    aridityIndex: number;
    aridityPenalty: number;
    modifiers: Record<BiomeSymbol, { multiplier: number; bonus: number }>;
  }
): number {
  const {
    base,
    moistureWeight,
    humidityWeight,
    moistureNorm,
    humidityNorm,
    aridityIndex,
    aridityPenalty,
    modifiers,
  } = params;

  let density =
    base + moistureWeight * moistureNorm + humidityWeight * humidityNorm;

  const modifier = modifiers[symbol];
  density = density * modifier.multiplier + modifier.bonus;
  density -= aridityIndex * aridityPenalty;

  return Math.max(0, Math.min(1, density));
}
