import { Type } from "typebox";

import {
  PlanFloodplainsConfigSchema,
  PlanStartsConfigSchema,
  PlanWondersConfigSchema,
} from "@mapgen/domain/placement";

/**
 * Late-stage placement config (wonders, floodplains, starts).
 * Sourced from placement domain operations to keep schema + logic colocated.
 */
export const PlacementConfigSchema = Type.Object(
  {
    wonders: PlanWondersConfigSchema,
    floodplains: PlanFloodplainsConfigSchema,
    starts: PlanStartsConfigSchema,
  },
  {
    additionalProperties: false,
    default: {
      wonders: { wondersPlusOne: true },
      floodplains: { minLength: 4, maxLength: 10 },
      starts: {},
    },
  }
);

export { PlanStartsConfigSchema as StartsConfigSchema, PlanFloodplainsConfigSchema as FloodplainsConfigSchema };
