import type { Static } from "typebox";
import type { OverlaySchema } from "../schema.js";

export function overlayMoistureBonus(
  corridorFlag: number,
  riftShoulderFlag: number,
  cfg: Static<typeof OverlaySchema>
): number {
  if (corridorFlag > 0) return cfg.corridorMoistureBonus;
  if (riftShoulderFlag > 0) return cfg.riftShoulderMoistureBonus;
  return 0;
}
