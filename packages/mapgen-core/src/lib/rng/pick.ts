import type { RngFn } from "./unit.js";

export function pickRandom<T>(items: readonly T[], rng: RngFn, label: string): T | null {
  if (!items.length) return null;
  const index = rng(items.length, label) % items.length;
  return items[index] ?? null;
}

