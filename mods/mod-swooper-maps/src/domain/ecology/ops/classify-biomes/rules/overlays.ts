import type { Static } from "@swooper/mapgen-core/authoring";
import { OverlaySchema } from "./overlays.schema.js";

export function overlayMoistureBonus(
  corridorFlag: number,
  riftShoulderFlag: number,
  cfg: Static<typeof OverlaySchema>
): number {
  if (corridorFlag > 0) return cfg.corridorMoistureBonus;
  if (riftShoulderFlag > 0) return cfg.riftShoulderMoistureBonus;
  return 0;
}
