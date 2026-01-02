import type { BiomeClassificationConfig } from "@mapgen/domain/ecology/ops/classify-biomes.js";

export function mergeBiomeConfig(
  base: BiomeClassificationConfig,
  override: Partial<BiomeClassificationConfig>
): BiomeClassificationConfig {
  return {
    temperature: { ...base.temperature, ...(override.temperature ?? {}) },
    moisture: { ...base.moisture, ...(override.moisture ?? {}) },
    vegetation: { ...base.vegetation, ...(override.vegetation ?? {}) },
    noise: { ...base.noise, ...(override.noise ?? {}) },
    overlays: { ...base.overlays, ...(override.overlays ?? {}) },
  };
}
