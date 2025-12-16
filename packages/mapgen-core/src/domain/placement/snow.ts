import type { EngineAdapter } from "@civ7/adapter";

export function generateSnow(adapter: EngineAdapter, width: number, height: number): void {
  adapter.generateSnow(width, height);
}

