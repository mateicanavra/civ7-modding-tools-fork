import type { MapDimensions } from "@civ7/adapter";
import { validateFoundationPlatesArtifact } from "@swooper/mapgen-core";

export type ArtifactValidationIssue = Readonly<{ message: string }>;

export function wrapFoundationValidate(
  value: unknown,
  dimensions: MapDimensions,
  validator: (value: unknown, dims: MapDimensions) => void
): ArtifactValidationIssue[] {
  try {
    validator(value, dimensions);
    return [];
  } catch (error) {
    return [{ message: error instanceof Error ? error.message : String(error) }];
  }
}

export function wrapFoundationValidateNoDims(
  value: unknown,
  validator: (value: unknown) => void
): ArtifactValidationIssue[] {
  try {
    validator(value);
    return [];
  } catch (error) {
    return [{ message: error instanceof Error ? error.message : String(error) }];
  }
}

export function validateMeshArtifact(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error("[FoundationArtifact] Missing foundation mesh artifact payload.");
  }
  const mesh = value as {
    cellCount?: number;
    wrapWidth?: number;
    siteX?: unknown;
    siteY?: unknown;
    neighborsOffsets?: unknown;
    neighbors?: unknown;
    areas?: unknown;
  };
  const cellCount = typeof mesh.cellCount === "number" ? (mesh.cellCount | 0) : 0;
  if (cellCount <= 0) {
    throw new Error("[FoundationArtifact] Invalid foundation mesh cellCount.");
  }
  if (typeof mesh.wrapWidth !== "number" || !Number.isFinite(mesh.wrapWidth) || mesh.wrapWidth <= 0) {
    throw new Error("[FoundationArtifact] Invalid foundation mesh.wrapWidth.");
  }
  if (!(mesh.siteX instanceof Float32Array) || mesh.siteX.length !== cellCount) {
    throw new Error("[FoundationArtifact] Invalid foundation mesh.siteX.");
  }
  if (!(mesh.siteY instanceof Float32Array) || mesh.siteY.length !== cellCount) {
    throw new Error("[FoundationArtifact] Invalid foundation mesh.siteY.");
  }
  if (!(mesh.areas instanceof Float32Array) || mesh.areas.length !== cellCount) {
    throw new Error("[FoundationArtifact] Invalid foundation mesh.areas.");
  }
  if (!(mesh.neighborsOffsets instanceof Int32Array) || mesh.neighborsOffsets.length !== cellCount + 1) {
    throw new Error("[FoundationArtifact] Invalid foundation mesh.neighborsOffsets.");
  }
  if (!(mesh.neighbors instanceof Int32Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation mesh.neighbors.");
  }
}

export function validateCrustArtifact(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error("[FoundationArtifact] Missing foundation crust artifact payload.");
  }
  const crust = value as { type?: unknown; age?: unknown; buoyancy?: unknown; baseElevation?: unknown; strength?: unknown };
  if (!(crust.type instanceof Uint8Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crust.type.");
  }
  if (!(crust.age instanceof Uint8Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crust.age.");
  }
  if (!(crust.buoyancy instanceof Float32Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crust.buoyancy.");
  }
  if (!(crust.baseElevation instanceof Float32Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crust.baseElevation.");
  }
  if (!(crust.strength instanceof Float32Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crust.strength.");
  }
  if (crust.type.length <= 0 || crust.age.length <= 0 || crust.type.length !== crust.age.length) {
    throw new Error("[FoundationArtifact] Invalid foundation crust tensor lengths.");
  }
  if (
    crust.buoyancy.length !== crust.type.length ||
    crust.baseElevation.length !== crust.type.length ||
    crust.strength.length !== crust.type.length
  ) {
    throw new Error("[FoundationArtifact] Invalid foundation crust driver tensor lengths.");
  }
}

export function validateTileToCellIndexArtifact(value: unknown, dims: MapDimensions): void {
  if (!(value instanceof Int32Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation tileToCellIndex.");
  }

  const expectedLen = Math.max(0, (dims.width | 0) * (dims.height | 0));
  if (value.length !== expectedLen) {
    throw new Error("[FoundationArtifact] Invalid foundation tileToCellIndex tensor length.");
  }
  for (let i = 0; i < value.length; i++) {
    const v = value[i] | 0;
    if (v < 0) {
      throw new Error("[FoundationArtifact] Invalid foundation tileToCellIndex value.");
    }
  }
}

export function validateCrustTilesArtifact(value: unknown, dims: MapDimensions): void {
  if (!value || typeof value !== "object") {
    throw new Error("[FoundationArtifact] Missing foundation crustTiles artifact payload.");
  }
  const crust = value as { type?: unknown; age?: unknown; buoyancy?: unknown; baseElevation?: unknown; strength?: unknown };
  if (!(crust.type instanceof Uint8Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crustTiles.type.");
  }
  if (!(crust.age instanceof Uint8Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crustTiles.age.");
  }
  if (!(crust.buoyancy instanceof Float32Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crustTiles.buoyancy.");
  }
  if (!(crust.baseElevation instanceof Float32Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crustTiles.baseElevation.");
  }
  if (!(crust.strength instanceof Float32Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crustTiles.strength.");
  }

  const expectedLen = Math.max(0, (dims.width | 0) * (dims.height | 0));
  if (
    crust.type.length !== expectedLen ||
    crust.age.length !== expectedLen ||
    crust.buoyancy.length !== expectedLen ||
    crust.baseElevation.length !== expectedLen ||
    crust.strength.length !== expectedLen
  ) {
    throw new Error("[FoundationArtifact] Invalid foundation crustTiles tensor lengths.");
  }
}

export function validatePlateGraphArtifact(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error("[FoundationArtifact] Missing foundation plateGraph artifact payload.");
  }
  const graph = value as { cellToPlate?: unknown; plates?: unknown };
  if (!(graph.cellToPlate instanceof Int16Array) || graph.cellToPlate.length <= 0) {
    throw new Error("[FoundationArtifact] Invalid foundation plateGraph.cellToPlate.");
  }
  if (!Array.isArray(graph.plates) || graph.plates.length <= 0) {
    throw new Error("[FoundationArtifact] Invalid foundation plateGraph.plates.");
  }
}

export function validateTectonicSegmentsArtifact(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error("[FoundationArtifact] Missing foundation tectonicSegments artifact payload.");
  }
  const seg = value as Record<string, unknown> & { segmentCount?: unknown };
  const segmentCount = typeof seg.segmentCount === "number" ? (seg.segmentCount | 0) : -1;
  if (segmentCount < 0) {
    throw new Error("[FoundationArtifact] Invalid foundation tectonicSegments.segmentCount.");
  }

  const arrays = [
    "aCell",
    "bCell",
    "plateA",
    "plateB",
    "regime",
    "polarity",
    "compression",
    "extension",
    "shear",
    "volcanism",
    "fracture",
    "driftU",
    "driftV",
  ] as const;

  for (const key of arrays) {
    const v = seg[key] as unknown;
    const ok =
      v instanceof Int32Array ||
      v instanceof Int16Array ||
      v instanceof Uint8Array ||
      v instanceof Int8Array;
    if (!ok) {
      throw new Error(`[FoundationArtifact] Invalid foundation tectonicSegments.${key}.`);
    }
    if ((v as { length: number }).length !== segmentCount) {
      throw new Error(`[FoundationArtifact] Invalid foundation tectonicSegments.${key} length.`);
    }
  }
}

export function validateTectonicHistoryArtifact(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error("[FoundationArtifact] Missing foundation tectonicHistory artifact payload.");
  }
  const history = value as {
    eraCount?: unknown;
    eras?: unknown;
    upliftTotal?: unknown;
    fractureTotal?: unknown;
    volcanismTotal?: unknown;
    upliftRecentFraction?: unknown;
    lastActiveEra?: unknown;
  };

  const eraCount = typeof history.eraCount === "number" ? (history.eraCount | 0) : -1;
  if (eraCount !== 3) {
    throw new Error("[FoundationArtifact] Invalid foundation tectonicHistory.eraCount.");
  }
  if (!Array.isArray(history.eras) || history.eras.length !== eraCount) {
    throw new Error("[FoundationArtifact] Invalid foundation tectonicHistory.eras.");
  }

  const totals = [
    ["upliftTotal", history.upliftTotal],
    ["fractureTotal", history.fractureTotal],
    ["volcanismTotal", history.volcanismTotal],
    ["upliftRecentFraction", history.upliftRecentFraction],
    ["lastActiveEra", history.lastActiveEra],
  ] as const;

  let cellCount: number | null = null;
  for (const [label, arr] of totals) {
    if (!(arr instanceof Uint8Array)) {
      throw new Error(`[FoundationArtifact] Invalid foundation tectonicHistory.${label}.`);
    }
    if (cellCount == null) cellCount = arr.length;
    if (arr.length !== cellCount) {
      throw new Error(`[FoundationArtifact] Invalid foundation tectonicHistory.${label} length.`);
    }
  }

  for (let e = 0; e < history.eras.length; e++) {
    const era = history.eras[e] as Record<string, unknown> | undefined;
    if (!era) throw new Error("[FoundationArtifact] Invalid foundation tectonicHistory era payload.");
    const fields = ["boundaryType", "upliftPotential", "riftPotential", "shearStress", "volcanism", "fracture"] as const;
    for (const field of fields) {
      const v = era[field] as unknown;
      if (!(v instanceof Uint8Array)) {
        throw new Error(`[FoundationArtifact] Invalid foundation tectonicHistory.eras[${e}].${field}.`);
      }
      if (cellCount != null && v.length !== cellCount) {
        throw new Error(`[FoundationArtifact] Invalid foundation tectonicHistory.eras[${e}].${field} length.`);
      }
    }
  }
}

export function validatePlateTopologyArtifact(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error("[FoundationArtifact] Missing foundation plateTopology artifact payload.");
  }
  const topology = value as {
    plateCount?: unknown;
    plates?: unknown;
  };
  const plateCount = typeof topology.plateCount === "number" ? (topology.plateCount | 0) : 0;
  if (plateCount <= 0) {
    throw new Error("[FoundationArtifact] Invalid foundation plateTopology.plateCount.");
  }
  if (!Array.isArray(topology.plates) || topology.plates.length !== plateCount) {
    throw new Error("[FoundationArtifact] Invalid foundation plateTopology.plates.");
  }
  for (let i = 0; i < topology.plates.length; i++) {
    const plate = topology.plates[i] as
      | { id?: unknown; area?: unknown; centroid?: unknown; neighbors?: unknown }
      | undefined;
    const id = typeof plate?.id === "number" ? (plate.id | 0) : -1;
    if (id < 0 || id >= plateCount) {
      throw new Error("[FoundationArtifact] Invalid foundation plateTopology plate id.");
    }
    const area = typeof plate?.area === "number" ? (plate.area | 0) : -1;
    if (area < 0) {
      throw new Error("[FoundationArtifact] Invalid foundation plateTopology plate area.");
    }
    const centroid = plate?.centroid as { x?: unknown; y?: unknown } | undefined;
    if (!centroid || typeof centroid !== "object") {
      throw new Error("[FoundationArtifact] Invalid foundation plateTopology plate centroid.");
    }
    if (typeof centroid.x !== "number" || typeof centroid.y !== "number") {
      throw new Error("[FoundationArtifact] Invalid foundation plateTopology plate centroid.");
    }
    if (plate?.neighbors != null && !Array.isArray(plate.neighbors)) {
      throw new Error("[FoundationArtifact] Invalid foundation plateTopology plate neighbors.");
    }
  }
}

export function validateTectonicsArtifact(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error("[FoundationArtifact] Missing foundation tectonics artifact payload.");
  }
  const tectonics = value as Record<string, unknown>;
  const fields = [
    "boundaryType",
    "upliftPotential",
    "riftPotential",
    "shearStress",
    "volcanism",
    "fracture",
    "cumulativeUplift",
  ] as const;

  let expectedLen: number | null = null;
  for (const field of fields) {
    const candidate = tectonics[field];
    if (!(candidate instanceof Uint8Array)) {
      throw new Error(`[FoundationArtifact] Invalid foundation tectonics.${field}.`);
    }
    if (expectedLen == null) expectedLen = candidate.length;
    if (candidate.length <= 0 || candidate.length !== expectedLen) {
      throw new Error("[FoundationArtifact] Invalid foundation tectonics tensor lengths.");
    }
  }
}

export const validatePlatesArtifact = validateFoundationPlatesArtifact;
