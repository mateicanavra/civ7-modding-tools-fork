/**
 * Canonical runtime config tree shape produced by the recipe compiler.
 *
 * - keyed by stage id
 * - keyed by step id
 * - values are canonical step configs (validated/defaulted/cleaned at compile-time)
 */
export type RecipeConfig = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

/**
 * Author input is stage-id keyed, with each stage config being a single object that contains:
 * - optional `knobs`
 * - either public fields (if the stage defines `public`) or step-id keyed configs (internal-as-public)
 */
export type RecipeConfigInput = Readonly<Partial<Record<string, unknown>>>;

export type CompiledRecipeConfig = RecipeConfig;

