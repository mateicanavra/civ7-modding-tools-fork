import type { EngineAdapter } from "@civ7/adapter";

export function generateResources(adapter: EngineAdapter, width: number, height: number): void {
  adapter.generateResources(width, height);
}

