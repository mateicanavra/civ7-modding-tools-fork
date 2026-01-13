import { defineArtifact } from "@swooper/mapgen-core/authoring";
import { Type } from "typebox";

export const HeightfieldArtifactSchema = Type.Object(
  {
    elevation: Type.Any(),
    terrain: Type.Any(),
    landMask: Type.Any(),
  },
  { additionalProperties: false }
);

export const ClimateFieldArtifactSchema = Type.Object(
  {
    rainfall: Type.Any(),
    humidity: Type.Any(),
  },
  { additionalProperties: false }
);

export const hydrologyPreArtifacts = {
  heightfield: defineArtifact({
    name: "heightfield",
    id: "artifact:heightfield",
    schema: HeightfieldArtifactSchema,
  }),
  climateField: defineArtifact({
    name: "climateField",
    id: "artifact:climateField",
    schema: ClimateFieldArtifactSchema,
  }),
} as const;
