import { Type, type Static } from "typebox";

const PlacementMethodCallSchema = Type.Object(
  {
    method: Type.String(),
    args: Type.Optional(Type.Unknown()),
  },
  { additionalProperties: false }
);

export const PlacementOutputsV1Schema = Type.Object(
  {
    naturalWondersCount: Type.Number(),
    floodplainsCount: Type.Number(),
    snowTilesCount: Type.Number(),
    resourcesCount: Type.Number(),
    startsAssigned: Type.Number(),
    discoveriesCount: Type.Number(),
    methodCalls: Type.Optional(Type.Array(PlacementMethodCallSchema)),
  },
  { additionalProperties: false }
);

export type PlacementOutputsV1 = Static<typeof PlacementOutputsV1Schema>;
