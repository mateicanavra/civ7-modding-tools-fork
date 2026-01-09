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
