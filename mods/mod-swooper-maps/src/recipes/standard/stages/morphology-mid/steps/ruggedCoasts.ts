import { createStep } from "@swooper/mapgen-core/authoring";
import { addRuggedCoasts } from "@mapgen/domain/morphology/coastlines/index.js";
import RuggedCoastsStepContract from "./ruggedCoasts.contract.js";

export default createStep(RuggedCoastsStepContract, {
  run: (context, config, _ops, deps) => {
    const { width, height } = context.dimensions;
    void deps.artifacts.foundationPlates.read(context);
    const margins = deps.artifacts.motifsMargins.read(context);
    const corridors = deps.artifacts.corridors.read(context);
    addRuggedCoasts(width, height, context, config, { margins, corridors });
  },
});
