import type { OrchestratorConfig } from "./types.js";

export interface OrchestratorArgs {
  milestoneId: string;
}

export async function runOrchestrator(_config: OrchestratorConfig, _args: OrchestratorArgs) {
  throw new Error("Orchestrator not implemented yet.");
}
