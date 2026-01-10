import type { Static } from "typebox";

import type { StageConfigInputOf, StageContractAny } from "./stages";

type AnyStage = StageContractAny;

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

type StepConfigOf<C extends { schema: any }> = Static<C["schema"]>;

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
