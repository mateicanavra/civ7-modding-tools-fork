import { ENGINE_EFFECT_TAGS } from "@civ7/adapter";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
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
} from "@swooper/mapgen-core";
import type { DependencyTagDefinition, TagOwner } from "@swooper/mapgen-core/engine";
import {
  biomeClassificationArtifact,
  climateFieldArtifact,
  featureIntentsArtifact,
  heightfieldArtifact,
  narrativeCorridorsArtifact,
  narrativeMotifsHotspotsArtifact,
  narrativeMotifsMarginsArtifact,
  narrativeMotifsOrogenyArtifact,
  narrativeMotifsRiftsArtifact,
  pedologyArtifact,
  placementInputsArtifact,
  placementOutputsArtifact,
  resourceBasinsArtifact,
  riverAdjacencyArtifact,
} from "./artifacts.js";

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
    biomeClassificationV1: "artifact:ecology.biomeClassification@v1",
    pedologyV1: "artifact:ecology.soils@v1",
    resourceBasinsV1: "artifact:ecology.resourceBasins@v1",
    featureIntentsV1: "artifact:ecology.featureIntents@v1",
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

const demoDimensions = { width: 0, height: 0 } as const;

type SatisfactionState = {
  satisfied: ReadonlySet<string>;
};

export const STANDARD_TAG_DEFINITIONS: readonly DependencyTagDefinition<ExtendedMapContext>[] = [
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
      heightfieldArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.heightfield),
        context.dimensions
      ).length === 0,
    demo: {
      elevation: new Int16Array(0),
      terrain: new Uint8Array(0),
      landMask: new Uint8Array(0),
    },
    validateDemo: (demo) => heightfieldArtifact.validate(demo, demoDimensions).length === 0,
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.climateField,
    kind: "artifact",
    satisfies: (context) =>
      climateFieldArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.climateField),
        context.dimensions
      ).length === 0,
    demo: {
      rainfall: new Uint8Array(0),
      humidity: new Uint8Array(0),
    },
    validateDemo: (demo) => climateFieldArtifact.validate(demo, demoDimensions).length === 0,
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
    kind: "artifact",
    satisfies: (context) =>
      biomeClassificationArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1),
        context.dimensions
      ).length === 0,
    demo: {
      width: 0,
      height: 0,
      biomeIndex: new Uint8Array(0),
      vegetationDensity: new Float32Array(0),
      effectiveMoisture: new Float32Array(0),
      surfaceTemperature: new Float32Array(0),
      aridityIndex: new Float32Array(0),
      freezeIndex: new Float32Array(0),
    },
    validateDemo: (demo) =>
      biomeClassificationArtifact.validate(demo, demoDimensions).length === 0,
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.pedologyV1,
    kind: "artifact",
    satisfies: (context) =>
      pedologyArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.pedologyV1),
        context.dimensions
      ).length === 0,
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.resourceBasinsV1,
    kind: "artifact",
    satisfies: (context) =>
      resourceBasinsArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.resourceBasinsV1),
        context.dimensions
      ).length === 0,
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.featureIntentsV1,
    kind: "artifact",
    satisfies: (context) =>
      featureIntentsArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.featureIntentsV1),
        context.dimensions
      ).length === 0,
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
      narrativeCorridorsArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1),
        context.dimensions
      ).length === 0,
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
    kind: "artifact",
    satisfies: (context) =>
      narrativeMotifsMarginsArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1),
        context.dimensions
      ).length === 0,
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
    kind: "artifact",
    satisfies: (context) =>
      narrativeMotifsHotspotsArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1),
        context.dimensions
      ).length === 0,
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
    kind: "artifact",
    satisfies: (context) =>
      narrativeMotifsRiftsArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1),
        context.dimensions
      ).length === 0,
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.narrativeMotifsOrogenyV1,
    kind: "artifact",
    satisfies: (context) =>
      narrativeMotifsOrogenyArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeMotifsOrogenyV1),
        context.dimensions
      ).length === 0,
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
    kind: "artifact",
    satisfies: (context) =>
      riverAdjacencyArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.riverAdjacency),
        context.dimensions
      ).length === 0,
    demo: new Uint8Array(0),
    validateDemo: (demo) => riverAdjacencyArtifact.validate(demo, demoDimensions).length === 0,
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.placementInputsV1,
    kind: "artifact",
    satisfies: (context) =>
      placementInputsArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.placementInputsV1),
        context.dimensions
      ).length === 0,
    demo: {
      mapInfo: { NumNaturalWonders: 0 },
      starts: {
        playersLandmass1: 1,
        playersLandmass2: 1,
        westContinent: { west: 0, east: 0, south: 0, north: 0, continent: 0 },
        eastContinent: { west: 0, east: 0, south: 0, north: 0, continent: 1 },
        startSectorRows: 1,
        startSectorCols: 1,
        startSectors: [],
      },
      wonders: { wondersCount: 1 },
      floodplains: { minLength: 4, maxLength: 10 },
      placementConfig: {
        wonders: { strategy: "default", config: { wondersPlusOne: true } },
        floodplains: { strategy: "default", config: { minLength: 4, maxLength: 10 } },
        starts: { strategy: "default", config: {} },
      },
    },
    validateDemo: (demo) => placementInputsArtifact.validate(demo, demoDimensions).length === 0,
  },
  {
    id: M3_DEPENDENCY_TAGS.artifact.placementOutputsV1,
    kind: "artifact",
    satisfies: (context) =>
      placementOutputsArtifact.validate(
        context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.placementOutputsV1),
        context.dimensions
      ).length === 0,
    demo: {
      naturalWondersCount: 0,
      floodplainsCount: 0,
      snowTilesCount: 0,
      resourcesCount: 0,
      startsAssigned: 0,
      discoveriesCount: 0,
    },
    validateDemo: (demo) => placementOutputsArtifact.validate(demo, demoDimensions).length === 0,
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

export function registerStandardTags(registry: {
  registerTags: (definitions: readonly DependencyTagDefinition<ExtendedMapContext>[]) => void;
}): void {
  registry.registerTags(STANDARD_TAG_DEFINITIONS);
}

function isPlacementOutputSatisfied(context: ExtendedMapContext, state: SatisfactionState): boolean {
  if (!state.satisfied.has(M4_EFFECT_TAGS.engine.placementApplied)) return false;

  let outputs: ReturnType<typeof placementOutputsArtifact["get"]>;
  try {
    outputs = placementOutputsArtifact.get(context);
  } catch {
    return false;
  }

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

  try {
    const inputs = placementInputsArtifact.get(context);
    const expectedPlayers =
      (inputs.starts?.playersLandmass1 ?? 0) + (inputs.starts?.playersLandmass2 ?? 0);
    if (expectedPlayers > 0 && outputs.startsAssigned < expectedPlayers) return false;
  } catch {
    // Placement inputs validation is optional for placementApplied satisfaction.
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
