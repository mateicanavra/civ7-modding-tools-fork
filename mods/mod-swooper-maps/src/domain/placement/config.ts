import { Type, type Static } from "typebox";

import * as placement from "@mapgen/domain/placement";

/**
 * Late-stage placement config (wonders, floodplains, starts).
 * Sourced from placement domain operations to keep schema + logic colocated.
 */
export const PlacementConfigSchema = Type.Object(
  {
    wonders: placement.ops.planWonders.config,
    floodplains: placement.ops.planFloodplains.config,
    starts: placement.ops.planStarts.config,
  },
  { additionalProperties: false }
);

export type PlacementConfig = Static<typeof PlacementConfigSchema>;
