import { ENGINE_EFFECT_TAGS } from "@civ7/adapter";
import type { ExtendedMapContext, FoundationContext } from "@mapgen/core/types.js";
import { isPlacementInputsV1 } from "@mapgen/pipeline/placement/placement-inputs.js";
import { FOUNDATION_ARTIFACT_TAG, validateFoundationContext } from "@mapgen/core/types.js";
import type { GenerationPhase } from "@mapgen/pipeline/types.js";
import {
  DuplicateDependencyTagError,
  InvalidDependencyTagDemoError,
  InvalidDependencyTagError,
  UnknownDependencyTagError,
} from "@mapgen/pipeline/errors.js";

export const M3_DEPENDENCY_TAGS = {
  artifact: {
    foundation: FOUNDATION_ARTIFACT_TAG,
    heightfield: "artifact:heightfield",
    climateField: "artifact:climateField",
    storyOverlays: "artifact:storyOverlays",
    riverAdjacency: "artifact:riverAdjacency",
    placementInputsV1: "artifact:placementInputs@v1",
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

export const M4_EFFECT_TAGS = {
  engine: {
    landmassApplied: "effect:engine.landmassApplied",
    coastlinesApplied: "effect:engine.coastlinesApplied",
    riversModeled: "effect:engine.riversModeled",
    biomesApplied: ENGINE_EFFECT_TAGS.biomesApplied,
    featuresApplied: ENGINE_EFFECT_TAGS.featuresApplied,
    placementApplied: ENGINE_EFFECT_TAGS.placementApplied,
  },
} as const;

const VERIFIED_EFFECT_TAGS = new Set<string>([
  M4_EFFECT_TAGS.engine.biomesApplied,
  M4_EFFECT_TAGS.engine.featuresApplied,
  M4_EFFECT_TAGS.engine.placementApplied,
]);

const EFFECT_OWNERS: Record<string, TagOwner> = {
  [M4_EFFECT_TAGS.engine.biomesApplied]: {
    pkg: "@swooper/mapgen-core",
    phase: "ecology",
    stepId: "biomes",
  },
  [M4_EFFECT_TAGS.engine.featuresApplied]: {
    pkg: "@swooper/mapgen-core",
    phase: "ecology",
    stepId: "features",
  },
  [M4_EFFECT_TAGS.engine.placementApplied]: {
    pkg: "@swooper/mapgen-core",
    phase: "placement",
    stepId: "placement",
  },
};

export type DependencyTagKind = "artifact" | "field" | "effect" | "state";

type SatisfactionState = {
  satisfied: ReadonlySet<string>;
};

export interface TagOwner {
  pkg: string;
  phase: GenerationPhase;
  stepId?: string;
}

export interface DependencyTagDefinition {
  id: string;
  kind: DependencyTagKind;
  owner?: TagOwner;
  satisfies?: (context: ExtendedMapContext, state: SatisfactionState) => boolean;
  demo?: unknown;
  validateDemo?: (demo: unknown) => boolean;
}

export class TagRegistry {
  private readonly tags = new Map<string, DependencyTagDefinition>();

  registerTag(definition: DependencyTagDefinition): void {
    if (this.tags.has(definition.id)) {
      throw new DuplicateDependencyTagError(definition.id);
    }
    if (!isTagKindCompatible(definition.id, definition.kind)) {
      throw new InvalidDependencyTagError(definition.id);
    }
    if (definition.demo !== undefined) {
      if (!definition.validateDemo || !definition.validateDemo(definition.demo)) {
        throw new InvalidDependencyTagDemoError(definition.id);
      }
    }
    this.tags.set(definition.id, definition);
  }

  registerTags(definitions: readonly DependencyTagDefinition[]): void {
    for (const definition of definitions) {
      this.registerTag(definition);
    }
  }

  get(tag: string): DependencyTagDefinition {
    this.validateTag(tag);
    return this.tags.get(tag) as DependencyTagDefinition;
  }

  has(tag: string): boolean {
    return this.tags.has(tag);
  }

  validateTag(tag: string): void {
    if (typeof tag !== "string" || tag.length === 0) {
      throw new InvalidDependencyTagError(String(tag));
    }
    if (!this.tags.has(tag)) {
      throw new UnknownDependencyTagError(tag);
    }
  }

  validateTags(tags: readonly string[]): void {
    for (const tag of tags) {
      this.validateTag(tag);
    }
  }
}

export function createDefaultTagRegistry(): TagRegistry {
  const registry = new TagRegistry();
  registry.registerTags(DEFAULT_TAG_DEFINITIONS);
  return registry;
}

export function validateDependencyTag(tag: string, registry: TagRegistry): void {
  registry.validateTag(tag);
}

export function validateDependencyTags(tags: readonly string[], registry: TagRegistry): void {
  registry.validateTags(tags);
}

export function isDependencyTagSatisfied(
  tag: string,
  context: ExtendedMapContext,
  state: SatisfactionState,
  registry: TagRegistry
): boolean {
  const definition = registry.get(tag);
  if (!state.satisfied.has(tag)) return false;
  if (definition.satisfies) return definition.satisfies(context, state);
  return true;
}

export function computeInitialSatisfiedTags(_context: ExtendedMapContext): Set<string> {
  // Tags become satisfied only when explicitly provided.
  return new Set<string>();
}

const DEFAULT_TAG_DEFINITIONS: DependencyTagDefinition[] = [
  {
    id: M3_DEPENDENCY_TAGS.artifact.foundation,
    kind: "artifact",
    satisfies: (context) => isFoundationArtifactSatisfied(context),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.heightfield,
    kind: "artifact",
    satisfies: (context) =>
      isHeightfieldBuffer(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.heightfield),
        getExpectedSize(context)
      ),
    demo: {
      elevation: new Int16Array(0),
      terrain: new Uint8Array(0),
      landMask: new Uint8Array(0),
    },
    validateDemo: (demo) => isHeightfieldBuffer(demo),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.climateField,
    kind: "artifact",
    satisfies: (context) =>
      isClimateFieldBuffer(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.climateField),
        getExpectedSize(context)
      ),
    demo: {
      rainfall: new Uint8Array(0),
      humidity: new Uint8Array(0),
    },
    validateDemo: (demo) => isClimateFieldBuffer(demo),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.storyOverlays,
    kind: "artifact",
    satisfies: (context) => (context.overlays?.size ?? 0) > 0,
    demo: {},
    validateDemo: (demo) => isPlainObject(demo),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
    kind: "artifact",
    satisfies: (context) =>
      isUint8Array(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.riverAdjacency),
        getExpectedSize(context)
      ),
    demo: new Uint8Array(0),
    validateDemo: (demo) => isUint8Array(demo),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.placementInputsV1,
    kind: "artifact",
    satisfies: (context) =>
      isPlacementInputsV1(context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.placementInputsV1)),
    demo: {
      mapInfo: {},
      starts: {
        playersLandmass1: 0,
        playersLandmass2: 0,
        westContinent: { west: 0, east: 0, south: 0, north: 0 },
        eastContinent: { west: 0, east: 0, south: 0, north: 0 },
        startSectorRows: 1,
        startSectorCols: 1,
        startSectors: [],
      },
      placementConfig: {},
    },
    validateDemo: (demo) => isPlacementInputsV1(demo),
  },
  {
    id: M3_DEPENDENCY_TAGS.field.terrainType,
    kind: "field",
    satisfies: (context) =>
      isUint8Array(context.fields?.terrainType, getExpectedSize(context)),
    demo: new Uint8Array(0),
    validateDemo: (demo) => isUint8Array(demo),
  },
  {
    id: M3_DEPENDENCY_TAGS.field.elevation,
    kind: "field",
    satisfies: (context) =>
      isInt16Array(context.fields?.elevation, getExpectedSize(context)),
    demo: new Int16Array(0),
    validateDemo: (demo) => isInt16Array(demo),
  },
  {
    id: M3_DEPENDENCY_TAGS.field.rainfall,
    kind: "field",
    satisfies: (context) =>
      isUint8Array(context.fields?.rainfall, getExpectedSize(context)),
    demo: new Uint8Array(0),
    validateDemo: (demo) => isUint8Array(demo),
  },
  {
    id: M3_DEPENDENCY_TAGS.field.biomeId,
    kind: "field",
    satisfies: (context) =>
      isUint8Array(context.fields?.biomeId, getExpectedSize(context)),
    demo: new Uint8Array(0),
    validateDemo: (demo) => isUint8Array(demo),
  },
  {
    id: M3_DEPENDENCY_TAGS.field.featureType,
    kind: "field",
    satisfies: (context) =>
      isInt16Array(context.fields?.featureType, getExpectedSize(context)),
    demo: new Int16Array(0),
    validateDemo: (demo) => isInt16Array(demo),
  },
  ...Object.values(M3_DEPENDENCY_TAGS.state).map((id) => ({
    id,
    kind: "state" as const,
  })),
  ...Object.values(M4_EFFECT_TAGS.engine).map((id) => {
    const definition: DependencyTagDefinition = {
      id,
      kind: "effect",
    };
    const owner = EFFECT_OWNERS[id];
    if (owner) {
      definition.owner = owner;
    }
    if (VERIFIED_EFFECT_TAGS.has(id)) {
      definition.satisfies = (context) => context.adapter.verifyEffect(id);
    }
    return definition;
  }),
];

function isFoundationArtifactSatisfied(context: ExtendedMapContext): boolean {
  const value = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.foundation);
  if (!value || typeof value !== "object") return false;
  try {
    validateFoundationContext(value as FoundationContext, context.dimensions);
    return true;
  } catch {
    return false;
  }
}

function getExpectedSize(context: ExtendedMapContext): number {
  return context.dimensions.width * context.dimensions.height;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isUint8Array(value: unknown, expectedSize?: number): value is Uint8Array {
  if (!(value instanceof Uint8Array)) return false;
  if (expectedSize == null) return true;
  return value.length === expectedSize;
}

function isInt16Array(value: unknown, expectedSize?: number): value is Int16Array {
  if (!(value instanceof Int16Array)) return false;
  if (expectedSize == null) return true;
  return value.length === expectedSize;
}

function isHeightfieldBuffer(value: unknown, expectedSize?: number): boolean {
  if (value == null || typeof value !== "object") return false;
  const candidate = value as { elevation?: unknown; terrain?: unknown; landMask?: unknown };
  return (
    isInt16Array(candidate.elevation, expectedSize) &&
    isUint8Array(candidate.terrain, expectedSize) &&
    isUint8Array(candidate.landMask, expectedSize)
  );
}

function isClimateFieldBuffer(value: unknown, expectedSize?: number): boolean {
  if (value == null || typeof value !== "object") return false;
  const candidate = value as { rainfall?: unknown; humidity?: unknown };
  return (
    isUint8Array(candidate.rainfall, expectedSize) &&
    isUint8Array(candidate.humidity, expectedSize)
  );
}

function isTagKindCompatible(id: string, kind: DependencyTagKind): boolean {
  if (kind === "artifact") return id.startsWith("artifact:");
  if (kind === "field") return id.startsWith("field:");
  if (kind === "effect") return id.startsWith("effect:");
  if (kind === "state") return id.startsWith("state:engine.");
  return false;
}
