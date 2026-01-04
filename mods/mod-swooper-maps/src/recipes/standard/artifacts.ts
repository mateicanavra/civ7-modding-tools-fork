import type {
  ClimateFieldBuffer,
  ExtendedMapContext,
  HeightfieldBuffer,
} from "@swooper/mapgen-core";
import { Type } from "typebox";
import type { OrogenyCacheInstance } from "@mapgen/domain/narrative/orogeny/cache.js";
import type { CorridorKind, CorridorStyle } from "@mapgen/domain/narrative/corridors/types.js";
import type { PlacementInputsV1 } from "./stages/placement/placement-inputs.js";
import { isPlacementInputsV1 } from "./stages/placement/placement-inputs.js";
import type { PlacementOutputsV1 } from "./stages/placement/placement-outputs.js";
import { isPlacementOutputsV1 } from "./stages/placement/placement-outputs.js";
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

export function isNarrativeCorridorsV1(value: unknown): value is NarrativeCorridorsV1 {
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

export function isNarrativeMotifsMarginsV1(
  value: unknown
): value is NarrativeMotifsMarginsV1 {
  if (!isRecord(value)) return false;
  return value.activeMargin instanceof Set && value.passiveShelf instanceof Set;
}

export function isNarrativeMotifsHotspotsV1(
  value: unknown
): value is NarrativeMotifsHotspotsV1 {
  if (!isRecord(value)) return false;
  if (!(value.points instanceof Set)) return false;
  if (!(value.paradise instanceof Set)) return false;
  if (!(value.volcanic instanceof Set)) return false;
  if (value.trails !== undefined && !isTrailArray(value.trails)) return false;
  return true;
}

export function isNarrativeMotifsRiftsV1(value: unknown): value is NarrativeMotifsRiftsV1 {
  if (!isRecord(value)) return false;
  return value.riftLine instanceof Set && value.riftShoulder instanceof Set;
}

export function isNarrativeMotifsOrogenyV1(
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

export function getPublishedNarrativeCorridors(
  ctx: ExtendedMapContext
): NarrativeCorridorsV1 | null {
  const value = ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1);
  if (!isNarrativeCorridorsV1(value)) return null;
  return value;
}

export function getPublishedNarrativeMotifsMargins(
  ctx: ExtendedMapContext
): NarrativeMotifsMarginsV1 | null {
  const value = ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1);
  if (!isNarrativeMotifsMarginsV1(value)) return null;
  return value;
}

export function getPublishedNarrativeMotifsHotspots(
  ctx: ExtendedMapContext
): NarrativeMotifsHotspotsV1 | null {
  const value = ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1);
  if (!isNarrativeMotifsHotspotsV1(value)) return null;
  return value;
}

export function getPublishedNarrativeMotifsRifts(
  ctx: ExtendedMapContext
): NarrativeMotifsRiftsV1 | null {
  const value = ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1);
  if (!isNarrativeMotifsRiftsV1(value)) return null;
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
