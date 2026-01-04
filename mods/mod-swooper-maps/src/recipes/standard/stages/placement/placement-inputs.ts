import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import {
  ops,
  PlanFloodplainsSchema,
  PlanWondersSchema,
  PlanStartsSchema,
} from "@mapgen/domain/placement";

export const PlacementInputsConfigSchema = Type.Object(
  {
    wonders: ops.planWonders.config,
    floodplains: ops.planFloodplains.config,
    starts: ops.planStarts.config,
  },
  { additionalProperties: false }
);

export const PlacementInputsV1Schema = Type.Object(
  {
    mapInfo: PlanWondersSchema.properties.input.properties.mapInfo,
    starts: PlanStartsSchema.properties.output,
    wonders: PlanWondersSchema.properties.output,
    floodplains: PlanFloodplainsSchema.properties.output,
    placementConfig: PlacementInputsConfigSchema,
  },
  { additionalProperties: false }
);

type MapInfo = Static<typeof PlanWondersSchema["properties"]["input"]["properties"]["mapInfo"]>;
export type PlacementInputsV1 = Static<typeof PlacementInputsV1Schema> & { mapInfo: MapInfo };

export function isPlacementInputsV1(value: unknown): value is PlacementInputsV1 {
  return Value.Check(PlacementInputsV1Schema, value);
}
