import { Type, type Static } from "typebox";
import {
  ops,
  PlanFloodplainsContract,
  PlanWondersContract,
  PlanStartsContract,
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
    mapInfo: PlanWondersContract["input"].properties.mapInfo,
    starts: PlanStartsContract["output"],
    wonders: PlanWondersContract["output"],
    floodplains: PlanFloodplainsContract["output"],
    placementConfig: PlacementInputsConfigSchema,
  },
  { additionalProperties: false }
);

type MapInfo = Static<typeof PlanWondersContract["input"]["properties"]["mapInfo"]>;
export type PlacementInputsV1 = Static<typeof PlacementInputsV1Schema> & { mapInfo: MapInfo };
