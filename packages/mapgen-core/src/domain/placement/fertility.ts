import type { EngineAdapter } from "@civ7/adapter";

export function applyFertilityRecalc(adapter: EngineAdapter): void {
  adapter.recalculateFertility();
}

