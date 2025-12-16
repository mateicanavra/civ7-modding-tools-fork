import type { ExtendedMapContext } from "../../core/types.js";
import type { StepRegistry } from "../../pipeline/index.js";
import { createFoundationStep } from "./FoundationStep.js";

export interface FoundationLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  stageFlags: Record<string, boolean>;
  runFoundation: (context: ExtendedMapContext) => void;
}

export function registerFoundationLayer(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: FoundationLayerRuntime
): void {
  registry.register(
    createFoundationStep(
      { runFoundation: runtime.runFoundation },
      {
        ...runtime.getStageDescriptor("foundation"),
        shouldRun: () => runtime.stageFlags.foundation,
      }
    )
  );
}
