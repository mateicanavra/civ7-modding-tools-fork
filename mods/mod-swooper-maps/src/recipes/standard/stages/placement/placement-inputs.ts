import { Type, type Static } from "typebox";
import placement from "@mapgen/domain/placement";

export const PlacementInputsConfigSchema = Type.Object(
  {
    wonders: placement.ops.planWonders.config,
    floodplains: placement.ops.planFloodplains.config,
    starts: placement.ops.planStarts.config,
  },
  { additionalProperties: false }
);

export const PlacementInputsV1Schema = Type.Object(
  {
    mapInfo: placement.ops.planWonders["input"].properties.mapInfo,
    starts: placement.ops.planStarts["output"],
    wonders: placement.ops.planWonders["output"],
    floodplains: placement.ops.planFloodplains["output"],
    placementConfig: PlacementInputsConfigSchema,
  },
  { additionalProperties: false }
);

type MapInfo = Static<typeof placement.ops.planWonders["input"]["properties"]["mapInfo"]>;
export type PlacementInputsV1 = Static<typeof PlacementInputsV1Schema> & { mapInfo: MapInfo };
