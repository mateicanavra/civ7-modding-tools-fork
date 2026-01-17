import { ctxRandom, ctxRandomLabel, logRainfallStats, writeClimateField } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import ClimateRefineStepContract from "./climateRefine.contract.js";

export default createStep(ClimateRefineStepContract, {
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const windField = deps.artifacts.windField.read(context);
    const riverAdjacency = deps.artifacts.riverAdjacency.read(context);
    const heightfield = deps.artifacts.heightfield.read(context) as {
      elevation: Int16Array;
      terrain: Uint8Array;
      landMask: Uint8Array;
    };

    const climateField = deps.artifacts.climateField.read(context) as {
      rainfall: Uint8Array;
      humidity: Uint8Array;
    };

    const latitudeByRow = new Float32Array(height);
    for (let y = 0; y < height; y++) {
      latitudeByRow[y] = context.adapter.getLatitude(0, y);
    }

    const size = width * height;
    const humidityF32 = new Float32Array(size);
    for (let i = 0; i < size; i++) humidityF32[i] = (climateField.humidity[i] ?? 0) / 255;

    const stepId = `${ClimateRefineStepContract.phase}/${ClimateRefineStepContract.id}`;
    const perlinSeed = ctxRandom(
      context,
      ctxRandomLabel(stepId, "hydrology/compute-precipitation/noise"),
      2_147_483_647
    );

    const refined = ops.computePrecipitation(
      {
        width,
        height,
        latitudeByRow,
        elevation: heightfield.elevation,
        terrain: heightfield.terrain,
        landMask: heightfield.landMask,
        windU: windField.windU,
        windV: windField.windV,
        humidityF32,
        rainfallIn: climateField.rainfall,
        humidityIn: climateField.humidity,
        riverAdjacency,
        perlinSeed,
      },
      config.computePrecipitation
    );

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const i = rowOffset + x;
        writeClimateField(context, x, y, {
          rainfall: refined.rainfall[i],
          humidity: refined.humidity[i],
        });
      }
    }

    logRainfallStats(context.trace, context.adapter, width, height, "post-climate");
  },
});
