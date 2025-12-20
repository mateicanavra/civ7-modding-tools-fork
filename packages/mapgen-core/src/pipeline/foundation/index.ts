import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StepRegistry } from "@mapgen/pipeline/index.js";
import { createFoundationStep } from "@mapgen/pipeline/foundation/steps.js";

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
