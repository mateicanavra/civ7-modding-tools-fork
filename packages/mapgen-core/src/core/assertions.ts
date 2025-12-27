import type {
  ExtendedMapContext,
  FoundationConfigSnapshot,
  FoundationDiagnosticsFields,
  FoundationDynamicsFields,
  FoundationPlateFields,
} from "@mapgen/core/types.js";
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
import type { SeedSnapshot } from "@mapgen/base/foundation/types.js";

function requireContext(ctx: ExtendedMapContext | null, stageName: string): ExtendedMapContext {
  if (!ctx) {
    throw new Error(`Stage "${stageName}" requires ExtendedMapContext but ctx is null`);
  }
  return ctx;
}

export function assertFoundationPlates(
  ctx: ExtendedMapContext | null,
  stageName: string
): FoundationPlateFields {
  const context = requireContext(ctx, stageName);
  const value = context.artifacts.get(FOUNDATION_PLATES_ARTIFACT_TAG);
  validateFoundationPlatesArtifact(value, context.dimensions);
  return value as FoundationPlateFields;
}

export function assertFoundationDynamics(
  ctx: ExtendedMapContext | null,
  stageName: string
): FoundationDynamicsFields {
  const context = requireContext(ctx, stageName);
  const value = context.artifacts.get(FOUNDATION_DYNAMICS_ARTIFACT_TAG);
  validateFoundationDynamicsArtifact(value, context.dimensions);
  return value as FoundationDynamicsFields;
}

export function assertFoundationSeed(
  ctx: ExtendedMapContext | null,
  stageName: string
): SeedSnapshot {
  const context = requireContext(ctx, stageName);
  const value = context.artifacts.get(FOUNDATION_SEED_ARTIFACT_TAG);
  validateFoundationSeedArtifact(value, context.dimensions);
  return value as SeedSnapshot;
}

export function assertFoundationDiagnostics(
  ctx: ExtendedMapContext | null,
  stageName: string
): FoundationDiagnosticsFields {
  const context = requireContext(ctx, stageName);
  const value = context.artifacts.get(FOUNDATION_DIAGNOSTICS_ARTIFACT_TAG);
  validateFoundationDiagnosticsArtifact(value);
  return value as FoundationDiagnosticsFields;
}

export function assertFoundationConfig(
  ctx: ExtendedMapContext | null,
  stageName: string
): FoundationConfigSnapshot {
  const context = requireContext(ctx, stageName);
  const value = context.artifacts.get(FOUNDATION_CONFIG_ARTIFACT_TAG);
  validateFoundationConfigArtifact(value);
  return value as FoundationConfigSnapshot;
}
