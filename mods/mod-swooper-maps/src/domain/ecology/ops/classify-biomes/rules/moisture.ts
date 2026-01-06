import type { MoistureZone } from "../types.js";

export function moistureZoneOf(value: number, thresholds: readonly number[]): MoistureZone {
  if (value < thresholds[0]!) return "arid";
  if (value < thresholds[1]!) return "semiArid";
  if (value < thresholds[2]!) return "subhumid";
  if (value < thresholds[3]!) return "humid";
  return "perhumid";
}

export function computeEffectiveMoisture(params: {
  rainfall: number;
  humidity: number;
  bias: number;
  humidityWeight: number;
  overlayBonus: number;
  noise: number;
  noiseScale: number;
}): number {
  const { rainfall, humidity, bias, humidityWeight, overlayBonus, noise, noiseScale } = params;
  return rainfall + humidityWeight * humidity + bias + overlayBonus + noise * noiseScale;
}
