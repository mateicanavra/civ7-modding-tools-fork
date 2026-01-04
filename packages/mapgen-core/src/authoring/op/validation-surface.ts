import type { TSchema } from "typebox";

import type {
  ValidationError,
  CustomValidateFn,
  OpRunValidatedOptions,
  OpValidateOptions,
} from "../validation.js";
import {
  OpValidationError,
  validateOpCall,
  validateOpOutput,
} from "../validation.js";

export function attachValidationSurface<
  T extends Readonly<{ id: string; input: TSchema; output: TSchema; config: TSchema; run: any }>,
>(
  op: T,
  customValidate?: CustomValidateFn<any, any>
): T & {
  validate: (
    input: any,
    config: any,
    options?: OpValidateOptions
  ) => { ok: boolean; errors: ValidationError[] };
  runValidated: (input: any, config: any, options?: OpRunValidatedOptions) => any;
} {
  const validate = (input: unknown, config: unknown, options?: OpValidateOptions) =>
    validateOpCall(op, input, config, customValidate, options);

  const runValidated = (input: unknown, config: unknown, options?: OpRunValidatedOptions) => {
    const validated = validateOpCall(op, input, config, customValidate, { validateOutput: false });
    if (!validated.ok) throw new OpValidationError(op.id, validated.errors);

    const output = op.run(input as any, config as any);

    if (options?.validateOutput) {
      const out = validateOpOutput(op, input, output);
      if (!out.ok) throw new OpValidationError(op.id, out.errors);
    }

    return output;
  };

  return { ...(op as any), validate, runValidated };
}
