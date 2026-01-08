### A.5 Recipes: author input vs compiled output typing (O2 pinned)

Files:
- `packages/mapgen-core/src/authoring/types.ts` (baseline; recipe typing reworked for stage-surface configs)
- `packages/mapgen-core/src/compiler/recipe-compile.ts` **NEW (planned)** (compiler entrypoint signature)

```ts
import type { Static } from "typebox";

import type { Env } from "../core/env.js";
import type { StageContract, StageConfigInputOf } from "../authoring/stage.js";
import type { StepConfigOf } from "../authoring/step/contract.js";

type AnyStage = StageContract<string, any, any, any, any, any, any>;

type StageIdOf<TStages extends readonly AnyStage[]> = TStages[number]["id"] & string;

type StageById<TStages extends readonly AnyStage[], Id extends StageIdOf<TStages>> = Extract<
  TStages[number],
  { id: Id }
>;

type StepsOf<TStage extends AnyStage> = TStage["steps"];
type StepIdOf<TStage extends AnyStage> = StepsOf<TStage>[number]["contract"]["id"] & string;

type StepById<TStage extends AnyStage, Id extends StepIdOf<TStage>> = Extract<
  StepsOf<TStage>[number],
  { contract: { id: Id } }
>;

// Author-facing recipe input: stage-id keyed; each stage config is a *single object* (knobs + fields).
export type RecipeConfigInputOf<TStages extends readonly AnyStage[]> = Readonly<
  Partial<{
    [K in StageIdOf<TStages>]: StageConfigInputOf<StageById<TStages, K>>;
  }>
>;

// Compiler output: fully canonical internal step config tree.
//
// Shape intent:
// - total by stage id
// - total by step id
// - step configs are canonical `Static<contract.schema>` (op envelopes present; strict keys)
// - knobs are consumed during compilation and are not part of the runtime config tree
export type CompiledRecipeConfigOf<TStages extends readonly AnyStage[]> = Readonly<{
  [K in StageIdOf<TStages>]: Readonly<{
    [S in StepIdOf<StageById<TStages, K>>]: StepConfigOf<StepById<StageById<TStages, K>, S>["contract"]>;
  }>;
}>;

// NEW (planned): compiler-owned entrypoint.
//
// Pinned behavior:
// - always-on pipeline (even when stage public === internal)
// - no runtime defaulting/cleaning: this produces canonical configs pre-runtime
// - ordering matches §1.9 Phase A/B
export declare function compileRecipeConfig<const TStages extends readonly AnyStage[]>(args: {
  env: Env;
  recipe: Readonly<{ stages: TStages }>;
  config: RecipeConfigInputOf<TStages> | null | undefined;
}): CompiledRecipeConfigOf<TStages>;
```
