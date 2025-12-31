import type { EngineAdapter } from "@civ7/adapter";

export function isCoastalLand(
  adapter: EngineAdapter,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  if (adapter.isWater(x, y)) return false;

  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
    [x - 1, y - 1],
    [x + 1, y + 1],
  ];

  for (const [nx, ny] of neighbors) {
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      if (adapter.isWater(nx, ny)) return true;
    }
  }
  return false;
}

