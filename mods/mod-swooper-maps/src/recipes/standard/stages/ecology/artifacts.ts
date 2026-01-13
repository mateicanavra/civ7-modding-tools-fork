import { defineArtifact, type Static } from "@swooper/mapgen-core/authoring";
import { Type } from "typebox";

export const BiomeClassificationArtifactSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    biomeIndex: Type.Any(),
    vegetationDensity: Type.Any(),
    effectiveMoisture: Type.Any(),
    surfaceTemperature: Type.Any(),
    aridityIndex: Type.Any(),
    freezeIndex: Type.Any(),
  },
  { additionalProperties: false }
);

export type BiomeClassificationArtifact = Static<typeof BiomeClassificationArtifactSchema>;

export const PedologyArtifactSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    soilType: Type.Any(),
    fertility: Type.Any(),
  },
  { additionalProperties: false }
);

export type PedologyArtifact = Static<typeof PedologyArtifactSchema>;

export const ResourceBasinsArtifactSchema = Type.Object(
  {
    basins: Type.Array(
      Type.Object(
        {
          resourceId: Type.String(),
          plots: Type.Array(Type.Integer({ minimum: 0 })),
          intensity: Type.Array(Type.Number({ minimum: 0 })),
          confidence: Type.Number({ minimum: 0 }),
        },
        { additionalProperties: false }
      )
    ),
  },
  { additionalProperties: false }
);

export type ResourceBasinsArtifact = Static<typeof ResourceBasinsArtifactSchema>;

export const FeatureIntentsArtifactSchema = Type.Object(
  {
    vegetation: Type.Array(
      Type.Object(
        {
          x: Type.Integer({ minimum: 0 }),
          y: Type.Integer({ minimum: 0 }),
          feature: Type.String(),
          weight: Type.Optional(Type.Number()),
        },
        { additionalProperties: false }
      )
    ),
    wetlands: Type.Array(
      Type.Object(
        {
          x: Type.Integer({ minimum: 0 }),
          y: Type.Integer({ minimum: 0 }),
          feature: Type.String(),
          weight: Type.Optional(Type.Number()),
        },
        { additionalProperties: false }
      )
    ),
    reefs: Type.Array(
      Type.Object(
        {
          x: Type.Integer({ minimum: 0 }),
          y: Type.Integer({ minimum: 0 }),
          feature: Type.String(),
          weight: Type.Optional(Type.Number()),
        },
        { additionalProperties: false }
      )
    ),
    ice: Type.Array(
      Type.Object(
        {
          x: Type.Integer({ minimum: 0 }),
          y: Type.Integer({ minimum: 0 }),
          feature: Type.String(),
          weight: Type.Optional(Type.Number()),
        },
        { additionalProperties: false }
      )
    ),
  },
  { additionalProperties: false }
);

export type FeatureIntentsArtifact = Static<typeof FeatureIntentsArtifactSchema>;

export const ecologyArtifacts = {
  biomeClassification: defineArtifact({
    name: "biomeClassification",
    id: "artifact:ecology.biomeClassification",
    schema: BiomeClassificationArtifactSchema,
  }),
  pedology: defineArtifact({
    name: "pedology",
    id: "artifact:ecology.soils",
    schema: PedologyArtifactSchema,
  }),
  resourceBasins: defineArtifact({
    name: "resourceBasins",
    id: "artifact:ecology.resourceBasins",
    schema: ResourceBasinsArtifactSchema,
  }),
  featureIntents: defineArtifact({
    name: "featureIntents",
    id: "artifact:ecology.featureIntents",
    schema: FeatureIntentsArtifactSchema,
  }),
} as const;
