export function weightedChoiceIndex(weights: readonly number[], roll: number): number {
  let total = 0;
  for (const w of weights) {
    if (typeof w === "number" && Number.isFinite(w) && w > 0) total += w;
  }
  if (total <= 0) return -1;

  let r = roll % total;
  if (r < 0) r += total;

  for (let i = 0; i < weights.length; i++) {
    const w = weights[i];
    if (typeof w !== "number" || !Number.isFinite(w) || w <= 0) continue;
    if (r < w) return i;
    r -= w;
  }
  return -1;
}

export function weightedChoice<T>(items: readonly T[], weights: readonly number[], roll: number): T | null {
  const count = Math.min(items.length, weights.length);
  if (count === 0) return null;

  const index = weightedChoiceIndex(weights.slice(0, count), roll);
  if (index < 0 || index >= count) return null;
  return items[index] ?? null;
}

