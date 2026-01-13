import { ENGINE_EFFECT_TAGS } from "@civ7/adapter";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { DependencyTagDefinition, TagOwner } from "@swooper/mapgen-core/engine";
import { placementArtifacts } from "./stages/placement/artifacts.js";
import type { PlacementInputsV1 } from "./stages/placement/placement-inputs.js";
import type { PlacementOutputsV1 } from "./stages/placement/placement-outputs.js";

export const M3_DEPENDENCY_TAGS = {
  field: {
    terrainType: "field:terrainType",
    elevation: "field:elevation",
    rainfall: "field:rainfall",
    biomeId: "field:biomeId",
    featureType: "field:featureType",
  },
} as const;

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

export const M3_CANONICAL_DEPENDENCY_TAGS: ReadonlySet<string> = new Set([
  ...Object.values(M3_DEPENDENCY_TAGS.field),
  ...Object.values(M4_EFFECT_TAGS.engine),
]);

const VERIFIED_EFFECT_TAGS = new Set<string>([
  M4_EFFECT_TAGS.engine.biomesApplied,
  M4_EFFECT_TAGS.engine.placementApplied,
]);

const EFFECT_OWNERS: Record<string, TagOwner> = {
  [M4_EFFECT_TAGS.engine.biomesApplied]: {
    pkg: "mod-swooper-maps",
    phase: "ecology",
    stepId: "biomes",
  },
  [M4_EFFECT_TAGS.engine.featuresApplied]: {
    pkg: "mod-swooper-maps",
    phase: "ecology",
    stepId: "features-apply",
  },
  [M4_EFFECT_TAGS.engine.placementApplied]: {
    pkg: "mod-swooper-maps",
    phase: "placement",
    stepId: "placement",
  },
};

type SatisfactionState = {
  satisfied: ReadonlySet<string>;
};

export const STANDARD_TAG_DEFINITIONS: readonly DependencyTagDefinition<ExtendedMapContext>[] = [
  {
    id: M3_DEPENDENCY_TAGS.field.terrainType,
    kind: "field",
    satisfies: (context) => isUint8Array(context.fields?.terrainType, getExpectedSize(context)),
    demo: new Uint8Array(0),
    validateDemo: (demo) => isUint8Array(demo),
  },
  {
    id: M3_DEPENDENCY_TAGS.field.elevation,
    kind: "field",
    satisfies: (context) => isInt16Array(context.fields?.elevation, getExpectedSize(context)),
    demo: new Int16Array(0),
    validateDemo: (demo) => isInt16Array(demo),
  },
  {
    id: M3_DEPENDENCY_TAGS.field.rainfall,
    kind: "field",
    satisfies: (context) => isUint8Array(context.fields?.rainfall, getExpectedSize(context)),
    demo: new Uint8Array(0),
    validateDemo: (demo) => isUint8Array(demo),
  },
  {
    id: M3_DEPENDENCY_TAGS.field.biomeId,
    kind: "field",
    satisfies: (context) => isUint8Array(context.fields?.biomeId, getExpectedSize(context)),
    demo: new Uint8Array(0),
    validateDemo: (demo) => isUint8Array(demo),
  },
  {
    id: M3_DEPENDENCY_TAGS.field.featureType,
    kind: "field",
    satisfies: (context) => isInt16Array(context.fields?.featureType, getExpectedSize(context)),
    demo: new Int16Array(0),
    validateDemo: (demo) => isInt16Array(demo),
  },
  ...Object.values(M4_EFFECT_TAGS.engine).map((id) => {
    const definition: DependencyTagDefinition<ExtendedMapContext> = {
      id,
      kind: "effect",
    };
    const owner = EFFECT_OWNERS[id];
    if (owner) {
      definition.owner = owner;
    }
    if (VERIFIED_EFFECT_TAGS.has(id)) {
      if (id === M4_EFFECT_TAGS.engine.placementApplied) {
        definition.satisfies = (context, state) => isPlacementOutputSatisfied(context, state);
      } else {
        definition.satisfies = (context) => context.adapter.verifyEffect(id);
      }
    }
    return definition;
  }),
];

export function registerStandardTags(registry: {
  registerTags: (definitions: readonly DependencyTagDefinition<ExtendedMapContext>[]) => void;
}): void {
  registry.registerTags(STANDARD_TAG_DEFINITIONS);
}

function isPlacementOutputSatisfied(context: ExtendedMapContext, state: SatisfactionState): boolean {
  if (!state.satisfied.has(M4_EFFECT_TAGS.engine.placementApplied)) return false;

  const outputs = context.artifacts.get(placementArtifacts.placementOutputs.id);
  if (!outputs || typeof outputs !== "object") return false;
  const candidate = outputs as PlacementOutputsV1;

  const counts = [
    candidate.naturalWondersCount,
    candidate.floodplainsCount,
    candidate.snowTilesCount,
    candidate.resourcesCount,
    candidate.startsAssigned,
    candidate.discoveriesCount,
  ];
  if (!counts.every((value) => Number.isFinite(value) && value >= 0)) return false;
  if (!Number.isInteger(candidate.startsAssigned)) return false;

  const inputs = context.artifacts.get(placementArtifacts.placementInputs.id);
  if (inputs && typeof inputs === "object") {
    const candidates = inputs as PlacementInputsV1;
    const expectedPlayers =
      (candidates.starts?.playersLandmass1 ?? 0) + (candidates.starts?.playersLandmass2 ?? 0);
    if (expectedPlayers > 0 && candidate.startsAssigned < expectedPlayers) return false;
  }

  return true;
}

function getExpectedSize(context: ExtendedMapContext): number {
  return context.dimensions.width * context.dimensions.height;
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
