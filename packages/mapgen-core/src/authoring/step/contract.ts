import { Type, type TObject, type TSchema } from "typebox";

import { applySchemaConventions } from "../schema.js";
import type { ArtifactContract } from "../artifact/contract.js";
import { buildOpEnvelopeSchemaWithDefaultStrategy } from "../op/envelope.js";

import type { DependencyTag, GenerationPhase } from "@mapgen/engine/index.js";
import type { StepOpUse, StepOpsDecl, StepOpsDeclInput } from "./ops.js";

type PropsOf<T extends TObject> = T extends TObject<infer P> ? P : never;

type OpPropsFromDecl<Ops extends StepOpsDecl> = {
  [K in keyof Ops & string]: Ops[K]["config"];
};

type SchemaWithOps<Schema extends TObject, Ops extends StepOpsDecl | undefined> =
  Ops extends StepOpsDecl
    ? TObject<PropsOf<Schema> & OpPropsFromDecl<Ops>>
    : Schema;

function objectProperties(schema: TObject): Record<string, TSchema> {
  return ((schema as any).properties as Record<string, TSchema> | undefined) ?? {};
}

function buildSchemaWithOps<const Schema extends TObject, const Ops extends StepOpsDecl>(input: {
  stepId: string;
  schema: Schema;
  ops: Ops;
}): SchemaWithOps<Schema, Ops> {
  const baseProps = objectProperties(input.schema);
  const opProps: Record<string, TSchema> = {};

  for (const opKey of Object.keys(input.ops) as Array<keyof Ops & string>) {
    if (Object.prototype.hasOwnProperty.call(baseProps, opKey)) {
      throw new Error(
        `step "${input.stepId}" schema already defines key "${opKey}" (declare it only via contract.ops)`
      );
    }
    const contract = input.ops[opKey]!;
    if (!contract.config) {
      throw new Error(`step "${input.stepId}" op "${String(opKey)}" missing contract.config`);
    }
    opProps[opKey] = contract.config;
  }

  return Type.Object({ ...baseProps, ...(opProps as any) }, { additionalProperties: false }) as any;
}

type StepOpsDeclNormalizedFromInput<Ops extends StepOpsDeclInput> = Readonly<{
  [K in keyof Ops & string]: NormalizeOpDecl<Ops[K]>;
}>;

type NormalizeOpDecl<T> = T extends StepOpUse<infer C> ? C : T;

function isOpUse(value: unknown): value is StepOpUse {
  return Boolean(value) && typeof value === "object" && "contract" in (value as any);
}

function normalizeOpsDecl<const Ops extends StepOpsDeclInput>(input: {
  stepId: string;
  ops: Ops;
}): StepOpsDeclNormalizedFromInput<Ops> {
  const out: Record<string, any> = {};

  for (const opKey of Object.keys(input.ops) as Array<keyof Ops & string>) {
    const entry = input.ops[opKey];

    if (!isOpUse(entry)) {
      out[opKey] = entry;
      continue;
    }

    const contract = entry.contract;
    const defaultStrategy = entry.defaultStrategy;
    if (!defaultStrategy) {
      out[opKey] = contract;
      continue;
    }

    const { schema: config, defaultConfig } = buildOpEnvelopeSchemaWithDefaultStrategy(
      contract.id,
      contract.strategies,
      defaultStrategy
    );
    applySchemaConventions(config, `op:${contract.id}.config`);

    out[opKey] = {
      ...contract,
      config,
      defaultConfig,
    };
  }

  return out as StepOpsDeclNormalizedFromInput<Ops>;
}

export type StepArtifactsDecl<
  Requires extends readonly ArtifactContract[] | undefined = undefined,
  Provides extends readonly ArtifactContract[] | undefined = undefined,
> = Readonly<{
  requires?: Requires;
  provides?: Provides;
}>;

export type StepArtifactsDeclAny = StepArtifactsDecl<
  readonly ArtifactContract[] | undefined,
  readonly ArtifactContract[] | undefined
>;

type StepArtifactsDeclInput = Readonly<{
  requires?: readonly ArtifactContract[];
  provides?: readonly ArtifactContract[];
}>;

type StepArtifactsRequires<T> = T extends { requires?: infer R } ? R : undefined;
type StepArtifactsProvides<T> = T extends { provides?: infer P } ? P : undefined;

type CoerceArtifactList<T> =
  Extract<T, readonly ArtifactContract[]> extends never ? undefined : Extract<T, readonly ArtifactContract[]>;

type StepArtifactsDeclFromInput<T extends StepArtifactsDeclInput | undefined> =
  T extends StepArtifactsDeclInput
    ? StepArtifactsDecl<
        CoerceArtifactList<StepArtifactsRequires<T>>,
        CoerceArtifactList<StepArtifactsProvides<T>>
      >
    : undefined;

export type StepContract<
  Schema extends TObject,
  Id extends string,
  Ops extends StepOpsDecl | undefined = undefined,
  Artifacts extends StepArtifactsDeclAny | undefined = StepArtifactsDeclAny | undefined,
> = Readonly<{
  id: Id;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  artifacts?: Artifacts;
  schema: Schema;
  ops?: Ops;
}>;

type StepContractInput<
  Schema extends TObject,
  Id extends string,
  Ops extends StepOpsDeclInput | undefined,
  Artifacts extends StepArtifactsDeclInput | undefined,
> = Readonly<{
  id: Id;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  artifacts?: Artifacts;
  schema: Schema;
  ops?: Ops;
}>;

const STEP_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function defineStep<const Schema extends TObject, const Id extends string>(
  def: StepContractInput<Schema, Id, undefined, undefined>
): StepContract<Schema, Id, undefined, undefined>;

export function defineStep<
  const Schema extends TObject,
  const Id extends string,
  const Artifacts extends StepArtifactsDeclInput,
>(
  def: StepContractInput<Schema, Id, undefined, Artifacts> & { artifacts: Artifacts }
): StepContract<Schema, Id, undefined, StepArtifactsDeclFromInput<Artifacts>>;

export function defineStep<
  const Schema extends TObject,
  const Id extends string,
  const Ops extends StepOpsDeclInput,
>(
  def: StepContractInput<Schema, Id, Ops, undefined> & { ops: Ops }
): StepContract<
  SchemaWithOps<Schema, StepOpsDeclNormalizedFromInput<Ops>>,
  Id,
  StepOpsDeclNormalizedFromInput<Ops>,
  undefined
>;

export function defineStep<
  const Schema extends TObject,
  const Id extends string,
  const Ops extends StepOpsDeclInput,
  const Artifacts extends StepArtifactsDeclInput,
>(
  def: StepContractInput<Schema, Id, Ops, Artifacts> & { ops: Ops; artifacts: Artifacts }
): StepContract<
  SchemaWithOps<Schema, StepOpsDeclNormalizedFromInput<Ops>>,
  Id,
  StepOpsDeclNormalizedFromInput<Ops>,
  StepArtifactsDeclFromInput<Artifacts>
>;

export function defineStep(def: any): any {
  if (!STEP_ID_RE.test(def.id)) {
    throw new Error(`step id "${def.id}" must be kebab-case (e.g. "plot-vegetation")`);
  }

  const artifactRequires: string[] = def.artifacts?.requires?.map((artifact: ArtifactContract) => artifact.id) ?? [];
  const artifactProvides: string[] = def.artifacts?.provides?.map((artifact: ArtifactContract) => artifact.id) ?? [];
  const hasArtifacts = Boolean(def.artifacts);

  if (hasArtifacts) {
    const directArtifactTags = [...def.requires, ...def.provides].filter((tag: string) =>
      tag.startsWith("artifact:")
    );
    if (directArtifactTags.length > 0) {
      throw new Error(
        `step "${def.id}" mixes artifact ids in requires/provides with artifacts.*; move artifact ids into artifacts.*`
      );
    }
  }

  const seenArtifacts = new Set<string>();
  for (const id of artifactRequires) {
    if (seenArtifacts.has(id)) {
      throw new Error(`step "${def.id}" declares artifact "${id}" multiple times in artifacts.requires`);
    }
    seenArtifacts.add(id);
  }
  for (const id of artifactProvides) {
    if (seenArtifacts.has(id)) {
      throw new Error(
        `step "${def.id}" declares artifact "${id}" in both artifacts.requires and artifacts.provides`
      );
    }
    seenArtifacts.add(id);
  }

  const requires = [...def.requires, ...artifactRequires];
  const provides = [...def.provides, ...artifactProvides];

  const ops = def.ops ? normalizeOpsDecl({ stepId: def.id, ops: def.ops }) : undefined;

  const schema = ops
    ? buildSchemaWithOps({ stepId: def.id, schema: def.schema, ops })
    : def.schema;
  applySchemaConventions(schema, `step:${def.id}.schema`);

  return {
    ...def,
    requires,
    provides,
    ops,
    schema,
  };
}
