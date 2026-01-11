import { Type, type Static } from "typebox";

import placementContracts from "@mapgen/domain/placement/contracts";

/**
 * Late-stage placement config (wonders, floodplains, starts).
 * Sourced from placement domain operations to keep schema + logic colocated.
 */
export const PlacementConfigSchema = Type.Object(
  {
    wonders: placementContracts.planWonders.config,
    floodplains: placementContracts.planFloodplains.config,
    starts: placementContracts.planStarts.config,
  },
  { additionalProperties: false }
);

export type PlacementConfig = Static<typeof PlacementConfigSchema>;
