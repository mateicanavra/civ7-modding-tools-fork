### A.4 Stages: single surface schema, reserved key enforcement, and knobs threading (pinned)

Files:
- `packages/mapgen-core/src/authoring/stage.ts` (baseline; extended)
- `packages/mapgen-core/src/authoring/types.ts` (baseline; stage/recipe typing extended)

```ts
import { Type, type Static, type TObject } from "typebox";

import type { Env } from "../core/env.js";
import type { StepContractAny, StepModule, StepConfigInputOf } from "./step/contract.js";

export const RESERVED_STAGE_KEY = "knobs" as const;
export type ReservedStageKey = typeof RESERVED_STAGE_KEY;

export type StageToInternalResult<StepId extends string, Knobs> = Readonly<{
  knobs: Knobs;
  rawSteps: Partial<Record<StepId, unknown>>;
}>;

export function assertNoReservedStageKeys(input: {
  stageId: string;
  stepIds: readonly string[];
  publicSchema?: TObject | undefined;
}): void {
  if (input.stepIds.includes(RESERVED_STAGE_KEY)) {
    throw new Error(`stage("${input.stageId}") contains reserved step id "${RESERVED_STAGE_KEY}"`);
  }
  const props = (input.publicSchema as any)?.properties as Record<string, unknown> | undefined;
  if (props && Object.prototype.hasOwnProperty.call(props, RESERVED_STAGE_KEY)) {
    throw new Error(`stage("${input.stageId}") public schema contains reserved key "${RESERVED_STAGE_KEY}"`);
  }
}

type StepsArray<TContext, Knobs> = readonly StepModule<StepContractAny, TContext, Knobs>[];

type StepIdOf<TSteps extends StepsArray<any, any>> = TSteps[number]["contract"]["id"] & string;
type NonReservedStepIdOf<TSteps extends StepsArray<any, any>> = Exclude<
  StepIdOf<TSteps>,
  ReservedStageKey
>;

type StepContractById<
  TSteps extends StepsArray<any, any>,
  Id extends StepIdOf<TSteps>,
> = Extract<TSteps[number], { contract: { id: Id } }>["contract"];

type StepConfigInputById<
  TSteps extends StepsArray<any, any>,
  Id extends NonReservedStepIdOf<TSteps>,
> = StepConfigInputOf<StepContractById<TSteps, Id>>;

// NEW (planned): stage public schema is always an object schema (non-knob portion).
export type StageContract<
  Id extends string,
  TContext,
  KnobsSchema extends TObject,
  Knobs = Static<KnobsSchema>,
  TSteps extends StepsArray<TContext, Knobs> = StepsArray<TContext, Knobs>,
  PublicSchema extends TObject | undefined = undefined,
  SurfaceSchema extends TObject = TObject,
> = Readonly<{
  id: Id;
  steps: TSteps;
  knobsSchema: KnobsSchema;
  public?: PublicSchema;
  // Computed strict author-facing schema: knobs + (public fields OR step ids).
  surfaceSchema: SurfaceSchema;
  // Deterministic “public → internal” mapping: extracts knobs and produces raw step map.
  toInternal: (args: { env: Env; stageConfig: Static<SurfaceSchema> }) => StageToInternalResult<
    NonReservedStepIdOf<TSteps>,
    Knobs
  >;
}>;

// Factory surface (pinned):
// - reserved key enforcement is a hard throw
// - stage schemas are strict object schemas (surfaceSchema always a TObject)
export function createStage<const TStage extends StageContract<string, any, any, any, any, any, any>>(
  stage: TStage
): TStage {
  assertNoReservedStageKeys({
    stageId: stage.id,
    stepIds: stage.steps.map((s) => s.contract.id),
    publicSchema: stage.public,
  });
  return stage;
}

export type StageConfigInputOf<TStage extends StageContract<any, any, any, any, any, any>> =
  // Knobs are always present as a field (defaulting handled by `surfaceSchema`).
  Readonly<{ knobs?: Partial<Static<TStage["knobsSchema"]>> }> &
    (TStage["public"] extends TObject
      ? Static<TStage["public"]>
      : Partial<{
          [K in NonReservedStepIdOf<TStage["steps"]>]: StepConfigInputById<TStage["steps"], K>;
        }>
    );
```

Notes:
- `StageContract.surfaceSchema` is typed as `TObject` (R8) because it must always be an object schema with strictness behavior.
- Reserved-key enforcement is a hard throw (R7); it is not acceptable to leave this as lint-only.

