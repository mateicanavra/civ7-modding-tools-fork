import type { Static } from "typebox";
import type { TemperatureSchema } from "../schema.js";

type TempZone = "polar" | "cold" | "temperate" | "tropical";

export function temperatureZoneOf(value: number, cfg: Static<typeof TemperatureSchema>): TempZone {
  if (value <= cfg.polarCutoff) return "polar";
  if (value <= cfg.tundraCutoff) return "cold";
  if (value <= cfg.midLatitude) return "temperate";
  if (value < cfg.tropicalThreshold) return "temperate";
  return "tropical";
}

export function computeTemperature(params: {
  latitudeAbs: number;
  maxLatitude: number;
  elevationMeters: number;
  cfg: Static<typeof TemperatureSchema>;
}): number {
  const { latitudeAbs, maxLatitude, elevationMeters, cfg } = params;
  const latFactor = 1 - Math.max(0, Math.min(1, latitudeAbs / maxLatitude));
  const baseTemp = cfg.equator * latFactor + cfg.pole * (1 - latFactor);
  const elevationPenalty = ((elevationMeters - cfg.seaLevel) / 1000) * cfg.lapseRate;
  return baseTemp - elevationPenalty + cfg.bias;
}

export type { TempZone };
