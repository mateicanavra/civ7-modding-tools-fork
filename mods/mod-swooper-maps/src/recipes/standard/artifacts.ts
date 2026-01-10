import type {
  ClimateFieldBuffer,
  ExtendedMapContext,
  HeightfieldBuffer,
} from "@swooper/mapgen-core";
import { Type } from "typebox";
import type { OrogenyCacheInstance } from "@mapgen/domain/narrative/orogeny/cache.js";
import type { CorridorKind, CorridorStyle } from "@mapgen/domain/narrative/corridors/types.js";
import type { PlacementInputsV1 } from "./stages/placement/placement-inputs.js";
import type { PlacementOutputsV1 } from "./stages/placement/placement-outputs.js";
import { M3_DEPENDENCY_TAGS } from "./tags.js";

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

export interface PedologyArtifactV1 {
  width: number;
  height: number;
  soilType: Uint8Array;
  fertility: Float32Array;
}

export interface ResourceBasinsArtifactV1 {
  basins: Array<{
    resourceId: string;
    plots: number[];
    intensity: number[];
    confidence: number;
  }>;
}

export interface FeatureIntentsArtifactV1 {
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

function isBiomeClassificationArtifactV1(
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

function isPedologyArtifactV1(value: unknown): value is PedologyArtifactV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as PedologyArtifactV1;
  return (
    typeof candidate.width === "number" &&
    typeof candidate.height === "number" &&
    candidate.soilType instanceof Uint8Array &&
    candidate.fertility instanceof Float32Array
  );
}

function isResourceBasinsArtifactV1(value: unknown): value is ResourceBasinsArtifactV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as ResourceBasinsArtifactV1;
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

function isFeatureIntentsArtifactV1(value: unknown): value is FeatureIntentsArtifactV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as FeatureIntentsArtifactV1;
  return (
    Array.isArray(candidate.vegetation) &&
    Array.isArray(candidate.wetlands) &&
    Array.isArray(candidate.reefs) &&
    Array.isArray(candidate.ice)
  );
}

export type NarrativeCorridorAttributes = Readonly<Record<string, unknown>>;

export interface NarrativeCorridorsV1 {
  seaLanes: Set<string>;
  islandHops: Set<string>;
  landCorridors: Set<string>;
  riverCorridors: Set<string>;
  kindByTile: Map<string, CorridorKind>;
  styleByTile: Map<string, CorridorStyle>;
  attributesByTile: Map<string, NarrativeCorridorAttributes>;
}

export interface NarrativeMotifsMarginsV1 {
  activeMargin: Set<string>;
  passiveShelf: Set<string>;
}

export interface NarrativeMotifsHotspotsV1 {
  points: Set<string>;
  paradise: Set<string>;
  volcanic: Set<string>;
  trails?: Array<{ coords: Array<{ x: number; y: number }>; kind: string }>;
}

export interface NarrativeMotifsRiftsV1 {
  riftLine: Set<string>;
  riftShoulder: Set<string>;
}

export interface NarrativeMotifsOrogenyV1 {
  belts: Set<string>;
  windward: Set<string>;
  lee: Set<string>;
}

export interface NarrativeCorridorsSource {
  seaLanes: Iterable<string>;
  islandHops: Iterable<string>;
  landCorridors: Iterable<string>;
  riverCorridors: Iterable<string>;
  kindByTile: Map<string, CorridorKind>;
  styleByTile: Map<string, CorridorStyle>;
  attributesByTile: Map<string, NarrativeCorridorAttributes>;
}

export interface NarrativeMotifsMarginsSource {
  activeMargin: Iterable<string>;
  passiveShelf: Iterable<string>;
}

export interface NarrativeMotifsHotspotsSource {
  points: Iterable<string>;
  paradise?: Iterable<string>;
  volcanic?: Iterable<string>;
  trails?: Array<{ coords: Array<{ x: number; y: number }>; kind: string }>;
}

export interface NarrativeMotifsRiftsSource {
  riftLine: Iterable<string>;
  riftShoulder: Iterable<string>;
}

export function buildNarrativeCorridorsV1(source: NarrativeCorridorsSource): NarrativeCorridorsV1 {
  return {
    seaLanes: cloneSet(source.seaLanes),
    islandHops: cloneSet(source.islandHops),
    landCorridors: cloneSet(source.landCorridors),
    riverCorridors: cloneSet(source.riverCorridors),
    kindByTile: cloneCorridorKinds(source.kindByTile),
    styleByTile: cloneCorridorStyles(source.styleByTile),
    attributesByTile: cloneMap(source.attributesByTile),
  };
}

export function buildNarrativeMotifsMarginsV1(
  source: NarrativeMotifsMarginsSource
): NarrativeMotifsMarginsV1 {
  return {
    activeMargin: cloneSet(source.activeMargin),
    passiveShelf: cloneSet(source.passiveShelf),
  };
}

export function buildNarrativeMotifsHotspotsV1(
  source: NarrativeMotifsHotspotsSource
): NarrativeMotifsHotspotsV1 {
  return {
    points: cloneSet(source.points),
    paradise: cloneSet(source.paradise ?? []),
    volcanic: cloneSet(source.volcanic ?? []),
    trails: source.trails,
  };
}

export function buildNarrativeMotifsRiftsV1(
  source: NarrativeMotifsRiftsSource
): NarrativeMotifsRiftsV1 {
  return {
    riftLine: cloneSet(source.riftLine),
    riftShoulder: cloneSet(source.riftShoulder),
  };
}

export function buildNarrativeMotifsOrogenyV1(
  cache: OrogenyCacheInstance
): NarrativeMotifsOrogenyV1 {
  return {
    belts: cloneSet(cache.belts),
    windward: cloneSet(cache.windward),
    lee: cloneSet(cache.lee),
  };
}

function isNarrativeCorridorsV1(value: unknown): value is NarrativeCorridorsV1 {
  if (!isRecord(value)) return false;
  return (
    value.seaLanes instanceof Set &&
    value.islandHops instanceof Set &&
    value.landCorridors instanceof Set &&
    value.riverCorridors instanceof Set &&
    value.kindByTile instanceof Map &&
    value.styleByTile instanceof Map &&
    value.attributesByTile instanceof Map
  );
}

function isNarrativeMotifsMarginsV1(
  value: unknown
): value is NarrativeMotifsMarginsV1 {
  if (!isRecord(value)) return false;
  return value.activeMargin instanceof Set && value.passiveShelf instanceof Set;
}

function isNarrativeMotifsHotspotsV1(
  value: unknown
): value is NarrativeMotifsHotspotsV1 {
  if (!isRecord(value)) return false;
  if (!(value.points instanceof Set)) return false;
  if (!(value.paradise instanceof Set)) return false;
  if (!(value.volcanic instanceof Set)) return false;
  if (value.trails !== undefined && !isTrailArray(value.trails)) return false;
  return true;
}

function isNarrativeMotifsRiftsV1(value: unknown): value is NarrativeMotifsRiftsV1 {
  if (!isRecord(value)) return false;
  return value.riftLine instanceof Set && value.riftShoulder instanceof Set;
}

function isNarrativeMotifsOrogenyV1(
  value: unknown
): value is NarrativeMotifsOrogenyV1 {
  if (!isRecord(value)) return false;
  return value.belts instanceof Set && value.windward instanceof Set && value.lee instanceof Set;
}

function cloneSet<T>(value: Iterable<T>): Set<T> {
  return new Set(value);
}

function cloneMap<K, V>(value: Map<K, V>): Map<K, V> {
  return new Map(value);
}

function cloneCorridorKinds(value: Map<string, CorridorKind>): Map<string, CorridorKind> {
  const cloned = new Map<string, CorridorKind>();
  for (const [key, kind] of value.entries()) {
    cloned.set(key, kind as CorridorKind);
  }
  return cloned;
}

function cloneCorridorStyles(value: Map<string, CorridorStyle>): Map<string, CorridorStyle> {
  const cloned = new Map<string, CorridorStyle>();
  for (const [key, style] of value.entries()) {
    cloned.set(key, style as CorridorStyle);
  }
  return cloned;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isTrailArray(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.every(isTrail);
}

function isTrail(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.coords)) return false;
  if (typeof value.kind !== "string") return false;
  return value.coords.every(isCoord);
}

function isCoord(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.x === "number" && typeof value.y === "number";
}

type ArtifactValidationIssue = Readonly<{ message: string }>;

type ArtifactHandler<T> = Readonly<{
  validate: (value: unknown, dimensions: ExtendedMapContext["dimensions"]) => ArtifactValidationIssue[];
  assert: (value: unknown, dimensions: ExtendedMapContext["dimensions"]) => asserts value is T;
  get: (context: ExtendedMapContext) => T;
  set: (context: ExtendedMapContext, value: T) => T;
}>;

function formatArtifactError(tagId: string, errors: ArtifactValidationIssue[]): string {
  const detail = errors.map((error) => error.message).join("; ");
  return `[Artifact:${tagId}] ${detail}`;
}

function createArtifactHandler<T>(
  tagId: string,
  validate: (value: unknown, dimensions: ExtendedMapContext["dimensions"]) => ArtifactValidationIssue[]
): ArtifactHandler<T> {
  return {
    validate,
    assert: (value, dimensions) => {
      const errors = validate(value, dimensions);
      if (errors.length > 0) throw new Error(formatArtifactError(tagId, errors));
    },
    get: (context) => {
      const value = context.artifacts.get(tagId);
      const errors = validate(value, context.dimensions);
      if (errors.length > 0) throw new Error(formatArtifactError(tagId, errors));
      return value as T;
    },
    set: (context, value) => {
      const errors = validate(value, context.dimensions);
      if (errors.length > 0) throw new Error(formatArtifactError(tagId, errors));
      context.artifacts.set(tagId, value);
      return value;
    },
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function expectedSize(dimensions: ExtendedMapContext["dimensions"]): number {
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

function validateHeightfieldBuffer(
  value: unknown,
  dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing heightfield buffer." });
    return errors;
  }
  const size = expectedSize(dimensions);
  const candidate = value as {
    elevation?: unknown;
    terrain?: unknown;
    landMask?: unknown;
  };
  validateTypedArray(errors, "heightfield.elevation", candidate.elevation, Int16Array, size);
  validateTypedArray(errors, "heightfield.terrain", candidate.terrain, Uint8Array, size);
  validateTypedArray(errors, "heightfield.landMask", candidate.landMask, Uint8Array, size);
  return errors;
}

function validateClimateFieldBuffer(
  value: unknown,
  dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing climate field buffer." });
    return errors;
  }
  const size = expectedSize(dimensions);
  const candidate = value as { rainfall?: unknown; humidity?: unknown };
  validateTypedArray(errors, "climate.rainfall", candidate.rainfall, Uint8Array, size);
  validateTypedArray(errors, "climate.humidity", candidate.humidity, Uint8Array, size);
  return errors;
}

function validateRiverAdjacencyMask(
  value: unknown,
  dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  const size = expectedSize(dimensions);
  validateTypedArray(errors, "riverAdjacency", value, Uint8Array, size);
  return errors;
}

function validateBiomeClassificationArtifact(
  value: unknown,
  dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isBiomeClassificationArtifactV1(value)) {
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

function validatePedologyArtifact(
  value: unknown,
  dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isPedologyArtifactV1(value)) {
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

function validateResourceBasinsArtifact(
  value: unknown,
  _dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isResourceBasinsArtifactV1(value)) {
    errors.push({ message: "Invalid resource basins artifact payload." });
    return errors;
  }
  for (const basin of value.basins) {
    if (basin.plots.length !== basin.intensity.length) {
      errors.push({ message: "Resource basin plots/intensity length mismatch." });
      break;
    }
  }
  return errors;
}

function validateFeatureIntentsArtifact(
  value: unknown,
  _dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isFeatureIntentsArtifactV1(value)) {
    errors.push({ message: "Invalid feature intents artifact payload." });
  }
  return errors;
}

function validateNarrativeCorridors(
  value: unknown,
  _dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  return isNarrativeCorridorsV1(value)
    ? []
    : [{ message: "Invalid narrative corridors payload." }];
}

function validateNarrativeMotifsMargins(
  value: unknown,
  _dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  return isNarrativeMotifsMarginsV1(value)
    ? []
    : [{ message: "Invalid narrative motifs margins payload." }];
}

function validateNarrativeMotifsHotspots(
  value: unknown,
  _dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  return isNarrativeMotifsHotspotsV1(value)
    ? []
    : [{ message: "Invalid narrative motifs hotspots payload." }];
}

function validateNarrativeMotifsRifts(
  value: unknown,
  _dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  return isNarrativeMotifsRiftsV1(value)
    ? []
    : [{ message: "Invalid narrative motifs rifts payload." }];
}

function validateNarrativeMotifsOrogeny(
  value: unknown,
  _dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  return isNarrativeMotifsOrogenyV1(value)
    ? []
    : [{ message: "Invalid narrative motifs orogeny payload." }];
}

function validatePlacementInputsArtifact(
  value: unknown,
  _dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing placement inputs payload." });
    return errors;
  }
  const candidate = value as PlacementInputsV1;
  if (!isRecord(candidate.mapInfo)) errors.push({ message: "placementInputs.mapInfo must be an object." });
  if (!isRecord(candidate.starts)) errors.push({ message: "placementInputs.starts must be an object." });
  if (!isRecord(candidate.wonders)) errors.push({ message: "placementInputs.wonders must be an object." });
  if (!isRecord(candidate.floodplains)) errors.push({ message: "placementInputs.floodplains must be an object." });
  if (!isRecord(candidate.placementConfig)) errors.push({ message: "placementInputs.placementConfig must be an object." });
  return errors;
}

function validatePlacementOutputsArtifact(
  value: unknown,
  _dimensions: ExtendedMapContext["dimensions"]
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing placement outputs payload." });
    return errors;
  }
  const candidate = value as PlacementOutputsV1;
  if (!isFiniteNumber(candidate.naturalWondersCount)) errors.push({ message: "placementOutputs.naturalWondersCount must be a number." });
  if (!isFiniteNumber(candidate.floodplainsCount)) errors.push({ message: "placementOutputs.floodplainsCount must be a number." });
  if (!isFiniteNumber(candidate.snowTilesCount)) errors.push({ message: "placementOutputs.snowTilesCount must be a number." });
  if (!isFiniteNumber(candidate.resourcesCount)) errors.push({ message: "placementOutputs.resourcesCount must be a number." });
  if (!isFiniteNumber(candidate.startsAssigned)) errors.push({ message: "placementOutputs.startsAssigned must be a number." });
  if (!isFiniteNumber(candidate.discoveriesCount)) errors.push({ message: "placementOutputs.discoveriesCount must be a number." });
  if (candidate.methodCalls !== undefined) {
    if (!Array.isArray(candidate.methodCalls)) {
      errors.push({ message: "placementOutputs.methodCalls must be an array when provided." });
    } else if (!candidate.methodCalls.every((call) => isRecord(call) && typeof call.method === "string")) {
      errors.push({ message: "placementOutputs.methodCalls entries must include a method string." });
    }
  }
  return errors;
}

export const heightfieldArtifact = createArtifactHandler<HeightfieldBuffer>(
  M3_DEPENDENCY_TAGS.artifact.heightfield,
  validateHeightfieldBuffer
);
export const climateFieldArtifact = createArtifactHandler<ClimateFieldBuffer>(
  M3_DEPENDENCY_TAGS.artifact.climateField,
  validateClimateFieldBuffer
);
export const riverAdjacencyArtifact = createArtifactHandler<Uint8Array>(
  M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
  validateRiverAdjacencyMask
);
export const biomeClassificationArtifact = createArtifactHandler<BiomeClassificationArtifactV1>(
  M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
  validateBiomeClassificationArtifact
);
export const pedologyArtifact = createArtifactHandler<PedologyArtifactV1>(
  M3_DEPENDENCY_TAGS.artifact.pedologyV1,
  validatePedologyArtifact
);
export const resourceBasinsArtifact = createArtifactHandler<ResourceBasinsArtifactV1>(
  M3_DEPENDENCY_TAGS.artifact.resourceBasinsV1,
  validateResourceBasinsArtifact
);
export const featureIntentsArtifact = createArtifactHandler<FeatureIntentsArtifactV1>(
  M3_DEPENDENCY_TAGS.artifact.featureIntentsV1,
  validateFeatureIntentsArtifact
);
export const narrativeCorridorsArtifact = createArtifactHandler<NarrativeCorridorsV1>(
  M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
  validateNarrativeCorridors
);
export const narrativeMotifsMarginsArtifact = createArtifactHandler<NarrativeMotifsMarginsV1>(
  M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
  validateNarrativeMotifsMargins
);
export const narrativeMotifsHotspotsArtifact = createArtifactHandler<NarrativeMotifsHotspotsV1>(
  M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
  validateNarrativeMotifsHotspots
);
export const narrativeMotifsRiftsArtifact = createArtifactHandler<NarrativeMotifsRiftsV1>(
  M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
  validateNarrativeMotifsRifts
);
export const narrativeMotifsOrogenyArtifact = createArtifactHandler<NarrativeMotifsOrogenyV1>(
  M3_DEPENDENCY_TAGS.artifact.narrativeMotifsOrogenyV1,
  validateNarrativeMotifsOrogeny
);
export const placementInputsArtifact = createArtifactHandler<PlacementInputsV1>(
  M3_DEPENDENCY_TAGS.artifact.placementInputsV1,
  validatePlacementInputsArtifact
);
export const placementOutputsArtifact = createArtifactHandler<PlacementOutputsV1>(
  M3_DEPENDENCY_TAGS.artifact.placementOutputsV1,
  validatePlacementOutputsArtifact
);

export function publishHeightfieldArtifact(ctx: ExtendedMapContext): HeightfieldBuffer {
  const value = ctx.buffers.heightfield;
  return heightfieldArtifact.set(ctx, value);
}

export function publishClimateFieldArtifact(ctx: ExtendedMapContext): ClimateFieldBuffer {
  const value = ctx.buffers.climate;
  return climateFieldArtifact.set(ctx, value);
}

export function publishRiverAdjacencyArtifact(
  ctx: ExtendedMapContext,
  mask: Uint8Array
): Uint8Array {
  return riverAdjacencyArtifact.set(ctx, mask);
}

export function publishBiomeClassificationArtifact(
  ctx: ExtendedMapContext,
  artifact: BiomeClassificationArtifactV1
): BiomeClassificationArtifactV1 {
  return biomeClassificationArtifact.set(ctx, artifact);
}

export function publishPlacementInputsArtifact(
  ctx: ExtendedMapContext,
  inputs: PlacementInputsV1
): PlacementInputsV1 {
  return placementInputsArtifact.set(ctx, inputs);
}

export function publishPlacementOutputsArtifact(
  ctx: ExtendedMapContext,
  outputs: PlacementOutputsV1
): PlacementOutputsV1 {
  return placementOutputsArtifact.set(ctx, outputs);
}

export function getPublishedClimateField(ctx: ExtendedMapContext): ClimateFieldBuffer {
  return climateFieldArtifact.get(ctx);
}

export function getPublishedRiverAdjacency(ctx: ExtendedMapContext): Uint8Array {
  return riverAdjacencyArtifact.get(ctx);
}

export function getPublishedBiomeClassification(
  ctx: ExtendedMapContext
): BiomeClassificationArtifactV1 {
  return biomeClassificationArtifact.get(ctx);
}

export function getPublishedNarrativeCorridors(
  ctx: ExtendedMapContext
): NarrativeCorridorsV1 {
  return narrativeCorridorsArtifact.get(ctx);
}

export function getPublishedNarrativeMotifsMargins(
  ctx: ExtendedMapContext
): NarrativeMotifsMarginsV1 {
  return narrativeMotifsMarginsArtifact.get(ctx);
}

export function getPublishedNarrativeMotifsHotspots(
  ctx: ExtendedMapContext
): NarrativeMotifsHotspotsV1 {
  return narrativeMotifsHotspotsArtifact.get(ctx);
}

export function getPublishedNarrativeMotifsRifts(
  ctx: ExtendedMapContext
): NarrativeMotifsRiftsV1 {
  return narrativeMotifsRiftsArtifact.get(ctx);
}

export function getPublishedPlacementInputs(ctx: ExtendedMapContext): PlacementInputsV1 {
  return placementInputsArtifact.get(ctx);
}

export function getPublishedPlacementOutputs(ctx: ExtendedMapContext): PlacementOutputsV1 {
  return placementOutputsArtifact.get(ctx);
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
