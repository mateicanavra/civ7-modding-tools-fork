import { describe, expect, it } from "bun:test";

import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { implementArtifacts } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology/ops";

import biomesStep from "../../src/recipes/standard/stages/ecology/steps/biomes/index.js";
import plotBiomesStep from "../../src/recipes/standard/stages/map-ecology/steps/plotBiomes.js";
import { ecologyArtifacts } from "../../src/recipes/standard/stages/ecology/artifacts.js";
import { hydrologyHydrographyArtifacts } from "../../src/recipes/standard/stages/hydrology-hydrography/artifacts.js";
import { hydrologyClimateBaselineArtifacts } from "../../src/recipes/standard/stages/hydrology-climate-baseline/artifacts.js";
import { hydrologyClimateRefineArtifacts } from "../../src/recipes/standard/stages/hydrology-climate-refine/artifacts.js";
import { morphologyArtifacts } from "../../src/recipes/standard/stages/morphology-pre/artifacts.js";
import { normalizeOpSelectionOrThrow } from "../support/compiler-helpers.js";
import { buildTestDeps } from "../support/step-deps.js";

describe("biomes step", () => {
  it("assigns marine biome to water tiles", () => {
    const width = 4;
    const height = 3;
    const size = width * height;
    const env = {
      seed: 0,
      dimensions: { width, height },
      latitudeBounds: { topLatitude: 0, bottomLatitude: 0 },
    };

    const adapter = createMockAdapter({ width, height });
    adapter.fillWater(false);
    adapter.setWater(0, 0, true);

    const ctx = createExtendedMapContext({ width, height }, adapter, env);

    ctx.buffers.heightfield.landMask.fill(1);
    ctx.buffers.heightfield.landMask[0] = 0;
    ctx.buffers.heightfield.elevation.fill(1);
    ctx.buffers.heightfield.elevation[0] = 0;

    ctx.buffers.climate.rainfall.fill(120);
    ctx.buffers.climate.humidity.fill(80);

    const hydrologyArtifacts = implementArtifacts(
      [
        morphologyArtifacts.topography,
        hydrologyClimateBaselineArtifacts.climateField,
        hydrologyHydrographyArtifacts.hydrography,
        hydrologyClimateRefineArtifacts.cryosphere,
      ],
      { topography: {}, climateField: {}, hydrography: {}, cryosphere: {} }
    );
    const seaLevel = 0;
    const bathymetry = new Int16Array(size);
    hydrologyArtifacts.topography.publish(ctx, {
      elevation: ctx.buffers.heightfield.elevation,
      seaLevel,
      landMask: ctx.buffers.heightfield.landMask,
      bathymetry,
    });
    hydrologyArtifacts.climateField.publish(ctx, ctx.buffers.climate);
    hydrologyArtifacts.hydrography.publish(ctx, {
      runoff: new Float32Array(size),
      discharge: new Float32Array(size),
      riverClass: new Uint8Array(size),
      sinkMask: new Uint8Array(size),
      outletMask: new Uint8Array(size),
    });
    hydrologyArtifacts.cryosphere.publish(ctx, {
      snowCover: new Uint8Array(size),
      seaIceCover: new Uint8Array(size),
      albedo: new Uint8Array(size),
      groundIce01: new Float32Array(size),
      permafrost01: new Float32Array(size),
      meltPotential01: new Float32Array(size),
    });

    const classifyConfig = normalizeOpSelectionOrThrow(ecology.ops.classifyBiomes, {
      strategy: "default",
      config: {
        riparian: {
          adjacencyRadius: 1,
          minorRiverMoistureBonus: 4,
          majorRiverMoistureBonus: 8,
        },
      },
    });

    const ops = ecology.ops.bind(biomesStep.contract.ops!).runtime;
    biomesStep.run(
      ctx,
      {
        classify: classifyConfig,
      },
      ops,
      buildTestDeps(biomesStep)
    );

    plotBiomesStep.run(
      ctx,
      {
        bindings: {},
      },
      {} as any,
      buildTestDeps(plotBiomesStep)
    );

    const marineId = adapter.getBiomeGlobal("BIOME_MARINE");
    expect(ctx.fields.biomeId[0]).toBe(marineId);

    const landIdx = 1;
    expect(ctx.fields.biomeId[landIdx]).not.toBe(marineId);
    expect(ctx.fields.biomeId[landIdx]).toBeGreaterThanOrEqual(0);
  });

  it("applies a riparian moisture bonus near major rivers", () => {
    const width = 5;
    const height = 5;
    const size = width * height;
    const env = {
      seed: 0,
      dimensions: { width, height },
      latitudeBounds: { topLatitude: 0, bottomLatitude: 0 },
    };

    const classifyConfig = normalizeOpSelectionOrThrow(ecology.ops.classifyBiomes, {
      strategy: "default",
      config: {
        riparian: {
          adjacencyRadius: 1,
          minorRiverMoistureBonus: 4,
          majorRiverMoistureBonus: 8,
        },
      },
    });

    const run = (riverClass: Uint8Array): Float32Array => {
      const adapter = createMockAdapter({ width, height });
      adapter.fillWater(false);

      const ctx = createExtendedMapContext({ width, height }, adapter, env);

      ctx.buffers.heightfield.landMask.fill(1);
      ctx.buffers.heightfield.elevation.fill(1);
      ctx.buffers.climate.rainfall.fill(120);
      ctx.buffers.climate.humidity.fill(80);

      const hydrologyArtifacts = implementArtifacts(
        [
          morphologyArtifacts.topography,
          hydrologyClimateBaselineArtifacts.climateField,
          hydrologyHydrographyArtifacts.hydrography,
          hydrologyClimateRefineArtifacts.cryosphere,
        ],
        { topography: {}, climateField: {}, hydrography: {}, cryosphere: {} }
      );
      const seaLevel = 0;
      const bathymetry = new Int16Array(size);
      hydrologyArtifacts.topography.publish(ctx, {
        elevation: ctx.buffers.heightfield.elevation,
        seaLevel,
        landMask: ctx.buffers.heightfield.landMask,
        bathymetry,
      });
      hydrologyArtifacts.climateField.publish(ctx, ctx.buffers.climate);
      hydrologyArtifacts.hydrography.publish(ctx, {
        runoff: new Float32Array(size),
        discharge: new Float32Array(size),
        riverClass,
        sinkMask: new Uint8Array(size),
        outletMask: new Uint8Array(size),
      });
      hydrologyArtifacts.cryosphere.publish(ctx, {
        snowCover: new Uint8Array(size),
        seaIceCover: new Uint8Array(size),
        albedo: new Uint8Array(size),
        groundIce01: new Float32Array(size),
        permafrost01: new Float32Array(size),
        meltPotential01: new Float32Array(size),
      });

      const ops = ecology.ops.bind(biomesStep.contract.ops!).runtime;
      biomesStep.run(
        ctx,
        {
          classify: classifyConfig,
        },
        ops,
        buildTestDeps(biomesStep)
      );

      const classification = ctx.artifacts.get(ecologyArtifacts.biomeClassification.id) as
        | { effectiveMoisture?: Float32Array }
        | undefined;
      const effectiveMoisture = classification?.effectiveMoisture;
      if (!(effectiveMoisture instanceof Float32Array)) {
        throw new Error("Missing effectiveMoisture.");
      }
      return effectiveMoisture;
    };

    const noRiver = new Uint8Array(size);
    const majorRiverAtCenter = new Uint8Array(size);
    majorRiverAtCenter[2 * width + 2] = 2;

    const moistureNoRiver = run(noRiver);
    const moistureMajor = run(majorRiverAtCenter);

    const center = 2 * width + 2;
    const adjacent = 2 * width + 3;
    const far = 0;

    expect(moistureMajor[center]! - moistureNoRiver[center]!).toBe(8);
    expect(moistureMajor[adjacent]! - moistureNoRiver[adjacent]!).toBe(8);
    expect(moistureMajor[far]! - moistureNoRiver[far]!).toBe(0);
  });
});
