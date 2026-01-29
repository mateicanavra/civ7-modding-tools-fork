import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import TectonicsStepContract from "./tectonics.contract.js";
import {
  validateTectonicHistoryArtifact,
  validateTectonicSegmentsArtifact,
  validateTectonicsArtifact,
  wrapFoundationValidateNoDims,
} from "./validation.js";
import { interleaveXY, segmentsFromCellPairs } from "./viz.js";

export default createStep(TectonicsStepContract, {
  artifacts: implementArtifacts(
    [foundationArtifacts.tectonicSegments, foundationArtifacts.tectonicHistory, foundationArtifacts.tectonics],
    {
      foundationTectonicSegments: {
        validate: (value) => wrapFoundationValidateNoDims(value, validateTectonicSegmentsArtifact),
      },
      foundationTectonicHistory: {
        validate: (value) => wrapFoundationValidateNoDims(value, validateTectonicHistoryArtifact),
      },
      foundationTectonics: {
        validate: (value) => wrapFoundationValidateNoDims(value, validateTectonicsArtifact),
      },
    }
  ),
  run: (context, config, ops, deps) => {
    const mesh = deps.artifacts.foundationMesh.read(context);
    const crust = deps.artifacts.foundationCrust.read(context);
    const plateGraph = deps.artifacts.foundationPlateGraph.read(context);

    const segmentsResult = ops.computeTectonicSegments(
      {
        mesh,
        crust,
        plateGraph,
      },
      config.computeTectonicSegments
    );

    deps.artifacts.foundationTectonicSegments.publish(context, segmentsResult.segments);

    const historyResult = ops.computeTectonicHistory(
      {
        mesh,
        segments: segmentsResult.segments,
      },
      config.computeTectonicHistory
    );

    deps.artifacts.foundationTectonicHistory.publish(context, historyResult.tectonicHistory);
    deps.artifacts.foundationTectonics.publish(context, historyResult.tectonics);

    const positions = interleaveXY(mesh.siteX, mesh.siteY);
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.tectonics.boundaryType",
      positions,
      values: historyResult.tectonics.boundaryType,
      valueFormat: "u8",
    });
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.tectonics.upliftPotential",
      positions,
      values: historyResult.tectonics.upliftPotential,
      valueFormat: "u8",
    });
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.tectonics.riftPotential",
      positions,
      values: historyResult.tectonics.riftPotential,
      valueFormat: "u8",
    });
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.tectonics.shearStress",
      positions,
      values: historyResult.tectonics.shearStress,
      valueFormat: "u8",
    });
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.tectonics.volcanism",
      positions,
      values: historyResult.tectonics.volcanism,
      valueFormat: "u8",
    });
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.tectonics.fracture",
      positions,
      values: historyResult.tectonics.fracture,
      valueFormat: "u8",
    });

    context.viz?.dumpSegments(context.trace, {
      layerId: "foundation.tectonics.segments",
      segments: segmentsFromCellPairs(
        segmentsResult.segments.aCell,
        segmentsResult.segments.bCell,
        mesh.siteX,
        mesh.siteY
      ),
      values: segmentsResult.segments.regime,
      valueFormat: "u8",
      fileKey: "regime",
    });

    context.viz?.dumpSegments(context.trace, {
      layerId: "foundation.tectonics.segments",
      segments: segmentsFromCellPairs(
        segmentsResult.segments.aCell,
        segmentsResult.segments.bCell,
        mesh.siteX,
        mesh.siteY
      ),
      values: segmentsResult.segments.compression,
      valueFormat: "u8",
      fileKey: "compression",
    });

    context.viz?.dumpSegments(context.trace, {
      layerId: "foundation.tectonics.segments",
      segments: segmentsFromCellPairs(
        segmentsResult.segments.aCell,
        segmentsResult.segments.bCell,
        mesh.siteX,
        mesh.siteY
      ),
      values: segmentsResult.segments.extension,
      valueFormat: "u8",
      fileKey: "extension",
    });

    context.viz?.dumpSegments(context.trace, {
      layerId: "foundation.tectonics.segments",
      segments: segmentsFromCellPairs(
        segmentsResult.segments.aCell,
        segmentsResult.segments.bCell,
        mesh.siteX,
        mesh.siteY
      ),
      values: segmentsResult.segments.shear,
      valueFormat: "u8",
      fileKey: "shear",
    });

    context.viz?.dumpSegments(context.trace, {
      layerId: "foundation.tectonics.segments",
      segments: segmentsFromCellPairs(
        segmentsResult.segments.aCell,
        segmentsResult.segments.bCell,
        mesh.siteX,
        mesh.siteY
      ),
      values: segmentsResult.segments.volcanism,
      valueFormat: "u8",
      fileKey: "volcanism",
    });

    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.tectonicHistory.upliftTotal",
      positions,
      values: historyResult.tectonicHistory.upliftTotal,
      valueFormat: "u8",
    });
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.tectonicHistory.fractureTotal",
      positions,
      values: historyResult.tectonicHistory.fractureTotal,
      valueFormat: "u8",
    });
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.tectonicHistory.volcanismTotal",
      positions,
      values: historyResult.tectonicHistory.volcanismTotal,
      valueFormat: "u8",
    });
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.tectonicHistory.upliftRecentFraction",
      positions,
      values: historyResult.tectonicHistory.upliftRecentFraction,
      valueFormat: "u8",
    });
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.tectonicHistory.lastActiveEra",
      positions,
      values: historyResult.tectonicHistory.lastActiveEra,
      valueFormat: "u8",
    });

    const eras = historyResult.tectonicHistory.eras ?? [];
    for (let eraIndex = 0; eraIndex < eras.length; eraIndex++) {
      const era = eras[eraIndex];
      if (!era) continue;
      const prefix = `foundation.tectonicHistory.era${eraIndex}`;

      context.viz?.dumpPoints(context.trace, {
        layerId: `${prefix}.boundaryType`,
        positions,
        values: era.boundaryType,
        valueFormat: "u8",
      });
      context.viz?.dumpPoints(context.trace, {
        layerId: `${prefix}.upliftPotential`,
        positions,
        values: era.upliftPotential,
        valueFormat: "u8",
      });
      context.viz?.dumpPoints(context.trace, {
        layerId: `${prefix}.riftPotential`,
        positions,
        values: era.riftPotential,
        valueFormat: "u8",
      });
      context.viz?.dumpPoints(context.trace, {
        layerId: `${prefix}.shearStress`,
        positions,
        values: era.shearStress,
        valueFormat: "u8",
      });
      context.viz?.dumpPoints(context.trace, {
        layerId: `${prefix}.volcanism`,
        positions,
        values: era.volcanism,
        valueFormat: "u8",
      });
      context.viz?.dumpPoints(context.trace, {
        layerId: `${prefix}.fracture`,
        positions,
        values: era.fracture,
        valueFormat: "u8",
      });
    }
  },
});
