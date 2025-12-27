import type { ExtendedMapContext } from "@mapgen/core/types.js";
import {
  isNarrativeCorridorsV1,
  isNarrativeMotifsHotspotsV1,
  isNarrativeMotifsMarginsV1,
  isNarrativeMotifsOrogenyV1,
  isNarrativeMotifsRiftsV1,
  type NarrativeCorridorsV1,
  type NarrativeMotifsHotspotsV1,
  type NarrativeMotifsMarginsV1,
  type NarrativeMotifsOrogenyV1,
  type NarrativeMotifsRiftsV1,
} from "@mapgen/domain/narrative/artifacts.js";
import { M3_DEPENDENCY_TAGS } from "@mapgen/pipeline/tags.js";

function getValidatedArtifact<T>(
  ctx: ExtendedMapContext | null | undefined,
  key: string,
  validator: (value: unknown) => value is T
): T | null {
  if (!ctx) return null;
  const value = ctx.artifacts.get(key);
  return validator(value) ? value : null;
}

export function getNarrativeCorridors(
  ctx: ExtendedMapContext | null | undefined
): NarrativeCorridorsV1 | null {
  return getValidatedArtifact(
    ctx,
    M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
    isNarrativeCorridorsV1
  );
}

export function getNarrativeMotifsMargins(
  ctx: ExtendedMapContext | null | undefined
): NarrativeMotifsMarginsV1 | null {
  return getValidatedArtifact(
    ctx,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
    isNarrativeMotifsMarginsV1
  );
}

export function getNarrativeMotifsHotspots(
  ctx: ExtendedMapContext | null | undefined
): NarrativeMotifsHotspotsV1 | null {
  return getValidatedArtifact(
    ctx,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
    isNarrativeMotifsHotspotsV1
  );
}

export function getNarrativeMotifsRifts(
  ctx: ExtendedMapContext | null | undefined
): NarrativeMotifsRiftsV1 | null {
  return getValidatedArtifact(
    ctx,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
    isNarrativeMotifsRiftsV1
  );
}

export function getNarrativeMotifsOrogeny(
  ctx: ExtendedMapContext | null | undefined
): NarrativeMotifsOrogenyV1 | null {
  return getValidatedArtifact(
    ctx,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsOrogenyV1,
    isNarrativeMotifsOrogenyV1
  );
}
