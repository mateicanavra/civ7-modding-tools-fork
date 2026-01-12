import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep, type Static } from "@swooper/mapgen-core/authoring";
import { runFoundationStage } from "../producer.js";
import FoundationStepContract from "./foundation.contract.js";
type FoundationStepConfig = Static<typeof FoundationStepContract.schema>;

export default createStep(FoundationStepContract, {
  run: (context: ExtendedMapContext, config: FoundationStepConfig) => {
    runFoundationStage(context, config.foundation);
  },
});
