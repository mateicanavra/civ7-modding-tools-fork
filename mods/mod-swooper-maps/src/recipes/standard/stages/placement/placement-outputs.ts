import { Type, type Static } from "typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

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

const placementOutputsCheck = TypeCompiler.Compile(PlacementOutputsV1Schema);

export function isPlacementOutputsV1(value: unknown): value is PlacementOutputsV1 {
  return placementOutputsCheck.Check(value);
}
