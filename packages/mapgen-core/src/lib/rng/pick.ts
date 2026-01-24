import type { RngFn } from "@mapgen/lib/rng/unit.js";

export function pickRandom<T>(items: readonly T[], rng: RngFn, label: string): T | null {
  if (!items.length) return null;
  const index = rng(items.length, label) % items.length;
  return items[index] ?? null;
}

export function pickUniqueIndices(
  count: number,
  picks: number,
  rng: (max: number, label?: string) => number,
  label: string
): number[] {
  const maxCount = Math.max(0, count | 0);
  const maxPicks = Math.min(maxCount, Math.max(0, picks | 0));
  const indices = Array.from({ length: maxCount }, (_, i) => i);
  for (let i = 0; i < maxPicks; i++) {
    const j = i + (rng(maxCount - i, label) | 0);
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  return indices.slice(0, maxPicks);
}
