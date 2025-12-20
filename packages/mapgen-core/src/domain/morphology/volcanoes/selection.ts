import type { PlacedVolcano } from "@mapgen/domain/morphology/volcanoes/types.js";

export function isTooCloseToExisting(
  x: number,
  y: number,
  placed: PlacedVolcano[],
  minSpacing: number
): boolean {
  for (const p of placed) {
    const dx = Math.abs(x - p.x);
    const dy = Math.abs(y - p.y);
    const dist = Math.max(dx, dy);
    if (dist < minSpacing) {
      return true;
    }
  }
  return false;
}

