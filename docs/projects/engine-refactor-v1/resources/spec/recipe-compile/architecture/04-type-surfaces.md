# Type Surfaces

This document contains all canonical TypeScript definitions. Section 1.8
provides the overview; Appendix A provides copy-paste ready implementations.

### 1.8 Canonical type surfaces (planned signatures + module layout)

This is the target “code reality” the proposals converge toward.

Grounding note:
- Any file path or symbol marked **NEW (planned)** does not exist in the repo baseline today.
- Where relevant, baseline owners are called out explicitly (file + symbol names).

#### `Env` (runtime envelope)

**NEW (planned)**: move the runtime envelope out of engine-only ownership by introducing `EnvSchema`/`Env`.

Planned location (does not exist today):
- `packages/mapgen-core/src/core/env.ts` **NEW (planned)** (env is core-owned so authoring/compiler/engine can share it without importing plan compiler internals)
  - `export const EnvSchema = Type.Object(...)`
  - `export type Env = Static<typeof EnvSchema>`

Baseline today (repo-verified):
- Runtime envelope schema/type live in `packages/mapgen-core/src/engine/execution-plan.ts`:
  - `RunSettingsSchema`
  - `RunSettings`
- Runtime envelope is threaded as `settings: RunSettings`:
  - engine plan compilation: `compileExecutionPlan(runRequest, registry)` in `packages/mapgen-core/src/engine/execution-plan.ts`
  - context storage: `ExtendedMapContext.settings: RunSettings` in `packages/mapgen-core/src/core/types.ts`

In the target architecture, engine imports `EnvSchema`; authoring/domain may import `Env` without importing engine.

TypeScript (copy-paste ready; baseline-derived):
- See Appendix A.1 (`packages/mapgen-core/src/core/env.ts`) for the exact `EnvSchema`/`Env` definition (lifted verbatim from baseline `RunSettingsSchema`/`RunSettings`).

#### Domain ops (contract-first, op envelopes)

Op contracts remain contract-first. Implementations expose:

```ts
// Baseline today (repo-verified): `DomainOp` in `packages/mapgen-core/src/authoring/op/types.ts`
//
// Notes:
// - Envelope schema is `DomainOp["config"]` (an `OpConfigSchema<Strategies>` which is a `TSchema`).
// - `resolveConfig(cfg, settings)` is a compile-time normalization hook; this proposal later renames it
//   to `normalize` (NEW (planned)).
type DomainOpAny = DomainOp<TSchema, TSchema, Record<string, { config: TSchema }>>;
```

TypeScript (pinned surfaces):
- Runtime steps must never see compile-time normalization hooks on ops. The runtime-facing op surface is explicitly narrowed (no `resolveConfig` / `normalize`), even if the underlying op implementation type still contains it.
- See §1.14 and Appendix A.2 for the canonical binding helpers (`bindCompileOps` / `bindRuntimeOps`) and the structural runtime-surface stripping rule (`runtimeOp(...)`).

#### Step contracts + step modules (ops injected, implementations bound by id)

Step contracts:
- Baseline today (repo-verified):
  - `StepContract` / `defineStepContract(...)`: `packages/mapgen-core/src/authoring/step/contract.ts`
  - `createStep(...)` enforces an explicit `contract.schema`: `packages/mapgen-core/src/authoring/step/create.ts`
  - step module hook today is `resolveConfig(config, settings: RunSettings)` (not `normalize`): `packages/mapgen-core/src/authoring/types.ts`
- **NEW (planned)**:
  - allow an ops-derived `schema` when ops are declared (DX shortcut; see 1.11)
  - add `ops` (e.g. `step.contract.ops`) to declare which op envelopes exist as top-level properties
  - rename step hook from `resolveConfig` → `normalize` (value-only; compile-time only)

Explicit decision (from this proposal’s v1 scope):
- There is no `inputSchema` / “optionalized mirror schema” for steps. A step has one canonical schema (`contract.schema`) representing plan-truth shape.
- Author-input “omitting envelopes” is handled by the compiler ordering:
  1) prefill missing op envelopes (from op contract defaults) and then
  2) strict schema normalization/validation against `contract.schema`.
- **NEW (planned)** (type-level): for steps that declare `ops`, the author-input config type treats op envelope keys as optional (since the compiler prefills before strict validation), while the compiled config type remains total/canonical.

Contract-level op declarations (to avoid bundling implementations into contracts):

```ts
// Baseline today (repo-verified):
// - `OpRef` and `opRef(...)`: `packages/mapgen-core/src/authoring/op/ref.ts`
type OpContractAny = OpContract<any, any, any, any, any>;

// NEW (planned): preserve literal op ids in references for DX (no `string` widening).
type OpRefOf<C extends OpContractAny> = Readonly<{ id: C["id"]; config: TSchema }>;

// NEW (planned): authors declare ops as contracts (DX); the factory derives OpRefs internally.
// The keys are the top-level op envelope keys in the step config (I6).
type StepOpsDecl = Readonly<Record<string, OpContractAny>>;

// NEW (planned): the compiled contract surface stores OpRefs (cheap to import; no impl bundling).
type StepOpsOf<TDecl extends StepOpsDecl> = Readonly<{ [K in keyof TDecl & string]: OpRefOf<TDecl[K]> }>;
```

Step module binding (conceptual):
- step contract declares ops as contracts; `defineStepContract` derives envelope schemas/refs for compiler use (cheap; no impl bundling)
- step module binds contract ids → actual op implementations from the domain registry (see §1.14)
- runtime step implementation uses bound runtime ops via module-scope closure (see §1.13), not via engine signatures

#### Stage definition (single stage surface, optional public)

Stage-level “public view” remains optional and is the only “public” concept in-scope:

- If stage defines `public`, it must define `compile`.
- If stage omits `public`, stage input is internal-as-public (step-id keyed map).

For knobs:
- Stage author input is always one object with `knobs` as a field; there is no separate knobs parameter at the recipe boundary.
- Internally, the stage exposes a computed strict `surfaceSchema` (single author-facing schema) and a deterministic `toInternal(...)`:

```ts
// NEW (planned): stage “public view” + knobs are not present in the repo baseline stage API today.
// Baseline today:
// - `Stage`/`StageModule` is `{ id, steps }`: `packages/mapgen-core/src/authoring/types.ts`
// - `createStage(...)` validates each `step.schema` exists: `packages/mapgen-core/src/authoring/stage.ts`
type StageToInternalResult = {
  knobs: unknown;
  rawSteps: Partial<Record<string, unknown>>; // stepId-keyed partial step configs (shape unknown at Phase A)
};

type StageRuntime = {
  id: string;
  // strict schema: knobs + (public fields OR step ids)
  // (TypeBox object schema with `additionalProperties: false`)
  surfaceSchema: import("typebox").TObject;
  toInternal: (args: { env: Env; stageConfig: unknown /* already normalized by surfaceSchema */ }) => StageToInternalResult;
};
```

- If stage defines a public view, `compile` is invoked with the **non-knob** portion (validated) plus knobs and env:

```ts
compile: (args: { env: Env; knobs: unknown; config: unknown }) => Partial<Record<string, unknown>>;
```

Stage authors do not need to define `compile` merely because knobs exist; knobs are extracted and threaded mechanically for normalization in the compiler pipeline.

Concrete `toInternal(...)` mechanics (code-like, deterministic; no “shape detection”):

```ts
function toInternal({ env, stageConfig }: { env: Env; stageConfig: any }): StageToInternalResult {
  const { knobs = {}, ...configPart } = stageConfig;
  if (stage.public) return { knobs, rawSteps: stage.compile({ env, knobs, config: configPart }) };
  return { knobs, rawSteps: configPart };
}
```

#### Recipe compiler (owns compilation)

Add a compiler module that produces a fully canonical internal execution shape:

- `packages/mapgen-core/src/compiler/recipe-compile.ts` **NEW (planned)** (note: `packages/mapgen-core/src/compiler/` does not exist today)
  - `compileRecipeConfig({ env, recipe, config }): CompiledRecipeConfigOf<...>` **NEW (planned)**
  - returns a total (per-step) canonical internal tree

Baseline today (repo-verified):
- recipe orchestration is in `packages/mapgen-core/src/authoring/recipe.ts` (`createRecipe(...)`)
  - author input typing is partial via `RecipeConfigInputOf<...>` in `packages/mapgen-core/src/authoring/types.ts`
  - total/compiled typing is represented by `CompiledRecipeConfigOf<...>` (currently an alias) in `packages/mapgen-core/src/authoring/types.ts`
- engine plan compilation is `compileExecutionPlan(runRequest, registry)` in `packages/mapgen-core/src/engine/execution-plan.ts`

#### Engine plan compilation (validates only)

Modify the existing planner:

- `packages/mapgen-core/src/engine/execution-plan.ts`
  - removes config defaulting/cleaning/mutation and removes `step.resolveConfig` calls
  - validates `env` and compiled step configs only

---

## Appendix A) TypeScript surface definitions (copy-paste ready)

This appendix makes every “pinned / canonical” statement above mechanically implementable in TypeScript without inventing names at implementation time.


Split into focused files:

- `a.1-env-module.md`
- `a.2-ops-surfaces.md`
- `a.3-steps-surfaces.md`
- `a.4-stages-surfaces.md`
- `a.5-recipes-typing.md`
### A.1 `Env` module (NEW (planned))

File: `packages/mapgen-core/src/core/env.ts` **NEW (planned)**

```ts
import { Type, type Static } from "typebox";

// Lifted verbatim from baseline `packages/mapgen-core/src/engine/execution-plan.ts`:
// - `RunSettingsSchema` → `EnvSchema`
// - `RunSettings` → `Env`

const UnknownRecord = Type.Record(Type.String(), Type.Unknown(), { default: {} });

export const TraceLevelSchema = Type.Union([
  Type.Literal("off"),
  Type.Literal("basic"),
  Type.Literal("verbose"),
]);

export const TraceConfigSchema = Type.Object(
  {
    enabled: Type.Optional(
      Type.Boolean({
        description: "Master tracing switch.",
      })
    ),
    steps: Type.Optional(
      Type.Record(Type.String(), TraceLevelSchema, {
        default: {},
        description: "Per-step trace verbosity (off/basic/verbose).",
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

export const EnvSchema = Type.Object(
  {
    seed: Type.Number(),
    dimensions: Type.Object(
      {
        width: Type.Number(),
        height: Type.Number(),
      },
      { additionalProperties: false }
    ),
    latitudeBounds: Type.Object(
      {
        topLatitude: Type.Number(),
        bottomLatitude: Type.Number(),
      },
      { additionalProperties: false }
    ),
    wrap: Type.Object(
      {
        wrapX: Type.Boolean(),
        wrapY: Type.Boolean(),
      },
      { additionalProperties: false }
    ),
    directionality: Type.Optional(UnknownRecord),
    metadata: Type.Optional(UnknownRecord),
    trace: Type.Optional(TraceConfigSchema),
  },
  { additionalProperties: false }
);

export type Env = Static<typeof EnvSchema>;
```

### A.2 Ops: contracts, shared envelopes, and compile vs runtime surfaces (pinned)

Files:
- `packages/mapgen-core/src/authoring/op/contract.ts` (baseline; unchanged)
- `packages/mapgen-core/src/authoring/op/envelope.ts` (baseline; shared envelope derivation)
- `packages/mapgen-core/src/authoring/op/create.ts` (baseline; uses shared envelope derivation)
- `packages/mapgen-core/src/authoring/op/ref.ts` (baseline; convenience ref, not required by step authors)
- `packages/mapgen-core/src/authoring/bindings.ts` **NEW (planned)** (canonical binding helpers; structural runtime surface)

```ts
import type { TSchema } from "typebox";

import type { OpContract } from "../op/contract.js";
import type { DomainOp } from "../op/types.js";

type OpContractAny = OpContract<any, any, any, any, any>;
type DomainOpAny = DomainOp<TSchema, TSchema, Record<string, { config: TSchema }>>;

// Compile-visible op surface (includes normalize/defaultConfig/strategies access via DomainOp shape).
export type DomainOpCompileAny = DomainOpAny & Readonly<{ id: string; kind: string }>;

// Runtime-visible op surface (structurally stripped; cannot normalize).
export type DomainOpRuntimeAny = Pick<
  DomainOpCompileAny,
  "id" | "kind" | "run" | "validate" | "runValidated"
>;

export function runtimeOp(op: DomainOpCompileAny): DomainOpRuntimeAny {
  return {
    id: op.id,
    kind: op.kind,
    run: op.run,
    validate: op.validate,
    runValidated: op.runValidated,
  };
}

export type StepOpsDecl = Readonly<Record<string, OpContractAny>>;

export function bindCompileOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: Readonly<Record<string, DomainOpCompileAny>>
): { [K in keyof Decl]: DomainOpCompileAny } {
  const out: any = {};
  for (const k of Object.keys(decl)) {
    const id = (decl as any)[k].id;
    const op = registryById[id];
    if (!op) throw new Error(`bindCompileOps: missing op id "${id}" for key "${k}"`);
    out[k] = op;
  }
  return out;
}

export function bindRuntimeOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: Readonly<Record<string, DomainOpCompileAny>>
): { [K in keyof Decl]: DomainOpRuntimeAny } {
  const out: any = {};
  for (const k of Object.keys(decl)) {
    const id = (decl as any)[k].id;
    const op = registryById[id];
    if (!op) throw new Error(`bindRuntimeOps: missing op id "${id}" for key "${k}"`);
    out[k] = runtimeOp(op);
  }
  return out;
}
```

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
