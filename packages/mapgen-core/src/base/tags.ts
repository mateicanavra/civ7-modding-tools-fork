import { ENGINE_EFFECT_TAGS } from "@civ7/adapter";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import {
  isNarrativeCorridorsV1,
  isNarrativeMotifsHotspotsV1,
  isNarrativeMotifsMarginsV1,
  isNarrativeMotifsOrogenyV1,
  isNarrativeMotifsRiftsV1,
} from "@mapgen/domain/narrative/artifacts.js";
import { isPlacementInputsV1 } from "@mapgen/base/pipeline/placement/placement-inputs.js";
import { isPlacementOutputsV1 } from "@mapgen/base/pipeline/placement/placement-outputs.js";
import {
  FOUNDATION_CONFIG_ARTIFACT_TAG,
  FOUNDATION_DIAGNOSTICS_ARTIFACT_TAG,
  FOUNDATION_DYNAMICS_ARTIFACT_TAG,
  FOUNDATION_PLATES_ARTIFACT_TAG,
  FOUNDATION_SEED_ARTIFACT_TAG,
  validateFoundationConfigArtifact,
  validateFoundationDiagnosticsArtifact,
  validateFoundationDynamicsArtifact,
  validateFoundationPlatesArtifact,
  validateFoundationSeedArtifact,
} from "@mapgen/core/types.js";
import type { DependencyTagDefinition, TagOwner } from "@mapgen/engine/tags.js";

export const M3_DEPENDENCY_TAGS = {
  artifact: {
    foundationPlatesV1: FOUNDATION_PLATES_ARTIFACT_TAG,
    foundationDynamicsV1: FOUNDATION_DYNAMICS_ARTIFACT_TAG,
    foundationSeedV1: FOUNDATION_SEED_ARTIFACT_TAG,
    foundationDiagnosticsV1: FOUNDATION_DIAGNOSTICS_ARTIFACT_TAG,
    foundationConfigV1: FOUNDATION_CONFIG_ARTIFACT_TAG,
    heightfield: "artifact:heightfield",
    climateField: "artifact:climateField",
    storyOverlays: "artifact:storyOverlays",
    riverAdjacency: "artifact:riverAdjacency",
    narrativeCorridorsV1: "artifact:narrative.corridors@v1",
    narrativeMotifsMarginsV1: "artifact:narrative.motifs.margins@v1",
    narrativeMotifsHotspotsV1: "artifact:narrative.motifs.hotspots@v1",
    narrativeMotifsRiftsV1: "artifact:narrative.motifs.rifts@v1",
    narrativeMotifsOrogenyV1: "artifact:narrative.motifs.orogeny@v1",
    placementInputsV1: "artifact:placementInputs@v1",
    placementOutputsV1: "artifact:placementOutputs@v1",
  },
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
  ...Object.values(M3_DEPENDENCY_TAGS.artifact),
  ...Object.values(M3_DEPENDENCY_TAGS.field),
  ...Object.values(M4_EFFECT_TAGS.engine),
]);

const VERIFIED_EFFECT_TAGS = new Set<string>([
  M4_EFFECT_TAGS.engine.landmassApplied,
  M4_EFFECT_TAGS.engine.coastlinesApplied,
  M4_EFFECT_TAGS.engine.riversModeled,
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

type SatisfactionState = {
  satisfied: ReadonlySet<string>;
};

export const BASE_TAG_DEFINITIONS: readonly DependencyTagDefinition<ExtendedMapContext>[] = [
  {
    id: M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1,
    kind: "artifact",
    satisfies: (context) => isFoundationPlatesArtifactSatisfied(context),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1,
    kind: "artifact",
    satisfies: (context) => isFoundationDynamicsArtifactSatisfied(context),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.foundationSeedV1,
    kind: "artifact",
    satisfies: (context) => isFoundationSeedArtifactSatisfied(context),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.foundationDiagnosticsV1,
    kind: "artifact",
    satisfies: (context) => isFoundationDiagnosticsArtifactSatisfied(context),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.foundationConfigV1,
    kind: "artifact",
    satisfies: (context) => isFoundationConfigArtifactSatisfied(context),
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
    id: M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
    kind: "artifact",
    satisfies: (context) =>
      isNarrativeCorridorsV1(context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1)),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
    kind: "artifact",
    satisfies: (context) =>
      isNarrativeMotifsMarginsV1(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1)
      ),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
    kind: "artifact",
    satisfies: (context) =>
      isNarrativeMotifsHotspotsV1(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1)
      ),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
    kind: "artifact",
    satisfies: (context) =>
      isNarrativeMotifsRiftsV1(context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1)),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.narrativeMotifsOrogenyV1,
    kind: "artifact",
    satisfies: (context) =>
      isNarrativeMotifsOrogenyV1(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeMotifsOrogenyV1)
      ),
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
    kind: "artifact",
    satisfies: (context) =>
      isUint8Array(context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.riverAdjacency), getExpectedSize(context)),
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
    id: M3_DEPENDENCY_TAGS.artifact.placementOutputsV1,
    kind: "artifact",
    satisfies: (context) =>
      isPlacementOutputsV1(context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.placementOutputsV1)),
    demo: {
      naturalWondersCount: 0,
      floodplainsCount: 0,
      snowTilesCount: 0,
      resourcesCount: 0,
      startsAssigned: 0,
      discoveriesCount: 0,
    },
    validateDemo: (demo) => isPlacementOutputsV1(demo),
  },
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

export function registerBaseTags(registry: {
  registerTags: (definitions: readonly DependencyTagDefinition<ExtendedMapContext>[]) => void;
}): void {
  registry.registerTags(BASE_TAG_DEFINITIONS);
}

function isPlacementOutputSatisfied(context: ExtendedMapContext, state: SatisfactionState): boolean {
  if (!state.satisfied.has(M4_EFFECT_TAGS.engine.placementApplied)) return false;

  const outputs = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.placementOutputsV1);
  if (!isPlacementOutputsV1(outputs)) return false;

  const counts = [
    outputs.naturalWondersCount,
    outputs.floodplainsCount,
    outputs.snowTilesCount,
    outputs.resourcesCount,
    outputs.startsAssigned,
    outputs.discoveriesCount,
  ];
  if (!counts.every((value) => Number.isFinite(value) && value >= 0)) return false;
  if (!Number.isInteger(outputs.startsAssigned)) return false;

  const inputs = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.placementInputsV1);
  if (isPlacementInputsV1(inputs)) {
    const expectedPlayers =
      (inputs.starts?.playersLandmass1 ?? 0) + (inputs.starts?.playersLandmass2 ?? 0);
    if (expectedPlayers > 0 && outputs.startsAssigned < expectedPlayers) return false;
  }

  return true;
}

function isFoundationPlatesArtifactSatisfied(context: ExtendedMapContext): boolean {
  try {
    validateFoundationPlatesArtifact(
      context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1),
      context.dimensions
    );
    return true;
  } catch {
    return false;
  }
}

function isFoundationDynamicsArtifactSatisfied(context: ExtendedMapContext): boolean {
  try {
    validateFoundationDynamicsArtifact(
      context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1),
      context.dimensions
    );
    return true;
  } catch {
    return false;
  }
}

function isFoundationSeedArtifactSatisfied(context: ExtendedMapContext): boolean {
  try {
    validateFoundationSeedArtifact(
      context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.foundationSeedV1),
      context.dimensions
    );
    return true;
  } catch {
    return false;
  }
}

function isFoundationDiagnosticsArtifactSatisfied(context: ExtendedMapContext): boolean {
  try {
    validateFoundationDiagnosticsArtifact(
      context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.foundationDiagnosticsV1)
    );
    return true;
  } catch {
    return false;
  }
}

function isFoundationConfigArtifactSatisfied(context: ExtendedMapContext): boolean {
  try {
    validateFoundationConfigArtifact(
      context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.foundationConfigV1)
    );
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
  return isUint8Array(candidate.rainfall, expectedSize) && isUint8Array(candidate.humidity, expectedSize);
}
