import type { ExtendedMapContext } from "@mapgen/core/types.js";
import {
  InvalidDependencyTagError,
  UnknownDependencyTagError,
} from "@mapgen/pipeline/errors.js";

export const M3_DEPENDENCY_TAGS = {
  artifact: {
    foundation: "artifact:foundation",
    heightfield: "artifact:heightfield",
    climateField: "artifact:climateField",
    storyOverlays: "artifact:storyOverlays",
    riverAdjacency: "artifact:riverAdjacency",
  },
  field: {
    terrainType: "field:terrainType",
    elevation: "field:elevation",
    rainfall: "field:rainfall",
    biomeId: "field:biomeId",
    featureType: "field:featureType",
  },
  state: {
    landmassApplied: "state:engine.landmassApplied",
    coastlinesApplied: "state:engine.coastlinesApplied",
    riversModeled: "state:engine.riversModeled",
    biomesApplied: "state:engine.biomesApplied",
    featuresApplied: "state:engine.featuresApplied",
    placementApplied: "state:engine.placementApplied",
  },
} as const;

export const M3_CANONICAL_DEPENDENCY_TAGS: ReadonlySet<string> = new Set([
  ...Object.values(M3_DEPENDENCY_TAGS.artifact),
  ...Object.values(M3_DEPENDENCY_TAGS.field),
  ...Object.values(M3_DEPENDENCY_TAGS.state),
]);

const ARTIFACT_RE = /^artifact:[a-z][A-Za-z0-9]*$/;
const FIELD_RE = /^field:[a-z][A-Za-z0-9]*$/;
const STATE_RE = /^state:engine\.[a-z][A-Za-z0-9]*$/;

export function validateDependencyTag(tag: string): void {
  if (typeof tag !== "string" || tag.length === 0) {
    throw new InvalidDependencyTagError(String(tag));
  }
  if (!ARTIFACT_RE.test(tag) && !FIELD_RE.test(tag) && !STATE_RE.test(tag)) {
    throw new InvalidDependencyTagError(tag);
  }
  if (!M3_CANONICAL_DEPENDENCY_TAGS.has(tag)) {
    throw new UnknownDependencyTagError(tag);
  }
}

export function validateDependencyTags(tags: readonly string[]): void {
  for (const tag of tags) validateDependencyTag(tag);
}

type SatisfactionState = {
  satisfied: ReadonlySet<string>;
};

export function isDependencyTagSatisfied(
  tag: string,
  context: ExtendedMapContext,
  state: SatisfactionState
): boolean {
  const expectedSize = context.dimensions.width * context.dimensions.height;
  switch (tag) {
    case M3_DEPENDENCY_TAGS.artifact.foundation:
      return !!context.foundation;
    case M3_DEPENDENCY_TAGS.artifact.heightfield: {
      const value = context.artifacts?.get(tag);
      if (!value || typeof value !== "object") return false;
      const candidate = value as {
        elevation?: unknown;
        terrain?: unknown;
        landMask?: unknown;
      };
      return (
        candidate.elevation instanceof Int16Array &&
        candidate.terrain instanceof Uint8Array &&
        candidate.landMask instanceof Uint8Array &&
        candidate.elevation.length === expectedSize &&
        candidate.terrain.length === expectedSize &&
        candidate.landMask.length === expectedSize
      );
    }
    case M3_DEPENDENCY_TAGS.artifact.climateField: {
      const value = context.artifacts?.get(tag);
      if (!value || typeof value !== "object") return false;
      const candidate = value as { rainfall?: unknown; humidity?: unknown };
      return (
        candidate.rainfall instanceof Uint8Array &&
        candidate.humidity instanceof Uint8Array &&
        candidate.rainfall.length === expectedSize &&
        candidate.humidity.length === expectedSize
      );
    }
    case M3_DEPENDENCY_TAGS.artifact.storyOverlays:
      return (context.overlays?.size ?? 0) > 0;
    case M3_DEPENDENCY_TAGS.artifact.riverAdjacency: {
      const value = context.artifacts?.get(tag);
      return value instanceof Uint8Array && value.length === expectedSize;
    }
    case M3_DEPENDENCY_TAGS.field.terrainType:
      return !!context.fields?.terrainType;
    case M3_DEPENDENCY_TAGS.field.elevation:
      return !!context.fields?.elevation;
    case M3_DEPENDENCY_TAGS.field.rainfall:
      return !!context.fields?.rainfall;
    case M3_DEPENDENCY_TAGS.field.biomeId:
      return !!context.fields?.biomeId;
    case M3_DEPENDENCY_TAGS.field.featureType:
      return !!context.fields?.featureType;
    default:
      return state.satisfied.has(tag);
  }
}

export function computeInitialSatisfiedTags(context: ExtendedMapContext): Set<string> {
  const satisfied = new Set<string>();
  // Fields are preallocated when the context is created.
  if (context.fields?.terrainType) satisfied.add(M3_DEPENDENCY_TAGS.field.terrainType);
  if (context.fields?.elevation) satisfied.add(M3_DEPENDENCY_TAGS.field.elevation);
  if (context.fields?.rainfall) satisfied.add(M3_DEPENDENCY_TAGS.field.rainfall);
  if (context.fields?.biomeId) satisfied.add(M3_DEPENDENCY_TAGS.field.biomeId);
  if (context.fields?.featureType) satisfied.add(M3_DEPENDENCY_TAGS.field.featureType);
  return satisfied;
}
