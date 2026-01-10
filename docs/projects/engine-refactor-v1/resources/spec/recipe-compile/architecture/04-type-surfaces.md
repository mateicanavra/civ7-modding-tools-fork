# Type Surfaces

This document contains all canonical TypeScript definitions. Section 1.8
provides the overview; Appendix A provides copy-paste ready implementations.

### 1.8 Canonical type surfaces (repo reality + module layout)

This section documents the current code reality and serves as the canonical
surface reference for authoring, compilation, and runtime binding.

#### `Env` (runtime envelope)

Runtime envelope is core-owned via `EnvSchema`/`Env` so authoring/compiler/engine can share it without
importing engine internals.

Current location:
- `packages/mapgen-core/src/core/env.ts`
  - `export const EnvSchema = Type.Object(...)`
  - `export type Env = Static<typeof EnvSchema>`

Runtime envelope is now threaded as `env: Env`:
- engine plan compilation: `compileExecutionPlan(runRequest, registry)` in `packages/mapgen-core/src/engine/execution-plan.ts`
- context storage: `ExtendedMapContext.env: Env` in `packages/mapgen-core/src/core/types.ts`

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
// - `normalize(cfg, ctx)` is the compile-time normalization hook (renamed from `resolveConfig`).
type DomainOpAny = DomainOp<TSchema, TSchema, Record<string, { config: TSchema }>, string>;
```

TypeScript (pinned surfaces):
- Runtime steps must never see compile-time normalization hooks on ops. The runtime-facing op surface is explicitly narrowed (no `normalize`), even if the underlying op implementation type still contains it.
- See §1.14 and Appendix A.2 for the canonical binding helpers (`bindCompileOps` / `bindRuntimeOps`) and the structural runtime-surface stripping rule (`runtimeOp(...)`).

#### Step contracts + step modules (ops injected, implementations bound by id)

Step contracts:
- Baseline today (repo-verified):
  - `StepContract` / `defineStepContract(...)`: `packages/mapgen-core/src/authoring/step/contract.ts`
  - `createStep(...)` enforces an explicit `contract.schema`: `packages/mapgen-core/src/authoring/step/create.ts`
  - step module hook is `normalize(config, ctx)` (compile-time only): `packages/mapgen-core/src/authoring/types.ts`
  - step module types (`Step`, `StepModule`) are defined in `packages/mapgen-core/src/authoring/types.ts`

Explicit decision (from this proposal’s v1 scope):
- There is no `inputSchema` / “optionalized mirror schema” for steps. A step has one canonical schema (`contract.schema`) representing plan-truth shape.
  - Author-input defaults and envelope defaults are handled by schema defaults and step normalization.
  - When op normalization is required, step modules use compile-surface bindings (`bindCompileOps`) inside `step.normalize`.

Step module binding (conceptual):
- step modules declare local op contracts (module-scope `opContracts`) and bind them to implementations
- step module binds contract ids → actual op implementations from the domain registry (see §1.14)
- runtime step implementation uses bound runtime ops via module-scope closure (see §1.13), not via engine signatures

#### Stage definition (single stage surface, optional public)

Stage-level “public view” remains optional and is the only “public” concept in-scope:

- If stage defines `public`, it must define `compile`.
- If stage omits `public`, stage input is internal-as-public (step-id keyed map).
- `createStage(...)` lives in `packages/mapgen-core/src/authoring/stage.ts` and enforces explicit step schemas.

For knobs:
- Stage author input is always one object with `knobs` as a field; there is no separate knobs parameter at the recipe boundary.
- Internally, the stage exposes a computed strict `surfaceSchema` (single author-facing schema) and a deterministic `toInternal(...)`:

```ts
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

- `packages/mapgen-core/src/compiler/recipe-compile.ts`
  - `compileRecipeConfig({ env, recipe, config, compileOpsById }): CompiledRecipeConfigOf<...>`
  - returns a total (per-step) canonical internal tree

Baseline today (repo-verified):
- recipe orchestration is in `packages/mapgen-core/src/authoring/recipe.ts` (`createRecipe(...)`)
  - author input typing is partial via `RecipeConfigInputOf<...>` in `packages/mapgen-core/src/authoring/types.ts`
  - total/compiled typing is represented by `CompiledRecipeConfigOf<...>` (currently an alias) in `packages/mapgen-core/src/authoring/types.ts`
- engine plan compilation is `compileExecutionPlan(runRequest, registry)` in `packages/mapgen-core/src/engine/execution-plan.ts`

#### Engine plan compilation (identity validation only)

Planner behavior (repo-verified):

- `packages/mapgen-core/src/engine/execution-plan.ts`
  - does not default/clean/mutate configs
  - validates step identity only (duplicate step ids, unknown step ids)

---

## Appendix A) TypeScript surface definitions (copy-paste ready)

This appendix makes every “pinned / canonical” statement above mechanically implementable in TypeScript without inventing names at implementation time.


The definitions in Appendix A are also provided as standalone `.ts` files under `ts/` (same folder as this doc):

- `ts/env.ts`
- `ts/ops.ts`
- `ts/steps.ts`
- `ts/stages.ts`
- `ts/recipes.ts`
- `ts/compiler.ts`
### A.1 `Env` module

File: `packages/mapgen-core/src/core/env.ts`

```ts
import { Type, type Static } from "typebox";

// Lifted verbatim from the baseline `RunSettingsSchema` / `RunSettings` shape
// (formerly in `packages/mapgen-core/src/engine/execution-plan.ts`).

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
- `packages/mapgen-core/src/authoring/bindings.ts` (canonical binding helpers; structural runtime surface)

```ts
import type { TSchema } from "typebox";

import type { DomainOp } from "../op/types.js";
import type { OpContract } from "../op/contract.js";

export type OpId = string;
export type OpsById<Op extends { id: OpId }> = Readonly<{
  [K in Op["id"]]: Extract<Op, { id: K }>;
}>;

type OpContractAny = OpContract<any, any, any, any, any>;

// Compile-visible op surface (includes normalize/defaultConfig/strategies access via DomainOp shape).
export type DomainOpCompileAny = DomainOp<
  TSchema,
  TSchema,
  Record<string, { config: TSchema }>,
  string
>;

// Runtime-visible op surface (structurally stripped; cannot normalize).
export type DomainOpRuntime<Op extends DomainOpCompileAny> = Op extends DomainOpCompileAny
  ? Readonly<{
      id: Op["id"];
      kind: Op["kind"];
      run: Op["run"];
    }>
  : never;

export type DomainOpRuntimeAny = DomainOpRuntime<DomainOpCompileAny>;

export class OpBindingError extends Error {
  readonly opKey: string;
  readonly opId: string;

  constructor(opKey: string, opId: string) {
    super(`Missing op implementation for key "${opKey}" (id: "${opId}")`);
    this.name = "OpBindingError";
    this.opKey = opKey;
    this.opId = opId;
  }
}

type BoundOps<
  Decl extends Record<string, { id: string }>,
  Registry extends Record<string, unknown>,
> = {
  [K in keyof Decl]: Registry[Decl[K]["id"] & keyof Registry];
};

function bindOps<
  Decl extends Record<string, { id: string }>,
  Registry extends Record<string, unknown>,
>(decl: Decl, registryById: Registry): BoundOps<Decl, Registry> {
  const out = {} as BoundOps<Decl, Registry>;
  for (const key of Object.keys(decl) as Array<keyof Decl>) {
    const opId = decl[key].id;
    const op = registryById[opId as keyof Registry];
    if (!op) throw new OpBindingError(String(key), opId);
    out[key] = op as BoundOps<Decl, Registry>[typeof key];
  }
  return out;
}

export function bindCompileOps<
  const Decl extends Record<string, { id: string }>,
  const Registry extends Readonly<Record<string, DomainOpCompileAny>>,
>(decl: Decl, registryById: Registry): BoundOps<Decl, Registry> {
  return bindOps(decl, registryById);
}

export function bindRuntimeOps<
  const Decl extends Record<string, { id: string }>,
  const Registry extends Readonly<Record<string, DomainOpRuntimeAny>>,
>(decl: Decl, registryById: Registry): BoundOps<Decl, Registry> {
  return bindOps(decl, registryById);
}

export function runtimeOp<Op extends DomainOpCompileAny>(op: Op): DomainOpRuntime<Op> {
  return {
    id: op.id,
    kind: op.kind,
    run: op.run,
  } as DomainOpRuntime<Op>;
}
```

### A.3 Steps: contracts, module surfaces, and normalize hook (pinned)

Files:
- `packages/mapgen-core/src/authoring/step/contract.ts`
- `packages/mapgen-core/src/authoring/step/create.ts`
- `packages/mapgen-core/src/authoring/types.ts`

```ts
import type { Static, TSchema } from "typebox";

import { applySchemaConventions } from "../schema.js";
import type { DependencyTag, GenerationPhase, NormalizeContext } from "@mapgen/engine/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";

export type StepContract<Schema extends TSchema, Id extends string> = Readonly<{
  id: Id;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  schema: Schema;
}>;

const STEP_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function defineStepContract<const Schema extends TSchema, const Id extends string>(
  def: StepContract<Schema, Id>
): typeof def {
  if (!STEP_ID_RE.test(def.id)) {
    throw new Error(`step id "${def.id}" must be kebab-case (e.g. "plot-vegetation")`);
  }
  applySchemaConventions(def.schema, `step:${def.id}.schema`);
  return def;
}

export type Step<TContext = ExtendedMapContext, TConfig = unknown> = {
  readonly contract: StepContract<TSchema, string>;
  normalize?: (config: TConfig, ctx: NormalizeContext) => TConfig;
  run: (context: TContext, config: TConfig) => void | Promise<void>;
};

export type StepModule<TContext = ExtendedMapContext, TConfig = unknown> = Step<TContext, TConfig>;

type StepConfigOf<C extends StepContract<any, any>> = Static<C["schema"]>;

type StepImpl<TContext, TConfig> = Readonly<{
  normalize?: (config: TConfig, ctx: NormalizeContext) => TConfig;
  run: (context: TContext, config: TConfig) => void | Promise<void>;
}>;

export function createStep<const C extends StepContract<any, any>, TContext = unknown>(
  contract: C,
  impl: StepImpl<TContext, StepConfigOf<C>>
): StepModule<TContext, StepConfigOf<C>> {
  if (!contract?.schema) {
    const label = contract?.id ? `step "${contract.id}"` : "step";
    throw new Error(`createStep requires an explicit schema for ${label}`);
  }
  return { contract, ...impl };
}

export type CreateStepFor<TContext> = <const C extends StepContract<any, any>>(
  contract: C,
  impl: StepImpl<TContext, StepConfigOf<C>>
) => StepModule<TContext, StepConfigOf<C>>;

export function createStepFor<TContext>(): CreateStepFor<TContext> {
  return (contract, impl) => createStep(contract, impl);
}
```

### A.4 Stages: single surface schema, reserved key enforcement, and knobs threading (pinned)

Files:
- `packages/mapgen-core/src/authoring/stage.ts` (baseline; extended)
- `packages/mapgen-core/src/authoring/types.ts` (baseline; stage/recipe typing extended)

```ts
import { Type, type Static, type TObject, type TSchema } from "typebox";

import type { Env } from "./env";
import type { Step } from "./steps";

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

type StepsArray<TContext> = readonly Step<TContext, any>[];

type StepIdOf<TSteps extends StepsArray<any>> = TSteps[number]["contract"]["id"] & string;
type NonReservedStepIdOf<TSteps extends StepsArray<any>> = Exclude<StepIdOf<TSteps>, ReservedStageKey>;

type StepConfigInputById<
  TSteps extends StepsArray<any>,
  Id extends NonReservedStepIdOf<TSteps>,
> = Extract<TSteps[number], { contract: { id: Id } }> extends Step<any, infer TConfig>
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
  env: Env;
  knobs: Knobs;
  config: Static<PublicSchema>;
}) => Partial<Record<StepId, unknown>>;

// Stage authoring surface (Option A):
// - stage may define `public` + `compile` (public → internal)
// - otherwise stage is internal-as-public
// - `createStage` computes `surfaceSchema` and provides a standard `toInternal` wrapper
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
    // Computed strict author-facing schema: knobs + (public fields OR step ids).
    surfaceSchema: TObject;
    // Deterministic “public → internal” mapping: extracts knobs and produces raw step map.
    toInternal: (args: { env: Env; stageConfig: unknown }) => StageToInternalResult<
    NonReservedStepIdOf<TSteps>,
    Knobs
    >;
  }>;

export type StageContractAny = StageContract<string, any, any, any, any, any>;

// Factory surface (pinned):
// - stage may optionally define `public` + `compile` (public → internal)
// - `createStage` computes `surfaceSchema` (single author-facing surface) and provides a standard `toInternal`
// - reserved key enforcement is a hard throw
// - stage schemas are strict object schemas (surfaceSchema always a TObject)
// - step ids are kebab-case (pinned convention)
export function createStage<const TDef extends StageDef<string, any, any, any, any, any>>(
  def: TDef
): StageContractAny {
  const stepIds = def.steps.map((s) => s.contract.id);
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
    : buildInternalAsPublicSurfaceSchema(stepIds, def.knobsSchema);

  const toInternal = ({ env, stageConfig }: { env: Env; stageConfig: any }) => {
    const { knobs = {}, ...configPart } = stageConfig as any;
    if (def.public) {
      const rawSteps = (def as any).compile({ env, knobs, config: configPart }) ?? {};
      if (Object.prototype.hasOwnProperty.call(rawSteps, RESERVED_STAGE_KEY)) {
        throw new Error(`stage("${def.id}") compile returned reserved key "${RESERVED_STAGE_KEY}"`);
      }
      return { knobs, rawSteps };
    }
    return { knobs, rawSteps: configPart };
  };

  return { ...(def as any), surfaceSchema, toInternal } as StageContractAny;
}

export type StageConfigInputOf<TStage extends StageContractAny> =
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
- `packages/mapgen-core/src/compiler/recipe-compile.ts` (compiler entrypoint signature)

```ts
import type { Static } from "typebox";

import type { Env } from "../core/env.js";
import type { StageConfigInputOf, StageContractAny } from "../authoring/stage.js";
import type { StepConfigOf } from "../authoring/step/contract.js";

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

// Compiler-owned entrypoint.
//
// Pinned behavior:
// - always-on pipeline (even when stage public === internal)
// - no runtime defaulting/cleaning: this produces canonical configs pre-runtime
// - ordering matches §1.9 Phase A/B
export type CompileErrorCode =
  | "config.invalid"
  | "stage.compile.failed"
  | "stage.unknown-step-id"
  | "op.config.invalid"
  | "op.missing"
  | "step.normalize.failed"
  | "op.normalize.failed"
  | "normalize.not.shape-preserving";

export type CompileErrorItem = Readonly<{
  code: CompileErrorCode;
  path: string;
  message: string;
  stageId?: string;
  stepId?: string;
  opKey?: string;
  opId?: string;
}>;

export class RecipeCompileError extends Error {
  readonly errors: CompileErrorItem[];

  constructor(errors: CompileErrorItem[]) {
    const message = errors.map((err) => `${err.path}: ${err.message}`).join("; ");
    super(`Recipe compile failed: ${message}`);
    this.name = "RecipeCompileError";
    this.errors = errors;
  }
}

export function compileRecipeConfig<const TStages extends readonly AnyStage[]>(args: {
  env: Env;
  recipe: Readonly<{ stages: TStages }>;
  config: RecipeConfigInputOf<TStages> | null | undefined;
  compileOpsById: Readonly<Record<string, DomainOpCompileAny>>;
}): CompiledRecipeConfigOf<TStages>;

export function compileRecipeConfig(args: any): any {
  const errors: CompileErrorItem[] = [];
  const out: Record<string, Record<string, unknown>> = {};

  const env = args.env as Env;
  const recipe = args.recipe as Readonly<{ stages: readonly AnyStage[] }>;
  const config = (args.config ?? {}) as Record<string, unknown>;
  const compileOpsById = args.compileOpsById as Readonly<Record<string, DomainOpCompileAny>>;

  for (const stage of recipe.stages) {
    const stageId = stage.id;
    const stagePath = `/config/${stageId}`;

    const { value: stageConfig, errors: stageErrors } = normalizeStrict(
      stage.surfaceSchema as any,
      config[stageId],
      stagePath
    );
    if (stageErrors.length > 0) {
      errors.push(...stageErrors.map((e) => ({ ...e, stageId })));
      continue;
    }

    let internal: StageToInternalResult<string, unknown>;
    try {
      internal = stage.toInternal({ env, stageConfig }) as any;
    } catch (err) {
      errors.push({
        code: "stage.compile.failed",
        path: stagePath,
        message: err instanceof Error ? err.message : "stage.compile/toInternal failed",
        stageId,
      });
      continue;
    }

    const stageOut: Record<string, unknown> = {};
    const { knobs, rawSteps } = internal;

    const declaredStepIds = new Set(
      (stage.steps as readonly any[]).map((s) => s.contract.id).filter((id) => id !== "knobs")
    );
    const unknownStepIds = Object.keys((rawSteps ?? {}) as any).filter(
      (id) => id !== "knobs" && !declaredStepIds.has(id)
    );
    if (unknownStepIds.length > 0) {
      for (const id of unknownStepIds) {
        errors.push({
          code: "stage.unknown-step-id",
          path: `${stagePath}/${id}`,
          message: `Unknown step id "${id}" returned by stage.compile/toInternal (must be declared in stage.steps)`,
          stageId,
          stepId: id,
        });
      }
      continue;
    }

    for (const step of stage.steps) {
      const stepId = step.contract.id;
      const stepPath = `${stagePath}/${stepId}`;

      // B1: prefill op defaults
      const { value: prefilled, errors: prefillErrors } = prefillOpDefaults(
        step as any,
        (rawSteps as any)[stepId],
        stepPath
      );
      if (prefillErrors.length > 0) {
        errors.push(...prefillErrors.map((e) => ({ ...e, stageId, stepId })));
        continue;
      }

      // B2: strict schema normalization (default + clean + unknown-key errors)
      const { value: strict1, errors: strict1Errors } = normalizeStrict(
        step.contract.schema as any,
        prefilled,
        stepPath
      );
      if (strict1Errors.length > 0) {
        errors.push(...strict1Errors.map((e) => ({ ...e, stageId, stepId })));
        continue;
      }

      let normalized: unknown = strict1;

      // B3: step.normalize (value-only; shape-preserving)
      if (typeof (step as any).normalize === "function") {
        let next: unknown;
        try {
          next = (step as any).normalize(normalized, { env, knobs });
        } catch (err) {
          errors.push({
            code: "step.normalize.failed",
            path: stepPath,
            message: err instanceof Error ? err.message : "step.normalize failed",
            stageId,
            stepId,
          });
          continue;
        }

        const { value: strict2, errors: strict2Errors } = normalizeStrict(
          step.contract.schema as any,
          next,
          stepPath
        );
        if (strict2Errors.length > 0) {
          errors.push(...strict2Errors.map((e) => ({ ...e, stageId, stepId })));
          errors.push({
            code: "normalize.not.shape-preserving",
            path: stepPath,
            message: "step.normalize returned a value that does not validate against the step schema",
            stageId,
            stepId,
          });
          continue;
        }
        normalized = strict2;
      }

      // B4: mechanical op normalization (top-level only)
      const { value: opNormalized, errors: opNormErrors } = normalizeOpsTopLevel(
        step as any,
        normalized as any,
        { env, knobs },
        compileOpsById,
        stepPath
      );
      if (opNormErrors.length > 0) {
        errors.push(...opNormErrors.map((e) => ({ ...e, stageId, stepId })));
        continue;
      }

      // B5: strict schema normalization again
      const { value: strict3, errors: strict3Errors } = normalizeStrict(
        step.contract.schema as any,
        opNormalized,
        stepPath
      );
      if (strict3Errors.length > 0) {
        errors.push(...strict3Errors.map((e) => ({ ...e, stageId, stepId })));
        continue;
      }

      stageOut[stepId] = strict3;
    }

    out[stageId] = stageOut;
  }

  if (errors.length > 0) throw new RecipeCompileError(errors);
  return out as CompiledRecipeConfigOf<any>;
}
```
