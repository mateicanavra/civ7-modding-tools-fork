import { Type } from "typebox";

export interface BiomeClassificationArtifactV1 {
  width: number;
  height: number;
  biomeIndex: Uint8Array;
  vegetationDensity: Float32Array;
  effectiveMoisture: Float32Array;
  surfaceTemperature: Float32Array;
  aridityIndex: Float32Array;
  freezeIndex: Float32Array;
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

export function isBiomeClassificationArtifactV1(
  value: unknown
): value is BiomeClassificationArtifactV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as BiomeClassificationArtifactV1;
  return (
    typeof candidate.width === "number" &&
    typeof candidate.height === "number" &&
    candidate.biomeIndex instanceof Uint8Array &&
    candidate.vegetationDensity instanceof Float32Array &&
    candidate.effectiveMoisture instanceof Float32Array &&
    candidate.surfaceTemperature instanceof Float32Array &&
    candidate.aridityIndex instanceof Float32Array &&
    candidate.freezeIndex instanceof Float32Array
  );
}
