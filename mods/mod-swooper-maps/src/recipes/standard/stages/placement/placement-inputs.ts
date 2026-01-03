import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import {
  MapInfoSchema,
  PlanFloodplainsConfigSchema,
  PlanFloodplainsOutputSchema,
  PlanWondersConfigSchema,
  PlanWondersOutputSchema,
  PlanStartsConfigSchema,
  PlanStartsOutputSchema,
  type MapInfo,
} from "@mapgen/domain/placement";

export const PlacementInputsConfigSchema = Type.Object(
  {
    wonders: PlanWondersConfigSchema,
    floodplains: PlanFloodplainsConfigSchema,
    starts: PlanStartsConfigSchema,
  },
  { additionalProperties: false }
);

export const PlacementInputsV1Schema = Type.Object(
  {
    mapInfo: MapInfoSchema,
    starts: PlanStartsOutputSchema,
    wonders: PlanWondersOutputSchema,
    floodplains: PlanFloodplainsOutputSchema,
    placementConfig: PlacementInputsConfigSchema,
  },
  { additionalProperties: false }
);

export type PlacementInputsV1 = Static<typeof PlacementInputsV1Schema> & { mapInfo: MapInfo };

export function isPlacementInputsV1(value: unknown): value is PlacementInputsV1 {
  return Value.Check(PlacementInputsV1Schema, value);
}
