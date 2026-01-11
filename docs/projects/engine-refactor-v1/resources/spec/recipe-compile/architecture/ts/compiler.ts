import type { TSchema } from "typebox";

import type { DomainOpCompileAny } from "./ops";
import type { StageToInternalResult } from "./stages";
import type { RecipeConfig, RecipeConfigInput } from "./recipes";

export type CompileErrorCode =
  | "config.invalid"
  | "stage.compile.failed"
  | "stage.unknown-step-id"
  | "op.config.invalid"
  | "op.missing"
  | "step.normalize.failed"
  | "op.normalize.failed"
  | "normalize.not.shape-preserving";

export type CompileErrorItem = Readonly<{
  code: CompileErrorCode;
  path: string;
  message: string;
  stageId?: string;
  stepId?: string;
  opKey?: string;
  opId?: string;
}>;

export class RecipeCompileError extends Error {
  readonly errors: CompileErrorItem[];

  constructor(errors: CompileErrorItem[]) {
    const message = errors.map((err) => `${err.path}: ${err.message}`).join("; ");
    super(`Recipe compile failed: ${message}`);
    this.name = "RecipeCompileError";
    this.errors = errors;
  }
}

export type CompileOpsById = Readonly<Record<string, DomainOpCompileAny>>;

export type StepContractAny = Readonly<{
  id: string;
  schema: TSchema;
}>;

export type StepModuleAny = Readonly<{
  contract: StepContractAny;
  normalize?: (config: unknown, ctx: Readonly<{ env: unknown; knobs: unknown }>) => unknown;
}>;

export type StageContractAny = Readonly<{
  id: string;
  surfaceSchema: TSchema;
  toInternal: (args: { env: unknown; stageConfig: unknown }) => StageToInternalResult;
  steps: readonly StepModuleAny[];
}>;

export declare function compileRecipeConfig(args: {
  env: unknown;
  recipe: Readonly<{ stages: readonly StageContractAny[] }>;
  config: RecipeConfigInput | null | undefined;
  compileOpsById: CompileOpsById;
}): RecipeConfig;
