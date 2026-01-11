import type { TSchema } from "typebox";

import type { DomainOpCompileAny } from "../authoring/bindings.js";
import type { CompiledRecipeConfigOf, RecipeConfigInputOf } from "../authoring/types.js";
import type { NormalizeCtx, StepOpsDecl } from "./normalize.js";
import { normalizeOpsTopLevel, normalizeStrict, prefillOpDefaults } from "./normalize.js";

export type CompileErrorCode =
  | "config.invalid"
  | "stage.compile.failed"
  | "stage.unknown-step-id"
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
  ops?: StepOpsDecl;
}>;

export type StepModuleAny = Readonly<{
  contract: StepContractAny;
  normalize?: (config: unknown, ctx: NormalizeCtx<any, any>) => unknown;
}>;

export type StageToInternalResult<StepId extends string = string, Knobs = unknown> = Readonly<{
  knobs: Knobs;
  rawSteps: Partial<Record<StepId, unknown>>;
}>;

export type StageContractAny = Readonly<{
  id: string;
  surfaceSchema: TSchema;
  toInternal: (args: { env: unknown; stageConfig: unknown }) => StageToInternalResult;
  steps: readonly StepModuleAny[];
}>;

const RESERVED_STAGE_KEY = "knobs";

export function compileRecipeConfig<const TStages extends readonly StageContractAny[]>(args: {
  env: unknown;
  recipe: Readonly<{ stages: TStages }>;
  config: RecipeConfigInputOf<any> | null | undefined;
  compileOpsById: CompileOpsById;
}): CompiledRecipeConfigOf<any> {
  const errors: CompileErrorItem[] = [];
  const out: Record<string, Record<string, unknown>> = {};

  const env = args.env;
  const recipe = args.recipe as Readonly<{ stages: readonly StageContractAny[] }>;
  const config = (args.config ?? {}) as Record<string, unknown>;
  const compileOpsById = args.compileOpsById;

  for (const stage of recipe.stages) {
    const stageId = stage.id;
    const stagePath = `/config/${stageId}`;

    const { value: stageConfig, errors: stageErrors } = normalizeStrict(
      stage.surfaceSchema as TSchema,
      config[stageId],
      stagePath
    );
    if (stageErrors.length > 0) {
      errors.push(...stageErrors.map((e) => ({ ...e, stageId })));
      continue;
    }

    let internal: StageToInternalResult;
    try {
      internal = stage.toInternal({ env, stageConfig });
    } catch (err) {
      errors.push({
        code: "stage.compile.failed",
        path: stagePath,
        message: err instanceof Error ? err.message : "stage.compile/toInternal failed",
        stageId,
      });
      continue;
    }

    const stageOut: Record<string, unknown> = {};
    const { knobs, rawSteps } = internal;

    const declaredStepIds = new Set(
      stage.steps.map((step) => step.contract.id).filter((id) => id !== RESERVED_STAGE_KEY)
    );
    const unknownStepIds = Object.keys((rawSteps ?? {}) as Record<string, unknown>).filter(
      (id) => id !== RESERVED_STAGE_KEY && !declaredStepIds.has(id)
    );
    if (unknownStepIds.length > 0) {
      for (const id of unknownStepIds) {
        errors.push({
          code: "stage.unknown-step-id",
          path: `${stagePath}/${id}`,
          message: `Unknown step id "${id}" returned by stage.compile/toInternal (must be declared in stage.steps)`,
          stageId,
          stepId: id,
        });
      }
      continue;
    }

    for (const step of stage.steps) {
      const stepId = step.contract.id;
      const stepPath = `${stagePath}/${stepId}`;

      const { value: prefilled, errors: prefillErrors } = prefillOpDefaults(
        step,
        (rawSteps as Record<string, unknown> | undefined)?.[stepId],
        stepPath
      );
      if (prefillErrors.length > 0) {
        errors.push(...prefillErrors.map((e) => ({ ...e, stageId, stepId })));
        continue;
      }

      const { value: strict1, errors: strict1Errors } = normalizeStrict(
        step.contract.schema as TSchema,
        prefilled,
        stepPath
      );
      if (strict1Errors.length > 0) {
        errors.push(...strict1Errors.map((e) => ({ ...e, stageId, stepId })));
        continue;
      }

      let normalized: unknown = strict1;
      if (typeof step.normalize === "function") {
        let next: unknown;
        try {
          next = step.normalize(normalized, { env, knobs });
        } catch (err) {
          errors.push({
            code: "step.normalize.failed",
            path: stepPath,
            message: err instanceof Error ? err.message : "step.normalize failed",
            stageId,
            stepId,
          });
          continue;
        }

        const { value: strict2, errors: strict2Errors } = normalizeStrict(
          step.contract.schema as TSchema,
          next,
          stepPath
        );
        if (strict2Errors.length > 0) {
          errors.push(...strict2Errors.map((e) => ({ ...e, stageId, stepId })));
          errors.push({
            code: "normalize.not.shape-preserving",
            path: stepPath,
            message: "step.normalize returned a value that does not validate against the step schema",
            stageId,
            stepId,
          });
          continue;
        }
        normalized = strict2;
      }

      const { value: opNormalized, errors: opNormErrors } = normalizeOpsTopLevel(
        step,
        normalized as Record<string, unknown>,
        { env, knobs } as NormalizeCtx<any, any>,
        compileOpsById,
        stepPath
      );
      if (opNormErrors.length > 0) {
        errors.push(...opNormErrors.map((e) => ({ ...e, stageId, stepId })));
        continue;
      }

      const { value: strict3, errors: strict3Errors } = normalizeStrict(
        step.contract.schema as TSchema,
        opNormalized,
        stepPath
      );
      if (strict3Errors.length > 0) {
        errors.push(...strict3Errors.map((e) => ({ ...e, stageId, stepId })));
        continue;
      }

      stageOut[stepId] = strict3;
    }

    out[stageId] = stageOut;
  }

  if (errors.length > 0) throw new RecipeCompileError(errors);
  return out as CompiledRecipeConfigOf<any>;
}
