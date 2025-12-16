import type { EngineAdapter } from "@civ7/adapter";

export function applyDiscoveries(
  adapter: EngineAdapter,
  width: number,
  height: number,
  startPositions: number[]
): void {
  adapter.generateDiscoveries(width, height, startPositions);
}

