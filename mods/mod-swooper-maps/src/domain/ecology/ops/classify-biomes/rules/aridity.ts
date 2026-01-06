import type { Static } from "@swooper/mapgen-core/authoring";
import { AriditySchema } from "./aridity.schema.js";
import { clamp01 } from "./util.js";

type MoistureZone = "arid" | "semiArid" | "subhumid" | "humid" | "perhumid";

const MOISTURE_ORDER: ReadonlyArray<MoistureZone> = [
  "arid",
  "semiArid",
  "subhumid",
  "humid",
  "perhumid",
];

export function computeAridityIndex(params: {
  temperature: number;
  humidity: number;
  rainfall: number;
  cfg: Static<typeof AriditySchema>;
}): number {
  const { temperature, humidity, rainfall, cfg } = params;
  const tempRange = Math.max(1e-6, cfg.temperatureMax - cfg.temperatureMin);
  const tempNorm = clamp01((temperature - cfg.temperatureMin) / tempRange);
  const humidityNorm = clamp01(humidity / 255);

  const pet = cfg.petBase + cfg.petTemperatureWeight * tempNorm;
  const dampenedPet = pet * (1 - cfg.humidityDampening * humidityNorm);
  const aridityRaw = dampenedPet - rainfall * cfg.rainfallWeight + cfg.bias;

  return clamp01(aridityRaw / Math.max(1e-6, cfg.normalization));
}

export function aridityShiftForIndex(index: number, thresholds: readonly number[]): number {
  let shift = 0;
  for (const threshold of thresholds) {
    if (index >= threshold) shift++;
  }
  return shift;
}

export function shiftMoistureZone(
  zone: MoistureZone,
  shift: number
): MoistureZone {
  const idx = MOISTURE_ORDER.indexOf(zone);
  if (idx < 0) return zone;
  const next = Math.max(0, idx - Math.max(0, shift));
  return MOISTURE_ORDER[next] ?? zone;
}
