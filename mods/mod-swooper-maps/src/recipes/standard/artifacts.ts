import type {
  ClimateFieldBuffer,
  ExtendedMapContext,
  HeightfieldBuffer,
} from "@swooper/mapgen-core";
import { isBiomeClassificationArtifactV1, type BiomeClassificationArtifactV1 } from "@mapgen/domain/ecology/artifacts.js";
import type { PlacementInputsV1 } from "./stages/placement/placement-inputs.js";
import { isPlacementInputsV1 } from "./stages/placement/placement-inputs.js";
import type { PlacementOutputsV1 } from "./stages/placement/placement-outputs.js";
import { isPlacementOutputsV1 } from "./stages/placement/placement-outputs.js";
import { M3_DEPENDENCY_TAGS } from "./tags.js";

export function publishHeightfieldArtifact(ctx: ExtendedMapContext): HeightfieldBuffer {
  const value = ctx.buffers.heightfield;
  ctx.artifacts.set(M3_DEPENDENCY_TAGS.artifact.heightfield, value);
  return value;
}

export function publishClimateFieldArtifact(ctx: ExtendedMapContext): ClimateFieldBuffer {
  const value = ctx.buffers.climate;
  ctx.artifacts.set(M3_DEPENDENCY_TAGS.artifact.climateField, value);
  return value;
}

export function publishRiverAdjacencyArtifact(
  ctx: ExtendedMapContext,
  mask: Uint8Array
): Uint8Array {
  ctx.artifacts.set(M3_DEPENDENCY_TAGS.artifact.riverAdjacency, mask);
  return mask;
}

export function publishBiomeClassificationArtifact(
  ctx: ExtendedMapContext,
  artifact: BiomeClassificationArtifactV1
): BiomeClassificationArtifactV1 {
  ctx.artifacts.set(M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1, artifact);
  return artifact;
}

export function publishPlacementInputsArtifact(
  ctx: ExtendedMapContext,
  inputs: PlacementInputsV1
): PlacementInputsV1 {
  ctx.artifacts.set(M3_DEPENDENCY_TAGS.artifact.placementInputsV1, inputs);
  return inputs;
}

export function publishPlacementOutputsArtifact(
  ctx: ExtendedMapContext,
  outputs: PlacementOutputsV1
): PlacementOutputsV1 {
  ctx.artifacts.set(M3_DEPENDENCY_TAGS.artifact.placementOutputsV1, outputs);
  return outputs;
}

export function getPublishedClimateField(ctx: ExtendedMapContext): ClimateFieldBuffer | null {
  const value = ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.climateField);
  if (!value || typeof value !== "object") return null;
  const candidate = value as ClimateFieldBuffer;
  if (!(candidate.rainfall instanceof Uint8Array)) return null;
  if (!(candidate.humidity instanceof Uint8Array)) return null;
  return candidate;
}

export function getPublishedRiverAdjacency(ctx: ExtendedMapContext): Uint8Array | null {
  const value = ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.riverAdjacency);
  if (!(value instanceof Uint8Array)) return null;
  const expectedSize = ctx.dimensions.width * ctx.dimensions.height;
  if (value.length !== expectedSize) return null;
  return value;
}

export function getPublishedBiomeClassification(
  ctx: ExtendedMapContext
): BiomeClassificationArtifactV1 | null {
  const value = ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1);
  if (!isBiomeClassificationArtifactV1(value)) return null;
  const expectedSize = ctx.dimensions.width * ctx.dimensions.height;
  if (
    value.width !== ctx.dimensions.width ||
    value.height !== ctx.dimensions.height ||
    value.biomeIndex.length !== expectedSize ||
    value.vegetationDensity.length !== expectedSize ||
    value.effectiveMoisture.length !== expectedSize ||
    value.surfaceTemperature.length !== expectedSize ||
    value.aridityIndex.length !== expectedSize ||
    value.freezeIndex.length !== expectedSize
  ) {
    return null;
  }
  return value;
}

export function getPublishedPlacementInputs(ctx: ExtendedMapContext): PlacementInputsV1 | null {
  const value = ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.placementInputsV1);
  if (!isPlacementInputsV1(value)) return null;
  return value;
}

export function getPublishedPlacementOutputs(ctx: ExtendedMapContext): PlacementOutputsV1 | null {
  const value = ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.placementOutputsV1);
  if (!isPlacementOutputsV1(value)) return null;
  return value;
}

export function computeRiverAdjacencyMask(
  ctx: ExtendedMapContext,
  radius = 1
): Uint8Array {
  const { width, height } = ctx.dimensions;
  const size = width * height;
  const mask = new Uint8Array(size);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      mask[y * width + x] = ctx.adapter.isAdjacentToRivers(x, y, radius) ? 1 : 0;
    }
  }

  return mask;
}
