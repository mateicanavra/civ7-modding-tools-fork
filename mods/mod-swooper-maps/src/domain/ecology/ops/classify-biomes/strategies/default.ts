import { createStrategy } from "@swooper/mapgen-core/authoring";

import { BIOME_SYMBOL_TO_INDEX, type BiomeSymbol } from "@mapgen/domain/ecology/types.js";
import { BiomeClassificationContract } from "../contract.js";
import {
  aridityShiftForIndex,
  biomeSymbolForZones,
  clamp01,
  computeAridityIndex,
  computeEffectiveMoisture,
  computeFreezeIndex,
  computeMaxLatitude,
  computeTemperature,
  ensureSize,
  moistureZoneOf,
  overlayMoistureBonus,
  pseudoRandom01,
  shiftMoistureZone,
  temperatureZoneOf,
  vegetationDensityForBiome,
} from "../rules/index.js";

export const defaultStrategy = createStrategy(BiomeClassificationContract, "default", {
  run: (input, config) => {
    const resolvedConfig = config;
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
    const aridityIndex = new Float32Array(size);
    const freezeIndex = new Float32Array(size);

    const maxLatitude = computeMaxLatitude(latitude);
    const [dry, semiArid, subhumid, humidThreshold] = resolvedConfig.moisture.thresholds;
    const noiseScale = resolvedConfig.noise.amplitude * 255;
    const moistureNormalization =
      humidThreshold + resolvedConfig.vegetation.moistureNormalizationPadding;

    const biomeModifiers = resolvedConfig.vegetation
      .biomeModifiers as Record<BiomeSymbol, { multiplier: number; bonus: number }>;

    for (let i = 0; i < size; i++) {
      if (landMask[i] === 0) {
        biomeIndex[i] = 255;
        vegetationDensity[i] = 0;
        effectiveMoisture[i] = 0;
        surfaceTemperature[i] = resolvedConfig.temperature.pole;
        aridityIndex[i] = 0;
        freezeIndex[i] = 0;
        continue;
      }

      const temperature = computeTemperature({
        latitudeAbs: Math.abs(latitude[i]!),
        maxLatitude,
        elevationMeters: elevation[i]!,
        cfg: resolvedConfig.temperature,
      });
      surfaceTemperature[i] = temperature;
      freezeIndex[i] = computeFreezeIndex(temperature, resolvedConfig.freeze);

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

      const aridity = computeAridityIndex({
        temperature,
        humidity: humidity[i]!,
        rainfall: rainfall[i]!,
        cfg: resolvedConfig.aridity,
      });
      aridityIndex[i] = aridity;

      const tempZone = temperatureZoneOf(temperature, resolvedConfig.temperature);
      const moistureZone = shiftMoistureZone(
        moistureZoneOf(moisture, [dry, semiArid, subhumid, humidThreshold]),
        aridityShiftForIndex(aridity, resolvedConfig.aridity.moistureShiftThresholds)
      );
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
        aridityIndex: aridity,
        aridityPenalty: resolvedConfig.aridity.vegetationPenalty,
        modifiers: biomeModifiers,
      });
    }

    return {
      biomeIndex,
      vegetationDensity,
      effectiveMoisture,
      surfaceTemperature,
      aridityIndex,
      freezeIndex,
    };
  },
});
