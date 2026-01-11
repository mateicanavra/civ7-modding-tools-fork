import type { LabelRng } from "@mapgen/lib/rng/label.js";

export function clampChance(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function rollPercent(rng: LabelRng, label: string, chance: number): boolean {
  return chance > 0 && rng(100, label) < chance;
}
