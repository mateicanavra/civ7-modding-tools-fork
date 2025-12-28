import type { TSchema } from "typebox";

import type { DependencyTag, GenerationPhase } from "@mapgen/engine/index.js";
import type { DependencyTagDefinition } from "@mapgen/engine/tags.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";

export type StepModule<TContext = ExtendedMapContext, TConfig = unknown> = Readonly<{
  id: string;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  schema: TSchema;
  run: (context: TContext, config: TConfig) => void | Promise<void>;
  instanceId?: string;
}>;

export type StageModule<TContext = ExtendedMapContext> = Readonly<{
  id: string;
  steps: readonly StepModule<TContext, unknown>[];
}>;

export type RecipeModule<TContext = ExtendedMapContext> = Readonly<{
  id: string;
  namespace?: string;
  tagDefinitions: readonly DependencyTagDefinition<TContext>[];
  stages: readonly StageModule<TContext>[];
}>;

