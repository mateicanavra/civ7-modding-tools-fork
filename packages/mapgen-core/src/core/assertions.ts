import type { MapDimensions } from "@civ7/adapter";

import type {
  FoundationConfigSnapshot,
  FoundationDiagnosticsFields,
  FoundationDynamicsFields,
  FoundationPlateFields,
  SeedSnapshot,
} from "@mapgen/core/types.js";
import {
  validateFoundationConfigArtifact,
  validateFoundationDiagnosticsArtifact,
  validateFoundationDynamicsArtifact,
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

export function assertFoundationDynamics(
  value: unknown,
  dimensions: MapDimensions
): FoundationDynamicsFields {
  validateFoundationDynamicsArtifact(value, dimensions);
  return value as FoundationDynamicsFields;
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

export function assertFoundationConfig(
  value: unknown
): FoundationConfigSnapshot {
  validateFoundationConfigArtifact(value);
  return value as FoundationConfigSnapshot;
}
