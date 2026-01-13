import type { MapDimensions } from "@civ7/adapter";

import type {
  FoundationDiagnosticsFields,
  FoundationPlateFields,
  SeedSnapshot,
} from "@mapgen/core/types.js";
import {
  validateFoundationDiagnosticsArtifact,
  validateFoundationPlatesArtifact,
  validateFoundationSeedArtifact,
} from "@mapgen/core/types.js";

export function assertFoundationPlates(
  value: unknown,
  dimensions: MapDimensions
): FoundationPlateFields {
  validateFoundationPlatesArtifact(value, dimensions);
  return value as FoundationPlateFields;
}

export function assertFoundationSeed(
  value: unknown,
  dimensions: MapDimensions
): SeedSnapshot {
  validateFoundationSeedArtifact(value, dimensions);
  return value as SeedSnapshot;
}

export function assertFoundationDiagnostics(
  value: unknown
): FoundationDiagnosticsFields {
  validateFoundationDiagnosticsArtifact(value);
  return value as FoundationDiagnosticsFields;
}
