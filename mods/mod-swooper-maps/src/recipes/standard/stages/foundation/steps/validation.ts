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
  const crust = value as { type?: unknown; age?: unknown };
  if (!(crust.type instanceof Uint8Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crust.type.");
  }
  if (!(crust.age instanceof Uint8Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crust.age.");
  }
  if (crust.type.length <= 0 || crust.age.length <= 0 || crust.type.length !== crust.age.length) {
    throw new Error("[FoundationArtifact] Invalid foundation crust tensor lengths.");
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
