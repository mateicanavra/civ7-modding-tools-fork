import { defineArtifact } from "@swooper/mapgen-core/authoring";
import { Type } from "typebox";

export interface BiomeClassificationArtifact {
  width: number;
  height: number;
  biomeIndex: Uint8Array;
  vegetationDensity: Float32Array;
  effectiveMoisture: Float32Array;
  surfaceTemperature: Float32Array;
  aridityIndex: Float32Array;
  freezeIndex: Float32Array;
}

export interface PedologyArtifact {
  width: number;
  height: number;
  soilType: Uint8Array;
  fertility: Float32Array;
}

export interface ResourceBasinsArtifact {
  basins: Array<{
    resourceId: string;
    plots: number[];
    intensity: number[];
    confidence: number;
  }>;
}

export interface FeatureIntentsArtifact {
  vegetation: Array<{ x: number; y: number; feature: string; weight?: number }>;
  wetlands: Array<{ x: number; y: number; feature: string; weight?: number }>;
  reefs: Array<{ x: number; y: number; feature: string; weight?: number }>;
  ice: Array<{ x: number; y: number; feature: string; weight?: number }>;
}

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

export const PedologyArtifactSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    soilType: Type.Any(),
    fertility: Type.Any(),
  },
  { additionalProperties: false }
);

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
