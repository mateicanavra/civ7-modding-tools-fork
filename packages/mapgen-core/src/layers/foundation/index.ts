import type { ExtendedMapContext } from "../../core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep, type StepRegistry } from "../../pipeline/index.js";

export interface FoundationLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  stageFlags: Record<string, boolean>;
  runFoundation: (context: ExtendedMapContext) => void;
}

export function registerFoundationLayer(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: FoundationLayerRuntime
): void {
  const step: MapGenStep<ExtendedMapContext> = {
    id: "foundation",
    phase: M3_STANDARD_STAGE_PHASE.foundation,
    ...runtime.getStageDescriptor("foundation"),
    shouldRun: () => runtime.stageFlags.foundation,
    run: (context) => {
      runtime.runFoundation(context);
    },
  };

  registry.register(step);
}

