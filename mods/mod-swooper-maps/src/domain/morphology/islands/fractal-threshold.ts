import type { EngineAdapter } from "@civ7/adapter";

export function getFractalThreshold(adapter: EngineAdapter | undefined, percent: number): number {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  return Math.floor((clampedPercent / 100) * 65535);
}

