import { Type, type Static, type TObject, type TSchema } from "typebox";

import type { ExtendedMapContext } from "@mapgen/core/types.js";

import {
  RESERVED_STAGE_KEY,
  type StageContract,
  type StageDef,
  type StageToInternalResult,
} from "./types.js";
import { applySchemaDefaults } from "./schema.js";

function assertSchema(value: unknown, stepId?: string, stageId?: string): void {
  if (value == null) {
    const label = stepId ? `step "${stepId}"` : "step";
    const scope = stageId ? ` in stage "${stageId}"` : "";
    throw new Error(`createStage requires an explicit schema for ${label}${scope}`);
  }
}

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

function assertNoReservedStageKeys(input: {
  stageId: string;
  stepIds: readonly string[];
  publicSchema?: TObject | undefined;
}): void {
  if (input.stepIds.includes(RESERVED_STAGE_KEY)) {
    throw new Error(`stage("${input.stageId}") contains reserved step id "${RESERVED_STAGE_KEY}"`);
  }
  const props = (input.publicSchema as any)?.properties as Record<string, unknown> | undefined;
  if (props && Object.prototype.hasOwnProperty.call(props, RESERVED_STAGE_KEY)) {
    throw new Error(
      `stage("${input.stageId}") public schema contains reserved key "${RESERVED_STAGE_KEY}"`
    );
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

type StepsArray<TContext extends ExtendedMapContext> = readonly Readonly<{
  contract: Readonly<{
    id: string;
    schema: TSchema;
  }>;
}>[];

export function createStage<
  const Id extends string,
  TContext extends ExtendedMapContext,
  const KnobsSchema extends TObject,
  const TSteps extends StepsArray<TContext> = StepsArray<TContext>,
  Knobs = Static<KnobsSchema>,
>(
  def: StageDef<Id, TContext, KnobsSchema, Knobs, TSteps, undefined> & {
    public?: undefined;
    compile?: undefined;
  }
): StageContract<Id, TContext, KnobsSchema, Knobs, TSteps, undefined>;

export function createStage<
  const Id extends string,
  TContext extends ExtendedMapContext,
  const KnobsSchema extends TObject,
  const PublicSchema extends TObject,
  const TSteps extends StepsArray<TContext> = StepsArray<TContext>,
  Knobs = Static<KnobsSchema>,
>(
  def: StageDef<Id, TContext, KnobsSchema, Knobs, TSteps, PublicSchema> & {
    public: PublicSchema;
  }
): StageContract<Id, TContext, KnobsSchema, Knobs, TSteps, PublicSchema>;

export function createStage(def: any): any {
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
    const { knobs, ...configPart } = stageConfig as Record<string, unknown>;
    const resolvedKnobs = applySchemaDefaults(def.knobsSchema, knobs);
    const rawSteps = def.public
      ? (def as any).compile({ env, knobs: resolvedKnobs, config: configPart }) ?? {}
      : configPart;
    if (Object.prototype.hasOwnProperty.call(rawSteps, RESERVED_STAGE_KEY)) {
      throw new Error(`stage("${def.id}") compile returned reserved key "${RESERVED_STAGE_KEY}"`);
    }
    return { knobs: resolvedKnobs, rawSteps };
  };

  return { ...(def as any), surfaceSchema, toInternal };
}
