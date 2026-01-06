import type { Static } from "@swooper/mapgen-core/authoring";
import { FreezeSchema } from "../freeze.schema.js";
import { clamp01 } from "./util.js";

export function computeFreezeIndex(
  temperature: number,
  cfg: Static<typeof FreezeSchema>
): number {
  const range = Math.max(1e-6, cfg.maxTemperature - cfg.minTemperature);
  const normalized = (cfg.maxTemperature - temperature) / range;
  return clamp01(normalized);
}
