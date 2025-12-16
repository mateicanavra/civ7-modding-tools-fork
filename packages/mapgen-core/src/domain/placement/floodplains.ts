import type { EngineAdapter } from "@civ7/adapter";
import type { FloodplainsConfig } from "../../bootstrap/types.js";

export function applyFloodplains(adapter: EngineAdapter, cfg: FloodplainsConfig): void {
  const minLen = typeof cfg.minLength === "number" ? cfg.minLength : 4;
  const maxLen = typeof cfg.maxLength === "number" ? cfg.maxLength : 10;
  adapter.addFloodplains(minLen, maxLen);
}

