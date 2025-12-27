/**
 * Narrative query tests
 *
 * Validates narrative artifact accessors and type guards.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { ArtifactStore, type ExtendedMapContext } from "@mapgen/core/types.js";
import {
  buildNarrativeCorridorsV1,
  buildNarrativeMotifsMarginsV1,
  buildNarrativeMotifsHotspotsV1,
  buildNarrativeMotifsRiftsV1,
} from "@mapgen/domain/narrative/artifacts.js";
import {
  getNarrativeCorridors,
  getNarrativeMotifsMargins,
  getNarrativeMotifsHotspots,
  getNarrativeMotifsOrogeny,
  getNarrativeMotifsRifts,
} from "@mapgen/domain/narrative/queries.js";
import { M3_DEPENDENCY_TAGS } from "@mapgen/pipeline/tags.js";

describe("narrative/queries", () => {
  let ctx: ExtendedMapContext;

  beforeEach(() => {
    ctx = { artifacts: new ArtifactStore() } as ExtendedMapContext;
  });

  it("returns null when artifacts are missing", () => {
    expect(getNarrativeCorridors(ctx)).toBeNull();
    expect(getNarrativeMotifsMargins(ctx)).toBeNull();
    expect(getNarrativeMotifsHotspots(ctx)).toBeNull();
    expect(getNarrativeMotifsRifts(ctx)).toBeNull();
    expect(getNarrativeMotifsOrogeny(ctx)).toBeNull();
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

    expect(getNarrativeCorridors(ctx)?.seaLanes.has("1,1")).toBe(true);
    expect(getNarrativeMotifsMargins(ctx)?.activeMargin.has("2,2")).toBe(true);
    expect(getNarrativeMotifsHotspots(ctx)?.points.has("3,3")).toBe(true);
    expect(getNarrativeMotifsHotspots(ctx)?.paradise.has("3,3")).toBe(true);
    expect(getNarrativeMotifsRifts(ctx)?.riftLine.has("4,4")).toBe(true);
  });
});
