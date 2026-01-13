import { Type, type TObject, type TSchema } from "typebox";

import { applySchemaConventions } from "../schema.js";
import type { ArtifactContract } from "../artifact/contract.js";

import type { DependencyTag, GenerationPhase } from "@mapgen/engine/index.js";
import type { StepOpsDecl } from "./ops.js";

type PropsOf<T extends TObject> = T extends TObject<infer P> ? P : never;

type OpPropsFromDecl<Ops extends StepOpsDecl> = {
  [K in keyof Ops]: Ops[K]["config"];
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

export type StepArtifactsDecl<
  Requires extends readonly ArtifactContract[] | undefined = undefined,
  Provides extends readonly ArtifactContract[] | undefined = undefined,
> = Readonly<{
  requires?: Requires;
  provides?: Provides;
}>;

export type StepContract<
  Schema extends TObject,
  Id extends string,
  Ops extends StepOpsDecl | undefined = undefined,
  Artifacts extends StepArtifactsDecl | undefined = StepArtifactsDecl | undefined,
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

export function defineStep<
  const Schema extends TObject,
  const Id extends string,
>(
  def: StepContract<Schema, Id, undefined, undefined> & { artifacts?: never }
): StepContract<Schema, Id, undefined, undefined>;

export function defineStep<
  const Schema extends TObject,
  const Id extends string,
  const Artifacts extends StepArtifactsDecl | undefined,
>(def: StepContract<Schema, Id, undefined, Artifacts>): StepContract<Schema, Id, undefined, Artifacts>;

export function defineStep<
  const Schema extends TObject,
  const Id extends string,
  const Ops extends StepOpsDecl,
>(
  def: StepContract<Schema, Id, Ops, undefined> & { ops: Ops; artifacts?: never }
): StepContract<SchemaWithOps<Schema, Ops>, Id, Ops, undefined>;

export function defineStep<
  const Schema extends TObject,
  const Id extends string,
  const Ops extends StepOpsDecl,
  const Artifacts extends StepArtifactsDecl | undefined,
>(
  def: StepContract<Schema, Id, Ops, Artifacts> & { ops: Ops }
): StepContract<SchemaWithOps<Schema, Ops>, Id, Ops, Artifacts>;

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

  const schema = def.ops
    ? buildSchemaWithOps({ stepId: def.id, schema: def.schema, ops: def.ops })
    : def.schema;
  applySchemaConventions(schema, `step:${def.id}.schema`);

  return {
    ...def,
    requires,
    provides,
    schema,
  };
}
