import { describe, it, expect } from "bun:test";
import { bootstrap } from "@mapgen/bootstrap/entry.js";
import { MapOrchestrator } from "@mapgen/MapOrchestrator.js";
import { createMockAdapter } from "@civ7/adapter/mock";

/**
 * Minimal integration to pin the canonical config → orchestrator path.
 *
 * We disable all stage execution via stageConfig to avoid layer dependencies
 * and supply a no-op adapter. The goal is to verify that generateMap() can run
 * end-to-end with schema-defaulted config, not to exercise the full layer pipeline.
 */
describe("integration: bootstrap → orchestrator (stages disabled)", () => {
  const mapInfo = {
    GridWidth: 84,
    GridHeight: 54,
    MinLatitude: -80,
    MaxLatitude: 80,
    NumNaturalWonders: 0,
    LakeGenerationFrequency: 0,
    PlayersLandmass1: 4,
    PlayersLandmass2: 4,
    StartSectorRows: 4,
    StartSectorCols: 4,
  };

  it("runs generateMap with schema defaults and no stage execution", () => {
    const adapter = createMockAdapter({
      width: 84,
      height: 54,
      mapSizeId: 1,
      mapInfo,
    });

    const config = bootstrap({
      // Disable all stages so we only exercise orchestrator scaffolding.
      stageConfig: {},
    });

    const orchestrator = new MapOrchestrator(config, {
      adapter,
      logPrefix: "[TEST]",
    });

    const result = orchestrator.generateMap();

    expect(result.success).toBe(true);
  });
});
