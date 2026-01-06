import { describe, it, expect } from "vitest";
import { createMockAdapter } from "@civ7/adapter";
import { applySchemaDefaults } from "@swooper/mapgen-core/authoring";
import { PlacementConfigSchema } from "@mapgen/config";
import { runPlacement } from "../../src/domain/placement/index.js";

describe("placement", () => {
  it("does not call adapter.generateSnow", () => {
    const adapter = createMockAdapter({ width: 4, height: 4 });
    const placementConfig = applySchemaDefaults(PlacementConfigSchema, {});
    runPlacement(adapter, 4, 4, {
      mapInfo: { NumNaturalWonders: 0 },
      placementConfig,
    });

    expect(adapter.calls.generateSnow.length).toBe(0);
  });
});
