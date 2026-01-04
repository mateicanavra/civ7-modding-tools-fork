/**
 * Narrative artifact getter tests
 *
 * Validates recipe-owned narrative artifact accessors and type guards.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { ArtifactStore, type ExtendedMapContext } from "@swooper/mapgen-core";
import {
  buildNarrativeCorridorsV1,
  buildNarrativeMotifsMarginsV1,
  buildNarrativeMotifsHotspotsV1,
  buildNarrativeMotifsRiftsV1,
} from "@mapgen/domain/narrative/artifacts.js";
import {
  getPublishedNarrativeCorridors,
  getPublishedNarrativeMotifsMargins,
  getPublishedNarrativeMotifsHotspots,
  getPublishedNarrativeMotifsRifts,
} from "../../src/recipes/standard/artifacts.js";
import { M3_DEPENDENCY_TAGS } from "../../src/recipes/standard/tags.js";

describe("recipes/artifacts (narrative)", () => {
  let ctx: ExtendedMapContext;

  beforeEach(() => {
    ctx = { artifacts: new ArtifactStore() } as ExtendedMapContext;
  });

  it("returns null when artifacts are missing", () => {
    expect(getPublishedNarrativeCorridors(ctx)).toBeNull();
    expect(getPublishedNarrativeMotifsMargins(ctx)).toBeNull();
    expect(getPublishedNarrativeMotifsHotspots(ctx)).toBeNull();
    expect(getPublishedNarrativeMotifsRifts(ctx)).toBeNull();
  });

  it("returns artifacts when present and validated", () => {
    ctx.artifacts.set(
      M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
      buildNarrativeCorridorsV1({
        seaLanes: ["1,1"],
        islandHops: [],
        landCorridors: [],
        riverCorridors: [],
        kindByTile: new Map([["1,1", "sea"]]),
        styleByTile: new Map([["1,1", "default"]]),
        attributesByTile: new Map([["1,1", { depth: 1 }]]),
      })
    );

    ctx.artifacts.set(
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
      buildNarrativeMotifsMarginsV1({ activeMargin: ["2,2"], passiveShelf: [] })
    );

    ctx.artifacts.set(
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
      buildNarrativeMotifsHotspotsV1({
        points: ["3,3"],
        paradise: ["3,3"],
        volcanic: [],
      })
    );

    ctx.artifacts.set(
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
      buildNarrativeMotifsRiftsV1({ riftLine: ["4,4"], riftShoulder: [] })
    );

    expect(getPublishedNarrativeCorridors(ctx)?.seaLanes.has("1,1")).toBe(true);
    expect(getPublishedNarrativeMotifsMargins(ctx)?.activeMargin.has("2,2")).toBe(true);
    expect(getPublishedNarrativeMotifsHotspots(ctx)?.points.has("3,3")).toBe(true);
    expect(getPublishedNarrativeMotifsHotspots(ctx)?.paradise.has("3,3")).toBe(true);
    expect(getPublishedNarrativeMotifsRifts(ctx)?.riftLine.has("4,4")).toBe(true);
  });
});
