import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import type { MapInfo } from "@civ7/adapter";
import { PlacementConfigSchema, StartsConfigSchema } from "@mapgen/config/index.js";

const MapInfoSchema = Type.Object(
  {
    GridWidth: Type.Optional(Type.Number()),
    GridHeight: Type.Optional(Type.Number()),
    MinLatitude: Type.Optional(Type.Number()),
    MaxLatitude: Type.Optional(Type.Number()),
    NumNaturalWonders: Type.Optional(Type.Number()),
    LakeGenerationFrequency: Type.Optional(Type.Number()),
    PlayersLandmass1: Type.Optional(Type.Number()),
    PlayersLandmass2: Type.Optional(Type.Number()),
    StartSectorRows: Type.Optional(Type.Number()),
    StartSectorCols: Type.Optional(Type.Number()),
  },
  { additionalProperties: true }
);

export const PlacementInputsV1Schema = Type.Object(
  {
    mapInfo: MapInfoSchema,
    starts: StartsConfigSchema,
    placementConfig: PlacementConfigSchema,
  },
  { additionalProperties: false }
);

export type PlacementInputsV1 = Static<typeof PlacementInputsV1Schema> & { mapInfo: MapInfo };

export function isPlacementInputsV1(value: unknown): value is PlacementInputsV1 {
  return Value.Check(PlacementInputsV1Schema, value);
}
