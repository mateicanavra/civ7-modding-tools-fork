import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import { addRuggedCoasts } from "@mapgen/domain/morphology/coastlines/index.js";
import {
  getPublishedNarrativeCorridors,
  getPublishedNarrativeMotifsMargins,
} from "../../../artifacts.js";
import RuggedCoastsStepContract from "./ruggedCoasts.contract.js";
type RuggedCoastsStepConfig = Static<typeof RuggedCoastsStepContract.schema>;

export default createStep(RuggedCoastsStepContract, {
  run: (context: ExtendedMapContext, config: RuggedCoastsStepConfig) => {
    const { width, height } = context.dimensions;
    const margins = getPublishedNarrativeMotifsMargins(context);
    const corridors = getPublishedNarrativeCorridors(context);
    addRuggedCoasts(width, height, context, config, { margins, corridors });
  },
});
