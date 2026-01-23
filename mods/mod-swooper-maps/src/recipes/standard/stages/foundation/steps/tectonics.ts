import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import TectonicsStepContract from "./tectonics.contract.js";
import {
  validateTectonicHistoryArtifact,
  validateTectonicSegmentsArtifact,
  validateTectonicsArtifact,
  wrapFoundationValidateNoDims,
} from "./validation.js";

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
  },
});
