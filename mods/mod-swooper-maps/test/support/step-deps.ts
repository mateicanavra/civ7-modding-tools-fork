import type { ExtendedMapContext } from "@swooper/mapgen-core";
import {
  ArtifactMissingError,
  type ArtifactContract,
  type StepDeps,
  type StepModule,
} from "@swooper/mapgen-core/authoring";

function createRequiredRuntime<TContext extends ExtendedMapContext>(
  contract: ArtifactContract,
  consumerStepId: string
) {
  return {
    contract,
    read: (context: TContext) => {
      if (!context.artifacts.has(contract.id)) {
        throw new ArtifactMissingError({
          artifactId: contract.id,
          artifactName: contract.name,
          consumerStepId,
        });
      }
      return context.artifacts.get(contract.id) as unknown;
    },
    tryRead: (context: TContext) => {
      if (!context.artifacts.has(contract.id)) return null;
      return context.artifacts.get(contract.id) as unknown;
    },
  };
}

export function buildTestDeps<TContext extends ExtendedMapContext>(
  step: StepModule<TContext, any, any, any>
): StepDeps<TContext, any> {
  const artifacts = step.contract.artifacts;
  if (!artifacts) {
    return { artifacts: {}, fields: {}, effects: {} };
  }

  const depsArtifacts: Record<string, unknown> = {};
  const stepId = step.contract.id;

  for (const contract of artifacts.requires ?? []) {
    depsArtifacts[contract.name] = createRequiredRuntime<TContext>(contract, stepId);
  }

  for (const contract of artifacts.provides ?? []) {
    const runtime = step.artifacts?.[contract.name as keyof typeof step.artifacts];
    if (!runtime) {
      throw new Error(`Test deps missing artifact runtime for "${contract.name}" in step "${stepId}"`);
    }
    depsArtifacts[contract.name] = runtime;
  }

  return { artifacts: depsArtifacts as StepDeps<TContext, any>["artifacts"], fields: {}, effects: {} };
}
