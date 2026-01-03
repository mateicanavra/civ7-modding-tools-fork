import { describe, expect, it } from "bun:test";

import {
  resolveFeaturesPlacementConfig,
  type FeaturesPlacementConfig,
} from "@mapgen/domain/ecology/ops/plan-feature-placements/index.js";

describe("features placement config", () => {
  it("rejects unknown feature chance keys", () => {
    const invalidConfig = {
      chances: {
        FEATURE_FAKE_FEATURE: 20,
      },
    } as unknown as FeaturesPlacementConfig;

    expect(() => resolveFeaturesPlacementConfig(invalidConfig)).toThrow(
      "planFeaturePlacements.chances contains unknown feature keys"
    );
  });
});
