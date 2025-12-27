export type {
  DependencyTag,
  GenerationPhase,
  MapGenStep,
  PipelineStepResult,
} from "@mapgen/pipeline/types.js";
export type { PipelineModV1 } from "@mapgen/pipeline/mod.js";
export {
  DuplicateStepError,
  UnknownStepError,
  MissingDependencyError,
  DuplicateDependencyTagError,
  InvalidDependencyTagError,
  InvalidDependencyTagDemoError,
  UnknownDependencyTagError,
  UnsatisfiedProvidesError,
} from "@mapgen/pipeline/errors.js";
export {
  TagRegistry,
  computeInitialSatisfiedTags,
  isDependencyTagSatisfied,
  validateDependencyTag,
  validateDependencyTags,
} from "@mapgen/pipeline/tags.js";
export type { DependencyTagDefinition, DependencyTagKind, TagOwner } from "@mapgen/pipeline/tags.js";
export { StepRegistry } from "@mapgen/pipeline/StepRegistry.js";
export { PipelineExecutor } from "@mapgen/pipeline/PipelineExecutor.js";
export {
  compileExecutionPlan,
  ExecutionPlanCompileError,
  RecipeStepV1Schema,
  RecipeV1Schema,
  RunRequestSchema,
  RunSettingsSchema,
  TraceConfigSchema,
  TraceLevelSchema,
} from "@mapgen/pipeline/execution-plan.js";
export type {
  ExecutionPlan,
  ExecutionPlanCompileErrorCode,
  ExecutionPlanCompileErrorItem,
  ExecutionPlanNode,
  RecipeStepV1,
  RecipeV1,
  RunRequest,
  RunSettings,
} from "@mapgen/pipeline/execution-plan.js";

export {
  computePlanFingerprint,
  createTraceSessionFromPlan,
  deriveRunId,
} from "@mapgen/pipeline/observability.js";

export { registerFoundationLayer, type FoundationLayerRuntime } from "@mapgen/pipeline/foundation/index.js";
export { registerMorphologyLayer, type MorphologyLayerRuntime } from "@mapgen/pipeline/morphology/index.js";
export { registerHydrologyLayer, type HydrologyLayerRuntime } from "@mapgen/pipeline/hydrology/index.js";
export { registerNarrativeLayer, type NarrativeLayerRuntime } from "@mapgen/pipeline/narrative/index.js";
export { registerEcologyLayer, type EcologyLayerRuntime } from "@mapgen/pipeline/ecology/index.js";
export { registerPlacementLayer, type PlacementLayerRuntime } from "@mapgen/pipeline/placement/index.js";
