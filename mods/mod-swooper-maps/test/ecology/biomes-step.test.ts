import { describe, expect, it } from "bun:test";

import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";

import biomesStep from "../../src/recipes/standard/stages/ecology/steps/biomes/index.js";
import { publishClimateFieldArtifact, publishHeightfieldArtifact } from "../../src/recipes/standard/artifacts.js";

describe("biomes step", () => {
  it("assigns marine biome to water tiles", () => {
    const width = 4;
    const height = 3;
    const size = width * height;

    const adapter = createMockAdapter({ width, height });
    adapter.fillWater(false);
    adapter.setWater(0, 0, true);

    const ctx = createExtendedMapContext(
      { width, height },
      adapter,
      {} as ReturnType<typeof createExtendedMapContext>["config"]
    );

    ctx.buffers.heightfield.landMask.fill(1);
    ctx.buffers.heightfield.landMask[0] = 0;
    ctx.buffers.heightfield.elevation.fill(0);

    ctx.buffers.climate.rainfall.fill(120);
    ctx.buffers.climate.humidity.fill(80);

    publishHeightfieldArtifact(ctx);
    publishClimateFieldArtifact(ctx);

    biomesStep.run(ctx, { classify: {}, bindings: {} });

    const marineId = adapter.getBiomeGlobal("BIOME_MARINE");
    expect(ctx.fields.biomeId[0]).toBe(marineId);

    const landIdx = 1;
    expect(ctx.fields.biomeId[landIdx]).not.toBe(marineId);
    expect(ctx.fields.biomeId[landIdx]).toBeGreaterThanOrEqual(0);
  });
});
