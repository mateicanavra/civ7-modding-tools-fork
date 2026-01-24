import { describe, expect, it } from "bun:test";

import {
  buildFeaturesPlacementConfig,
  createFeaturesTestContext,
  runOwnedFeaturePlacements,
} from "./features-owned.helpers.js";

describe("features (owned baseline)", () => {
  it("does not call adapter.addFeatures when strategy is owned", () => {
    const { ctx, adapter } = createFeaturesTestContext({
      width: 6,
      height: 4,
      rng: () => 0,
    });

    const featuresPlacement = buildFeaturesPlacementConfig({
      vegetated: { multiplier: 0 },
      wet: { multiplier: 0 },
      aquatic: { multiplier: 0 },
      ice: { multiplier: 0 },
    });

    runOwnedFeaturePlacements({ ctx, placements: featuresPlacement });

    expect(adapter.calls.addFeatures.length).toBe(0);
  });
});
