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
  {
    additionalProperties: false,
    default: {
      wonders: placement.ops.planWonders.defaultConfig,
      floodplains: placement.ops.planFloodplains.defaultConfig,
      starts: placement.ops.planStarts.defaultConfig,
    },
  }
);

export type PlacementConfig = Static<typeof PlacementConfigSchema>;
