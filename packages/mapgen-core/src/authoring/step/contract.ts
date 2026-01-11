import { Type, type TObject, type TSchema, type TUnsafe } from "typebox";

import { applySchemaConventions } from "../schema.js";
import { buildOpEnvelopeSchema } from "../op/envelope.js";
import type { OpTypeBag } from "../op/types.js";

import type { DependencyTag, GenerationPhase } from "@mapgen/engine/index.js";
import type { StepOpsDecl } from "./ops.js";

type PropsOf<T extends TObject> = T extends TObject<infer P> ? P : never;

type OpPropsFromDecl<Ops extends StepOpsDecl> = {
  [K in keyof Ops]: TUnsafe<OpTypeBag<Ops[K]>["envelope"]>;
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
    opProps[opKey] = buildOpEnvelopeSchema(contract.id, contract.strategies).schema;
  }

  return Type.Object({ ...baseProps, ...(opProps as any) }, { additionalProperties: false }) as any;
}

export type StepContract<
  Schema extends TObject,
  Id extends string,
  Ops extends StepOpsDecl | undefined = undefined,
> = Readonly<{
  id: Id;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  schema: Schema;
  ops?: Ops;
}>;

const STEP_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function defineStep<
  const Schema extends TObject,
  const Id extends string,
  const Ops extends StepOpsDecl | undefined,
>(def: StepContract<Schema, Id, Ops>): StepContract<SchemaWithOps<Schema, Ops>, Id, Ops> {
  if (!STEP_ID_RE.test(def.id)) {
    throw new Error(`step id "${def.id}" must be kebab-case (e.g. "plot-vegetation")`);
  }

  const schema = def.ops
    ? buildSchemaWithOps({ stepId: def.id, schema: def.schema, ops: def.ops })
    : def.schema;
  applySchemaConventions(schema, `step:${def.id}.schema`);

  return {
    ...def,
    schema: schema as any,
  };
}
