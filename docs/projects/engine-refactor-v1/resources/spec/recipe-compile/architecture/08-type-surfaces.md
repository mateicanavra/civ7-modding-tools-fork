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

