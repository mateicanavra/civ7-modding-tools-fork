import type { MapDimensions } from "@swooper/mapgen-core";
import type {
  BiomeClassificationArtifact,
  FeatureIntentsArtifact,
  PedologyArtifact,
  ResourceBasinsArtifact,
} from "./artifacts.js";

export type ArtifactValidationIssue = Readonly<{ message: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expectedSize(dimensions: MapDimensions): number {
  return Math.max(0, (dimensions.width | 0) * (dimensions.height | 0));
}

function validateTypedArray(
  errors: ArtifactValidationIssue[],
  label: string,
  value: unknown,
  ctor: { new (...args: any[]): { length: number } },
  expectedLength?: number
): value is { length: number } {
  if (!(value instanceof ctor)) {
    errors.push({ message: `Expected ${label} to be ${ctor.name}.` });
    return false;
  }
  if (expectedLength != null && value.length !== expectedLength) {
    errors.push({
      message: `Expected ${label} length ${expectedLength} (received ${value.length}).`,
    });
  }
  return true;
}

function isBiomeClassificationArtifact(value: unknown): value is BiomeClassificationArtifact {
  if (!value || typeof value !== "object") return false;
  const candidate = value as BiomeClassificationArtifact;
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

function isPedologyArtifact(value: unknown): value is PedologyArtifact {
  if (!value || typeof value !== "object") return false;
  const candidate = value as PedologyArtifact;
  return (
    typeof candidate.width === "number" &&
    typeof candidate.height === "number" &&
    candidate.soilType instanceof Uint8Array &&
    candidate.fertility instanceof Float32Array
  );
}

function isResourceBasinsArtifact(value: unknown): value is ResourceBasinsArtifact {
  if (!value || typeof value !== "object") return false;
  const candidate = value as ResourceBasinsArtifact;
  if (!Array.isArray(candidate.basins)) return false;
  return candidate.basins.every(
    (basin) =>
      basin &&
      typeof basin.resourceId === "string" &&
      Array.isArray(basin.plots) &&
      Array.isArray(basin.intensity) &&
      typeof basin.confidence === "number"
  );
}

function isFeatureIntentsArtifact(value: unknown): value is FeatureIntentsArtifact {
  if (!value || typeof value !== "object") return false;
  const candidate = value as FeatureIntentsArtifact;
  return (
    Array.isArray(candidate.vegetation) &&
    Array.isArray(candidate.wetlands) &&
    Array.isArray(candidate.reefs) &&
    Array.isArray(candidate.ice)
  );
}

export function validateBiomeClassificationArtifact(
  value: unknown,
  dimensions: MapDimensions
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isBiomeClassificationArtifact(value)) {
    errors.push({ message: "Invalid biome classification artifact payload." });
    return errors;
  }
  const size = expectedSize(dimensions);
  if (value.width !== dimensions.width || value.height !== dimensions.height) {
    errors.push({ message: "Biome classification dimensions mismatch." });
  }
  validateTypedArray(errors, "biomeIndex", value.biomeIndex, Uint8Array, size);
  validateTypedArray(errors, "vegetationDensity", value.vegetationDensity, Float32Array, size);
  validateTypedArray(errors, "effectiveMoisture", value.effectiveMoisture, Float32Array, size);
  validateTypedArray(errors, "surfaceTemperature", value.surfaceTemperature, Float32Array, size);
  validateTypedArray(errors, "aridityIndex", value.aridityIndex, Float32Array, size);
  validateTypedArray(errors, "freezeIndex", value.freezeIndex, Float32Array, size);
  return errors;
}

export function validatePedologyArtifact(
  value: unknown,
  dimensions: MapDimensions
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isPedologyArtifact(value)) {
    errors.push({ message: "Invalid pedology artifact payload." });
    return errors;
  }
  const size = expectedSize(dimensions);
  if (value.width !== dimensions.width || value.height !== dimensions.height) {
    errors.push({ message: "Pedology dimensions mismatch." });
  }
  validateTypedArray(errors, "soilType", value.soilType, Uint8Array, size);
  validateTypedArray(errors, "fertility", value.fertility, Float32Array, size);
  return errors;
}

export function validateResourceBasinsArtifact(
  value: unknown,
  _dimensions: MapDimensions
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isResourceBasinsArtifact(value)) {
    errors.push({ message: "Invalid resource basins artifact payload." });
    return errors;
  }
  return errors;
}

export function validateFeatureIntentsArtifact(
  value: unknown,
  _dimensions: MapDimensions
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isFeatureIntentsArtifact(value)) {
    errors.push({ message: "Invalid feature intents artifact payload." });
    return errors;
  }
  return errors;
}
