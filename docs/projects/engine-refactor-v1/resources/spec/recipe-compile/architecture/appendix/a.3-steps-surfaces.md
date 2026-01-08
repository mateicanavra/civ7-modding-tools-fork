### A.3 Steps: contracts, config input vs compiled config, and module surfaces (pinned)

Files:
- `packages/mapgen-core/src/authoring/step/contract.ts` (baseline; extended)
- `packages/mapgen-core/src/authoring/step/create.ts` (baseline; extended)
- `packages/mapgen-core/src/authoring/types.ts` (baseline; step/module typing tightened)

```ts
import { Type, type Static, type TObject, type TSchema } from "typebox";

import type { DependencyTag, GenerationPhase } from "@mapgen/engine/index.js";

import type { Env } from "../../core/env.js";
import type { OpContract } from "../op/contract.js";
import { buildOpEnvelopeSchema } from "../op/envelope.js";

type OpContractAny = OpContract<any, any, any, any, any>;
export type StepOpsDecl = Readonly<Record<string, OpContractAny>>;

type ObjectKeys<T> = keyof T & string;
type OptionalizeKeys<T, K extends PropertyKey> =
  T extends object ? Omit<T, Extract<keyof T, K>> & Partial<Pick<T, Extract<keyof T, K>>> : T;

export type NormalizeCtx<Knobs> = Readonly<{ env: Env; knobs: Knobs }>;

type OpRefOf<C extends OpContractAny> = Readonly<{ id: C["id"]; config: TSchema }>;
type StepOpRefsOf<TDecl extends StepOpsDecl> = Readonly<{ [K in keyof TDecl & string]: OpRefOf<TDecl[K]> }>;

export type StepContractBase<Id extends string> = Readonly<{
  id: Id;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
}>;

// v1 authoring surface (and only these shapes):
// - schema-only
// - ops-only (schema derived)
// - ops+schema hybrid (schema author-owned; op keys are overwritten with derived envelope schemas)
export type StepContractSchemaOnly<Schema extends TSchema, Id extends string> =
  StepContractBase<Id> & Readonly<{ schema: Schema }>;

export type StepContractOpsOnly<TDecl extends StepOpsDecl, Id extends string> =
  StepContractBase<Id> &
    Readonly<{
      ops: TDecl;
      opRefs: StepOpRefsOf<TDecl>;
      schema: TObject; // derived from op envelopes (strict object)
    }>;

export type StepContractHybrid<TDecl extends StepOpsDecl, Schema extends TObject, Id extends string> =
  StepContractBase<Id> &
    Readonly<{
      ops: TDecl;
      opRefs: StepOpRefsOf<TDecl>;
      schema: Schema; // explicit, author-owned; must include op keys (see below)
    }>;

export type StepContractAny =
  | StepContractSchemaOnly<TSchema, string>
  | StepContractOpsOnly<StepOpsDecl, string>
  | StepContractHybrid<StepOpsDecl, TObject, string>;

export type StepConfigOf<C extends StepContractAny> = Static<C["schema"]>;

// Pinned: author-input type treats op envelope keys as optional (no inputSchema).
export type StepConfigInputOf<C extends StepContractAny> = C extends { ops: infer TDecl extends StepOpsDecl }
  ? OptionalizeKeys<StepConfigOf<C>, ObjectKeys<TDecl>>
  : StepConfigOf<C>;

type SchemaIncludesKeys<Schema extends TObject, Keys extends string> =
  Exclude<Keys, keyof Schema["properties"] & string> extends never ? Schema : never;

function deriveOpsSchemaProperties(ops: StepOpsDecl): Record<string, TSchema> {
  const out: Record<string, TSchema> = {};
  for (const key of Object.keys(ops)) {
    const contract = ops[key] as OpContractAny;
    out[key] = buildOpEnvelopeSchema(contract.id, contract.strategies).schema;
  }
  return out;
}

function deriveOpRefs<const TDecl extends StepOpsDecl>(ops: TDecl): StepOpRefsOf<TDecl> {
  const out: Record<string, OpRefOf<OpContractAny>> = {};
  for (const key of Object.keys(ops)) {
    const contract = ops[key] as OpContractAny;
    out[key] = { id: contract.id, config: buildOpEnvelopeSchema(contract.id, contract.strategies).schema };
  }
  return out as StepOpRefsOf<TDecl>;
}

export function defineStepContract<const Schema extends TSchema, const Id extends string>(
  def: StepContractSchemaOnly<Schema, Id>
): StepContractSchemaOnly<Schema, Id>;

export function defineStepContract<const TDecl extends StepOpsDecl, const Id extends string>(
  def: StepContractBase<Id> & Readonly<{ ops: TDecl; schema?: undefined }>
): StepContractOpsOnly<TDecl, Id>;

export function defineStepContract<
  const TDecl extends StepOpsDecl,
  const Schema extends TObject,
  const Id extends string,
>(
  def: StepContractBase<Id> &
    Readonly<{
      ops: TDecl;
      // Pinned: hybrid authors explicitly include the op envelope keys; factories overwrite the
      // op-key schemas from ops contracts so authors don't duplicate envelope schema definitions.
      schema: SchemaIncludesKeys<Schema, keyof TDecl & string>;
    }>
): StepContractHybrid<TDecl, Schema, Id>;

export function defineStepContract(def: any): any {
  if ("ops" in def && def.ops) {
    const opRefs = deriveOpRefs(def.ops);
    // If schema omitted: derive strict object schema from op envelopes (DX shortcut).
    if (!("schema" in def)) {
      const properties = deriveOpsSchemaProperties(def.ops);
      return {
        ...(def as any),
        opRefs,
        schema: Type.Object(properties, { additionalProperties: false }),
      };
    }

    // If schema provided: overwrite op-key property schemas with their derived envelope schemas.
    // This keeps "extras require explicit schema" while avoiding duplicated envelope schemas.
    const derived = deriveOpsSchemaProperties(def.ops);
    const schema = def.schema as TObject;
    const merged = Type.Object(
      { ...(schema as any).properties, ...derived },
      {
        additionalProperties: (schema as any).additionalProperties ?? false,
        default: (schema as any).default ?? {},
      }
    );
    return { ...(def as any), opRefs, schema: merged };
  }
  return def;
}

export type StepModule<
  C extends StepContractAny,
  TContext,
  Knobs
> = Readonly<{
  contract: C;
  // Compile-time only normalization hook (value-only; shape-preserving).
  normalize?: (config: StepConfigOf<C>, ctx: NormalizeCtx<Knobs>) => StepConfigOf<C>;
  // Runtime handler (pinned signature).
  run: (context: TContext, config: StepConfigOf<C>) => void | Promise<void>;
}>;

type StepImpl<C extends StepContractAny, TContext, Knobs> = Readonly<
  {
    normalize?: StepModule<C, TContext, Knobs>["normalize"];
    run: StepModule<C, TContext, Knobs>["run"];
  }
>;

// Factory surface (pinned):
// - step module always owns `contract`
// - runtime-facing `run(context, config)` stays baseline
// - ops are module-owned (closure) rather than a third `run` arg
export function createStep<const C extends StepContractAny, TContext, Knobs>(
  contract: C,
  impl: StepImpl<C, TContext, Knobs>
): StepModule<C, TContext, Knobs> {
  return { contract, ...(impl as any) } as StepModule<C, TContext, Knobs>;
}

export type CreateStepFor<TContext> = <const C extends StepContractAny, Knobs = unknown>(
  contract: C,
  impl: StepImpl<C, TContext, Knobs>
) => StepModule<C, TContext, Knobs>;

export function createStepFor<TContext>(): CreateStepFor<TContext> {
  return (contract, impl) => createStep(contract, impl);
}

// Engine-facing step surface (pinned boundary):
// - no compile-time hooks (`normalize` is compile-time only)
// - no op binding surface (`ops` are step-module private; `run` already closes over them)
export type EngineStep<TContext, C extends StepContractAny> = Readonly<{
  id: string; // fully-qualified execution id (namespace.recipe.stage.step)
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  configSchema: C["schema"];
  run: (context: TContext, config: StepConfigOf<C>) => void | Promise<void>;
}>;
```

