import type { MapDimensions } from "@civ7/adapter";
import {
  createFoundationContext,
  ctxRandom,
  validateFoundationConfigArtifact,
  validateFoundationDiagnosticsArtifact,
  validateFoundationDynamicsArtifact,
  validateFoundationPlatesArtifact,
  validateFoundationSeedArtifact,
  validateFoundationContext,
} from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import FoundationStepContract from "./foundation.contract.js";

type ArtifactValidationIssue = Readonly<{ message: string }>;

function wrapFoundationValidate(
  value: unknown,
  dimensions: MapDimensions,
  validator: (value: unknown, dims: MapDimensions) => void
): ArtifactValidationIssue[] {
  try {
    validator(value, dimensions);
    return [];
  } catch (error) {
    return [{ message: error instanceof Error ? error.message : String(error) }];
  }
}

function wrapFoundationValidateNoDims(
  value: unknown,
  validator: (value: unknown) => void
): ArtifactValidationIssue[] {
  try {
    validator(value);
    return [];
  } catch (error) {
    return [{ message: error instanceof Error ? error.message : String(error) }];
  }
}

function validateMeshArtifact(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error("[FoundationArtifact] Missing foundation mesh artifact payload.");
  }
  const mesh = value as {
    cellCount?: number;
    siteX?: unknown;
    siteY?: unknown;
    neighborsOffsets?: unknown;
    neighbors?: unknown;
    areas?: unknown;
  };
  const cellCount = typeof mesh.cellCount === "number" ? (mesh.cellCount | 0) : 0;
  if (cellCount <= 0) {
    throw new Error("[FoundationArtifact] Invalid foundation mesh cellCount.");
  }
  if (!(mesh.siteX instanceof Float32Array) || mesh.siteX.length !== cellCount) {
    throw new Error("[FoundationArtifact] Invalid foundation mesh.siteX.");
  }
  if (!(mesh.siteY instanceof Float32Array) || mesh.siteY.length !== cellCount) {
    throw new Error("[FoundationArtifact] Invalid foundation mesh.siteY.");
  }
  if (!(mesh.areas instanceof Float32Array) || mesh.areas.length !== cellCount) {
    throw new Error("[FoundationArtifact] Invalid foundation mesh.areas.");
  }
  if (!(mesh.neighborsOffsets instanceof Int32Array) || mesh.neighborsOffsets.length !== cellCount + 1) {
    throw new Error("[FoundationArtifact] Invalid foundation mesh.neighborsOffsets.");
  }
  if (!(mesh.neighbors instanceof Int32Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation mesh.neighbors.");
  }
}

function validateCrustArtifact(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error("[FoundationArtifact] Missing foundation crust artifact payload.");
  }
  const crust = value as { type?: unknown; age?: unknown };
  if (!(crust.type instanceof Uint8Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crust.type.");
  }
  if (!(crust.age instanceof Uint8Array)) {
    throw new Error("[FoundationArtifact] Invalid foundation crust.age.");
  }
  if (crust.type.length <= 0 || crust.age.length <= 0 || crust.type.length !== crust.age.length) {
    throw new Error("[FoundationArtifact] Invalid foundation crust tensor lengths.");
  }
}

function validatePlateGraphArtifact(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error("[FoundationArtifact] Missing foundation plateGraph artifact payload.");
  }
  const graph = value as { cellToPlate?: unknown; plates?: unknown };
  if (!(graph.cellToPlate instanceof Int16Array) || graph.cellToPlate.length <= 0) {
    throw new Error("[FoundationArtifact] Invalid foundation plateGraph.cellToPlate.");
  }
  if (!Array.isArray(graph.plates) || graph.plates.length <= 0) {
    throw new Error("[FoundationArtifact] Invalid foundation plateGraph.plates.");
  }
}

function validateTectonicsArtifact(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error("[FoundationArtifact] Missing foundation tectonics artifact payload.");
  }
  const tectonics = value as Record<string, unknown>;
  const fields = [
    "boundaryType",
    "upliftPotential",
    "riftPotential",
    "shearStress",
    "volcanism",
    "fracture",
    "cumulativeUplift",
  ] as const;

  let expectedLen: number | null = null;
  for (const field of fields) {
    const candidate = tectonics[field];
    if (!(candidate instanceof Uint8Array)) {
      throw new Error(`[FoundationArtifact] Invalid foundation tectonics.${field}.`);
    }
    if (expectedLen == null) expectedLen = candidate.length;
    if (candidate.length <= 0 || candidate.length !== expectedLen) {
      throw new Error("[FoundationArtifact] Invalid foundation tectonics tensor lengths.");
    }
  }
}

export default createStep(FoundationStepContract, {
  artifacts: implementArtifacts(
    [
      foundationArtifacts.mesh,
      foundationArtifacts.crust,
      foundationArtifacts.plateGraph,
      foundationArtifacts.tectonics,
      foundationArtifacts.plates,
      foundationArtifacts.dynamics,
      foundationArtifacts.seed,
      foundationArtifacts.diagnostics,
      foundationArtifacts.config,
    ],
    {
      foundationMesh: {
        validate: (value) => wrapFoundationValidateNoDims(value, validateMeshArtifact),
      },
      foundationCrust: {
        validate: (value) => wrapFoundationValidateNoDims(value, validateCrustArtifact),
      },
      foundationPlateGraph: {
        validate: (value) => wrapFoundationValidateNoDims(value, validatePlateGraphArtifact),
      },
      foundationTectonics: {
        validate: (value) => wrapFoundationValidateNoDims(value, validateTectonicsArtifact),
      },
      foundationPlates: {
        validate: (value, context) =>
          wrapFoundationValidate(value, context.dimensions, validateFoundationPlatesArtifact),
      },
      foundationDynamics: {
        validate: (value, context) =>
          wrapFoundationValidate(value, context.dimensions, validateFoundationDynamicsArtifact),
      },
      foundationSeed: {
        validate: (value, context) =>
          wrapFoundationValidate(value, context.dimensions, validateFoundationSeedArtifact),
      },
      foundationDiagnostics: {
        validate: (value) => wrapFoundationValidateNoDims(value, validateFoundationDiagnosticsArtifact),
      },
      foundationConfig: {
        validate: (value) => wrapFoundationValidateNoDims(value, validateFoundationConfigArtifact),
      },
    }
  ),
  normalize: (config) => ({
    ...config,
    computeMesh: { strategy: "default" as const, config: config.foundation },
    computeCrust: { strategy: "default" as const, config: config.foundation },
    computePlateGraph: { strategy: "default" as const, config: config.foundation },
    computeTectonics: { strategy: "default" as const, config: config.foundation },
    computePlates: { strategy: "default" as const, config: config.foundation },
    computeDynamics: { strategy: "default" as const, config: config.foundation },
  }),
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const size = Math.max(0, width * height) | 0;
    if (size <= 0) throw new Error("[Foundation] Invalid map dimensions.");

    const directionality = context.env.directionality;
    if (!directionality) {
      throw new Error("[Foundation] Missing env.directionality.");
    }

    const { adapter } = context;
    if (typeof adapter.getVoronoiUtils !== "function") {
      throw new Error("[Foundation] Adapter missing getVoronoiUtils.");
    }
    if (typeof adapter.getLatitude !== "function") {
      throw new Error("[Foundation] Adapter missing getLatitude.");
    }
    if (typeof adapter.isWater !== "function") {
      throw new Error("[Foundation] Adapter missing isWater.");
    }

    const latitudeByRow = new Float32Array(height);
    for (let y = 0; y < height; y++) {
      latitudeByRow[y] = adapter.getLatitude(0, y);
    }

    const isWaterMask = new Uint8Array(size);
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const i = rowOffset + x;
        isWaterMask[i] = adapter.isWater(x, y) ? 1 : 0;
      }
    }

    const rng = (max: number, label = "Foundation") => ctxRandom(context, label, max);

    const meshResult = ops.computeMesh(
      {
        width,
        height,
        wrapX: !!context.env.wrap?.wrapX,
        rng,
        voronoiUtils: adapter.getVoronoiUtils(),
        trace: context.trace,
      },
      config.computeMesh
    );

    const crustResult = ops.computeCrust(
      {
        mesh: meshResult.mesh,
        rng,
        trace: context.trace,
      },
      config.computeCrust
    );

    const plateGraphResult = ops.computePlateGraph(
      {
        mesh: meshResult.mesh,
        crust: crustResult.crust,
        directionality,
        rng,
        trace: context.trace,
      },
      config.computePlateGraph
    );

    const tectonicsResult = ops.computeTectonics(
      {
        mesh: meshResult.mesh,
        crust: crustResult.crust,
        plateGraph: plateGraphResult.plateGraph,
        trace: context.trace,
      },
      config.computeTectonics
    );

    const platesResult = ops.computePlates(
      {
        width,
        height,
        directionality,
        rng,
        voronoiUtils: adapter.getVoronoiUtils(),
        trace: context.trace,
      },
      config.computePlates
    );

    const dynamicsResult = ops.computeDynamics(
      {
        width,
        height,
        latitudeByRow,
        isWaterMask,
        rng,
      },
      config.computeDynamics
    );

    const foundationContext = createFoundationContext(
      {
        plates: platesResult.plates,
        dynamics: dynamicsResult.dynamics,
        plateSeed: platesResult.plateSeed,
        diagnostics: platesResult.diagnostics,
      },
      {
        dimensions: context.dimensions,
        config: {
          seed: config.foundation.seed as Record<string, unknown>,
          plates: config.foundation.plates as Record<string, unknown>,
          dynamics: config.foundation.dynamics as Record<string, unknown>,
          surface: {},
          policy: {},
          diagnostics: {},
        },
      }
    );

    validateFoundationContext(foundationContext, context.dimensions);

    deps.artifacts.foundationMesh.publish(context, meshResult.mesh);
    deps.artifacts.foundationCrust.publish(context, crustResult.crust);
    deps.artifacts.foundationPlateGraph.publish(context, plateGraphResult.plateGraph);
    deps.artifacts.foundationTectonics.publish(context, tectonicsResult.tectonics);
    deps.artifacts.foundationPlates.publish(context, foundationContext.plates);
    deps.artifacts.foundationDynamics.publish(context, foundationContext.dynamics);
    if (!foundationContext.plateSeed) {
      throw new Error("[Foundation] Missing plate seed snapshot.");
    }
    deps.artifacts.foundationSeed.publish(context, foundationContext.plateSeed);
    deps.artifacts.foundationDiagnostics.publish(context, foundationContext.diagnostics);
    deps.artifacts.foundationConfig.publish(context, foundationContext.config);
  },
});
