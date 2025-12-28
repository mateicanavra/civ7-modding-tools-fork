import type { ClimateFieldBuffer, ExtendedMapContext } from "@swooper/mapgen-core";
import { M3_DEPENDENCY_TAGS } from "./tags.js";

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
