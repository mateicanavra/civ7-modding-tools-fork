import { Type, type Static, type TObject, type TSchema } from "typebox";

import type { Step } from "./steps";

export const RESERVED_STAGE_KEY = "knobs" as const;
export type ReservedStageKey = typeof RESERVED_STAGE_KEY;

export type StageToInternalResult<StepId extends string, Knobs> = Readonly<{
  knobs: Knobs;
  rawSteps: Partial<Record<StepId, unknown>>;
}>;

function assertSchema(value: unknown, stepId?: string, stageId?: string): void {
  if (value == null) {
    const label = stepId ? `step "${stepId}"` : "step";
    const scope = stageId ? ` in stage "${stageId}"` : "";
    throw new Error(`createStage requires an explicit schema for ${label}${scope}`);
  }
}

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

type StepsArray<TContext> = readonly Step<TContext, any>[];

type StepIdOf<TSteps extends StepsArray<any>> = TSteps[number]["contract"]["id"] & string;
type NonReservedStepIdOf<TSteps extends StepsArray<any>> = Exclude<StepIdOf<TSteps>, ReservedStageKey>;

type StepConfigInputById<
  TSteps extends StepsArray<any>,
  TStepId extends StepIdOf<TSteps>,
> = Extract<TSteps[number], { contract: { id: TStepId } }> extends Step<any, infer TConfig>
  ? TConfig
  : unknown;

const STEP_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assertKebabCaseStepIds(input: { stageId: string; stepIds: readonly string[] }): void {
  for (const id of input.stepIds) {
    if (!STEP_ID_RE.test(id)) {
      throw new Error(
        `stage("${input.stageId}") step id "${id}" must be kebab-case (e.g. "plot-vegetation")`
      );
    }
  }
}

function objectProperties(schema: TObject): Record<string, TSchema> {
  const props = (schema as any).properties as Record<string, TSchema> | undefined;
  return props ?? {};
}

function buildInternalAsPublicSurfaceSchema(stepIds: readonly string[], knobsSchema: TObject): TObject {
  const properties: Record<string, TSchema> = {
    knobs: Type.Optional(knobsSchema),
  };
  for (const stepId of stepIds) {
    properties[stepId] = Type.Optional(Type.Unknown());
  }
  return Type.Object(properties, { additionalProperties: false });
}

function buildPublicSurfaceSchema(publicSchema: TObject, knobsSchema: TObject): TObject {
  return Type.Object(
    { knobs: Type.Optional(knobsSchema), ...objectProperties(publicSchema) },
    { additionalProperties: false }
  );
}

export type StageCompileFn<PublicSchema extends TObject, StepId extends string, Knobs> = (args: {
  env: unknown;
  knobs: Knobs;
  config: Static<PublicSchema>;
}) => Partial<Record<StepId, unknown>>;

export type StageDef<
  Id extends string,
  TContext,
  KnobsSchema extends TObject,
  Knobs = Static<KnobsSchema>,
  TSteps extends StepsArray<TContext> = StepsArray<TContext>,
  PublicSchema extends TObject | undefined = undefined,
> = Readonly<{
  id: Id;
  steps: TSteps;
  knobsSchema: KnobsSchema;
  public?: PublicSchema;
  compile?: PublicSchema extends TObject
    ? StageCompileFn<PublicSchema, NonReservedStepIdOf<TSteps>, Knobs>
    : undefined;
}>;

export type StageContract<
  Id extends string,
  TContext,
  KnobsSchema extends TObject,
  Knobs = Static<KnobsSchema>,
  TSteps extends StepsArray<TContext> = StepsArray<TContext>,
  PublicSchema extends TObject | undefined = undefined,
> = StageDef<Id, TContext, KnobsSchema, Knobs, TSteps, PublicSchema> &
  Readonly<{
    surfaceSchema: TObject;
    toInternal: (args: { env: unknown; stageConfig: unknown }) => StageToInternalResult<
      NonReservedStepIdOf<TSteps>,
      Knobs
    >;
  }>;

export type StageContractAny = StageContract<string, any, any, any, any, any>;

type StageContractOf<TDef extends StageDef<string, any, TObject, any, any, TObject | undefined>> =
  TDef extends StageDef<
    infer Id,
    infer TContext,
    infer KnobsSchema,
    infer Knobs,
    infer TSteps,
    infer PublicSchema
  >
    ? StageContract<Id, TContext, KnobsSchema, Knobs, TSteps, PublicSchema>
    : never;

export function createStage<
  const TDef extends StageDef<string, any, TObject, any, any, TObject | undefined>,
>(
  def: TDef
): StageContractOf<TDef> {
  const stepIds = (def.steps as ReadonlyArray<{ contract: { id: string } }>).map(
    (step) => step.contract.id
  );
  assertNoReservedStageKeys({ stageId: def.id, stepIds, publicSchema: def.public });
  assertKebabCaseStepIds({ stageId: def.id, stepIds });

  if (def.public && typeof (def as any).compile !== "function") {
    throw new Error(`stage("${def.id}") defines "public" but does not define "compile"`);
  }

  for (const step of def.steps as ReadonlyArray<{ contract: { id: string; schema: unknown } }>) {
    assertSchema(step.contract.schema, step.contract.id, def.id);
  }

  const surfaceSchema = def.public
    ? buildPublicSurfaceSchema(def.public, def.knobsSchema)
    : buildInternalAsPublicSurfaceSchema(
        stepIds.filter((id: string) => id !== RESERVED_STAGE_KEY),
        def.knobsSchema
      );

  const toInternal = ({
    env,
    stageConfig,
  }: {
    env: unknown;
    stageConfig: unknown;
  }): StageToInternalResult<string, unknown> => {
    const { knobs = {}, ...configPart } = stageConfig as Record<string, unknown>;
    const rawSteps = def.public
      ? (def as any).compile({ env, knobs, config: configPart }) ?? {}
      : configPart;
    if (Object.prototype.hasOwnProperty.call(rawSteps, RESERVED_STAGE_KEY)) {
      throw new Error(`stage("${def.id}") compile returned reserved key "${RESERVED_STAGE_KEY}"`);
    }
    return { knobs, rawSteps };
  };

  return { ...(def as any), surfaceSchema, toInternal };
}

export type StageConfigInputOf<TStage extends StageContractAny> =
  Readonly<{ knobs?: Partial<Static<TStage["knobsSchema"]>> }> &
    (TStage["public"] extends TObject
      ? Static<TStage["public"]>
      : Partial<{
          [K in NonReservedStepIdOf<TStage["steps"]>]: StepConfigInputById<TStage["steps"], K>;
        }>);
