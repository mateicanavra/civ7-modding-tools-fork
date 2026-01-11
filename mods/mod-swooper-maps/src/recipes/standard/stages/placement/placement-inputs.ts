import { Type, type Static } from "typebox";
import placementContracts, {
  PlanFloodplainsContract,
  PlanStartsContract,
  PlanWondersContract,
} from "@mapgen/domain/placement/contracts";

export const PlacementInputsConfigSchema = Type.Object(
  {
    wonders: placementContracts.planWonders.config,
    floodplains: placementContracts.planFloodplains.config,
    starts: placementContracts.planStarts.config,
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
