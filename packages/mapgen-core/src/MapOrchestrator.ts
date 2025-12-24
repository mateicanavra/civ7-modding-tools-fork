/**
 * MapOrchestrator (legacy)
 *
 * This entrypoint has been removed. Use the RunRequest → ExecutionPlan path.
 */

/// <reference types="@civ7/types" />

export class MapOrchestrator {
  constructor() {
    throw new Error(
      "MapOrchestrator has been removed. Use applyMapInitData(...) for RequestMapInitData and " +
        "runTaskGraphGeneration(...) or compileExecutionPlan(...)+PipelineExecutor for GenerateMap."
    );
  }
}

export default MapOrchestrator;
