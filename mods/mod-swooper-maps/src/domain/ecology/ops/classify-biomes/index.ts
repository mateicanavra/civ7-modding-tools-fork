import { Value } from "typebox/value";
import { createOp } from "@swooper/mapgen-core/authoring";

import {
  BIOME_SYMBOL_ORDER,
  BIOME_SYMBOL_TO_INDEX,
  biomeSymbolFromIndex,
  type BiomeSymbol,
} from "../../types.js";
import {
  BiomeClassificationConfigSchema,
  BiomeClassificationInputSchema,
  BiomeClassificationOutputSchema,
  VegetationBiomeModifiersSchema,
  type BiomeClassificationConfig,
  type BiomeClassificationInput,
  type BiomeClassificationOutput,
} from "./schema.js";
import { biomeSymbolForZones } from "./rules/lookup.js";
import { pseudoRandom01 } from "./rules/noise.js";
import { overlayMoistureBonus } from "./rules/overlays.js";
import { computeEffectiveMoisture, moistureZoneOf } from "./rules/moisture.js";
import { computeTemperature, temperatureZoneOf } from "./rules/temperature.js";
import { clamp01, computeMaxLatitude, ensureSize } from "./rules/util.js";
import { vegetationDensityForBiome } from "./rules/vegetation.js";

export const classifyBiomes = createOp({
  kind: "compute",
  id: "ecology/biomes/classify",
  input: BiomeClassificationInputSchema,
  output: BiomeClassificationOutputSchema,
  config: BiomeClassificationConfigSchema,
  run: (input: BiomeClassificationInput, cfg: BiomeClassificationConfig) => {
    const resolvedConfig = Value.Default(
      BiomeClassificationConfigSchema,
      cfg
    ) as BiomeClassificationConfig;
    const { width, height } = input;
    const size = width * height;

    const rainfall = input.rainfall as Uint8Array;
    const humidity = input.humidity as Uint8Array;
    const elevation = input.elevation as Int16Array;
    const latitude = input.latitude as Float32Array;
    const landMask = input.landMask as Uint8Array;
    const corridorMask = (input.corridorMask as Uint8Array | undefined) ?? new Uint8Array(size);
    const riftShoulderMask = (input.riftShoulderMask as Uint8Array | undefined) ?? new Uint8Array(size);

    ensureSize(rainfall, size, "rainfall");
    ensureSize(humidity, size, "humidity");
    ensureSize(elevation, size, "elevation");
    ensureSize(latitude, size, "latitude");
    ensureSize(landMask, size, "landMask");
    ensureSize(corridorMask, size, "corridorMask");
    ensureSize(riftShoulderMask, size, "riftShoulderMask");

    const biomeIndex = new Uint8Array(size).fill(255);
    const vegetationDensity = new Float32Array(size);
    const effectiveMoisture = new Float32Array(size);
    const surfaceTemperature = new Float32Array(size);

    const maxLatitude = computeMaxLatitude(latitude);
    const [dry, semiArid, subhumid, humidThreshold] = resolvedConfig.moisture.thresholds;
    const noiseScale = resolvedConfig.noise.amplitude * 255;
    const moistureNormalization =
      humidThreshold + resolvedConfig.vegetation.moistureNormalizationPadding;

    const biomeModifiers = Value.Default(
      VegetationBiomeModifiersSchema,
      resolvedConfig.vegetation.biomeModifiers ?? {}
    ) as Record<BiomeSymbol, { multiplier: number; bonus: number }>;

    for (let i = 0; i < size; i++) {
      if (landMask[i] === 0) {
        biomeIndex[i] = 255;
        vegetationDensity[i] = 0;
        effectiveMoisture[i] = 0;
        surfaceTemperature[i] = resolvedConfig.temperature.pole;
        continue;
      }

      const temperature = computeTemperature({
        latitudeAbs: Math.abs(latitude[i]!),
        maxLatitude,
        elevationMeters: elevation[i]!,
        cfg: resolvedConfig.temperature,
      });
      surfaceTemperature[i] = temperature;

      const noise = (pseudoRandom01(i, resolvedConfig.noise.seed) - 0.5) * 2;
      const overlayBonus = overlayMoistureBonus(
        corridorMask[i]!,
        riftShoulderMask[i]!,
        resolvedConfig.overlays
      );
      const moisture = computeEffectiveMoisture({
        rainfall: rainfall[i]!,
        humidity: humidity[i]!,
        bias: resolvedConfig.moisture.bias,
        humidityWeight: resolvedConfig.moisture.humidityWeight,
        overlayBonus,
        noise,
        noiseScale,
      });

      effectiveMoisture[i] = moisture;

      const tempZone = temperatureZoneOf(temperature, resolvedConfig.temperature);
      const moistureZone = moistureZoneOf(moisture, [dry, semiArid, subhumid, humidThreshold]);
      const symbol = biomeSymbolForZones(tempZone, moistureZone);
      biomeIndex[i] = BIOME_SYMBOL_TO_INDEX[symbol]!;

      const moistureNorm = clamp01(moisture / moistureNormalization);
      const humidityNorm = clamp01(humidity[i]! / 255);
      vegetationDensity[i] = vegetationDensityForBiome(symbol, {
        base: resolvedConfig.vegetation.base,
        moistureWeight: resolvedConfig.vegetation.moistureWeight,
        humidityWeight: resolvedConfig.vegetation.humidityWeight,
        moistureNorm,
        humidityNorm,
        modifiers: biomeModifiers,
      });
    }

    return { biomeIndex, vegetationDensity, effectiveMoisture, surfaceTemperature };
  },
} as const);

export function biomeSymbolAt(index: number): BiomeSymbol {
  return biomeSymbolFromIndex(index);
}

export { biomeSymbolFromIndex };
export type { BiomeClassificationConfig, BiomeClassificationInput, BiomeClassificationOutput };
