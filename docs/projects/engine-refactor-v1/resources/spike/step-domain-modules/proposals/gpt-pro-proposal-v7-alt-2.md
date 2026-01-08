Some of the repo bundles you uploaded earlier have expired on my side, so I cannot annotate this plan with exact current file paths and callsites. The architecture and migration plan below is complete and internally consistent. If you re-upload the current repomix bundle(s), I can produce a second document that maps every phase to exact modules and mechanical refactors in your tree.

---

# Canonical Steps/Stages/Recipes Architecture

## Internal-first contracts, stage-derived knobs, recipe-owned public map contract, modder-safe declarative config

## 0. Purpose and scope

This architecture defines the full “public map authoring” surface and the internal compilation/execution pipeline for Civ-style map generation, with these explicit goals:

* Modders author maps through `createMap({ id, meta…, recipe, config })` only.
* Modder config is declarative, hierarchical, and does not require knowledge of ops, envelopes, “pipeline,” or internal identifiers.
* Internal contracts remain contract-first and compositional (domains → ops → steps → stages → recipe).
* Public config is a view over internal config and is owned by stages/recipe, not steps.
* Compile-time normalization is centralized and mechanical (defaults + transforms + op-level resolveConfig), not distributed boilerplate.

This document is the source of truth for steps/stages/recipes moving forward.

---

## 1. Locked decisions

These are invariants. Treat violations as architectural regressions.

1. Modders never see ops, envelopes, “pipeline,” or internal ids (including `:`-style ids).
2. Steps define internal behavior and correctness. Steps do not own public schema.
3. Stages and recipe own public schema and public→internal transforms (views).
4. Internal is the default. Only public surfaces are explicitly labeled “public.”
5. Knobs are collapsed:

   * recipe root may have `knobs` (recipe/global knobs)
   * stage/domain knobs are inlined in the stage object
   * no `global/domains/recipe` nesting
6. Schema strictness is the default in helpers. No repeated `additionalProperties: false`, no repeated `{ default: {} }`.
7. Step wiring must be minimal:

   * `step.op(op, …)` and `step.ops({ … }, …)` only
   * no `uses`, no `io`, no `addr`, no extra wrappers
8. Stage knob schema is auto-derived from domains referenced by ops used in that stage (implemented now).
9. Auto generation of public views is deferred. Until then:

   * modder-facing stages must define public views for steps, or
   * explicitly set `advanced: true` (internal-only recipes/configs).

---

## 2. Conceptual model

### 2.1 Entities

**Domain**

* Owns a domain knobs schema (single source of truth).
* Owns op contracts + op implementations.
* Exports ops annotated with `domainId` and `domainKnobsSchema` so stages/recipes can derive knob exposure automatically.

**Op**

* Contract-first.
* Owns strategy config schemas and internal strategy selection (envelope).
* May normalize config at compile-time via `op.resolveConfig(config, settingsSlice)`.

**Step**

* Internal execution unit.
* Declares:

  * `requires` and `provides` resources
  * internal config schema + default config (derived from op contracts)
  * runtime implementation `run(ctx, config)`
* Does not declare a public schema.

**Stage**

* Composition unit and the primary public UX boundary.
* Declares:

  * steps grouped under a stage namespace
  * optional stage resources catalog
  * optional per-step public view schema + transformer (public→internal)
  * optional `advanced` flag (exposes internal configs publicly; not for modders)

**Recipe**

* Top-level composition.
* Owns:

  * the full **Public Map Config contract** (TypeBox schema)
  * compilation pipeline:

    * normalize public config
    * apply public→internal transforms
    * normalize internal configs
    * apply `op.resolveConfig` mechanically using derived stage knobs
    * build dependency graph
  * execution pipeline.

### 2.2 Two planes of configuration

**PublicMapConfig (modder-facing)**

* A nested object:

  * `knobs` at root (recipe/global knobs; collapsed)
  * each stage object at root (e.g. `ecology`, `morphology`)

    * stage knobs fields (derived automatically from domains used in that stage)
    * step public config fields (schemas owned by stage views)
* No `pipeline`.
* No internal ids.
* No envelopes unless `advanced: true`.

**Internal config (pipeline-facing)**

* Step config is always in an internal canonical shape derived from ops.
* Typically includes op envelopes and defaults (but never shown to modders).

### 2.3 Runtime parameters are separate

Runtime parameters (seed, map size, players/civs) are not part of public or internal schemas; they live only in runtime context and are provided by the game at execution time.

---

## 3. Public authoring surface: `createMap`

### 3.1 `createMap` contract

`createMap` binds a recipe’s public schema to the `config` field.

```ts
import type { Static, TObject } from "typebox";

export type RecipeModule = Readonly<{
  id: string;
  publicSchema: TObject;
  compile: (publicConfig: unknown) => unknown;
  run: (runtime: RuntimeParams, publicConfig: unknown, resources: ResourceStore) => Promise<void>;
}>;

export function createMap<const R extends RecipeModule>(def: {
  id: string;
  title?: string;
  description?: string;
  recipe: R;
  config: Static<R["publicSchema"]>;
}) {
  return def;
}
```

Modders only touch `createMap` and a plain object config.

---

## 4. Schema strictness and defaults: `S`

Stop writing strictness and object defaults manually. Use one helper.

```ts
import { Type, type TObject, type TSchema } from "typebox";

export const S = {
  obj<const P extends Record<string, TSchema>>(
    props: P,
    opts?: Omit<Parameters<typeof Type.Object>[1], "additionalProperties" | "default">
  ): TObject {
    return Type.Object(props, { additionalProperties: false, default: {}, ...(opts ?? {}) });
  },

  str: Type.String,
  num: Type.Number,
  int: Type.Integer,
  lit: Type.Literal,
  union: Type.Union,

  opt<T extends TSchema>(schema: T, def?: any) {
    return Type.Optional(schema, def === undefined ? {} : { default: def });
  },
};
```

Normalization uses TypeBox Value Convert/Clean/Default (single canonical utility).

---

## 5. Resources and dependency scheduling

### 5.1 Resources (one store; “artifact” is a semantic, not a separate system)

A resource is a typed key into a runtime store.

```ts
export type ResourceRef<Id extends string, T> = Readonly<{ id: Id; __type?: T }>;
export type ResourceValue<R> = R extends ResourceRef<any, infer T> ? T : never;

export function resource<const Id extends string, T>(id: Id): ResourceRef<Id, T> {
  return { id } as any;
}

export function resources<const R extends Record<string, ResourceRef<string, any>>>(r: R): R {
  return r;
}

export interface ResourceStore {
  get<R extends ResourceRef<string, any>>(ref: R): ResourceValue<R>;
  set<R extends ResourceRef<string, any>>(ref: R, value: ResourceValue<R>): void;
  has(ref: ResourceRef<string, any>): boolean;
}
```

### 5.2 Step declares dependencies locally

Every step module declares:

* `requires: ResourceRef[]`
* `provides: ResourceRef[]`

### 5.3 Recipe mechanically composes dependencies into a graph

Compilation must:

* build `producerByResourceId` from `provides`

  * error on multiple producers unless explicitly allowed (default: forbid)
* for each step `requires`:

  * create edge from producer to consumer if producer exists
  * otherwise mark required resource as an external input (must exist in ResourceStore before run)
* topologically sort steps

  * error on cycles
* optionally validate at runtime before each step that required resources exist

This removes “tag registries” as a separate concept. The resource catalog becomes the typed router.

---

## 6. Domains and auto-derived stage knobs (#1 cleanup)

### 6.1 Domain wrapper attaches knob ownership to ops

Stage knob exposure is derived by scanning which domains appear in ops used by steps.

```ts
import type { TObject } from "typebox";
import type { DomainOp } from "../op/create";

export type DomainOpWithKnobs<C extends DomainOp<any>> = C & Readonly<{
  domainId: string;
  domainKnobsSchema: TObject;
}>;

export function domain<const Id extends string, const Knobs extends TObject, const Ops extends Record<string, DomainOp<any>>>(
  def: { id: Id; knobs: Knobs; ops: Ops }
) {
  const ops = Object.fromEntries(
    Object.entries(def.ops).map(([k, op]) => [
      k,
      Object.assign(op, { domainId: def.id, domainKnobsSchema: def.knobs }),
    ])
  ) as { [K in keyof Ops]: DomainOpWithKnobs<Ops[K]> };

  return { id: def.id, knobs: def.knobs, ops } as const;
}
```

**Invariant:** `op.contract.settings` must be a subset projection of `domain.knobs` (enforced by review/guardrail). Compilation uses `domainKnobsSchema` to expose fields, and `op.contract.settings` to slice/normalize inputs for `op.resolveConfig`.

### 6.2 Stage knob schema derivation (recipe builder responsibility)

Derivation algorithm:

* for each step in stage:

  * inspect bound ops (stored on step module)
  * collect `{ domainId -> domainKnobsSchema }` unique
* merge properties into one strict object schema
* include those properties in the stage public schema
* normalize stage knobs by applying that derived schema to the stage object

Collision rules:

* if two domains define the same knob key, it is a hard error unless you explicitly namespace at the domain level.
* if a stage knob key collides with a step name, it is a hard error.

---

## 7. Steps (clean DX, internal-only)

### 7.1 Runtime params

```ts
export type RuntimeParams = Readonly<{
  seed: number;
  mapSize: { width: number; height: number };
  players: readonly { playerId: number; civId: string }[];
}>;
```

### 7.2 Op envelope schema derived from op contract

Steps use op contract-derived envelopes internally; modders never see these unless `advanced`.

```ts
import { Type, type TSchema } from "typebox";
import type { OpContract } from "../op/contract";
import { Value } from "typebox/value";

function normalizeSchema<T extends TSchema>(schema: T, input: unknown) {
  return Value.Default(schema, Value.Clean(schema, Value.Convert(schema, input))) as any;
}

function envelopeSchema<C extends OpContract<any, any, any, any, any, any>>(c: C): TSchema {
  const variants = Object.entries(c.strategies).map(([id, cfg]) =>
    Type.Object({ strategy: Type.Literal(id), config: cfg as any }, { additionalProperties: false })
  );
  return Type.Union(variants);
}

function defaultEnvelope<C extends OpContract<any, any, any, any, any, any>>(c: C) {
  return { strategy: "default", config: normalizeSchema(c.strategies.default, undefined) } as const;
}
```

### 7.3 Step modules: `step.op` and `step.ops`

A step is either:

* a single-op step (most common)
* a multi-op step

Each step module stores bound ops in a private field used by the compiler to apply `op.resolveConfig` automatically.

```ts
import type { DomainOp } from "../op/create";
import type { ResourceRef, ResourceStore } from "../resources";
import type { RuntimeParams } from "../runtime";

export type StepCtx = Readonly<{ runtime: RuntimeParams; resources: ResourceStore }>;

export type StepModule<Config> = Readonly<{
  requires: readonly ResourceRef<string, any>[];
  provides: readonly ResourceRef<string, any>[];
  schema: TSchema;
  defaultConfig: Config;
  run: (ctx: StepCtx, config: Config) => void | Promise<void>;
  _ops?: { $?: DomainOpWithKnobs<any> } | Record<string, DomainOpWithKnobs<any>>;
}>;

export const step = {
  op<C extends DomainOpWithKnobs<any>>(op: C, def: {
    requires?: readonly ResourceRef<string, any>[];
    provides?: readonly ResourceRef<string, any>[];
    run: (ctx: StepCtx, config: any) => any;
  }): StepModule<any> {
    const schema = envelopeSchema(op.contract);
    const defaultConfig = defaultEnvelope(op.contract);

    return {
      requires: def.requires ?? [],
      provides: def.provides ?? [],
      schema,
      defaultConfig,
      run: def.run as any,
      _ops: { $: op },
    };
  },

  ops<const Ops extends Record<string, DomainOpWithKnobs<any>>>(ops: Ops, def: {
    requires?: readonly ResourceRef<string, any>[];
    provides?: readonly ResourceRef<string, any>[];
    run: (ctx: StepCtx, config: any) => any;
  }): StepModule<any> {
    const shape: Record<string, TSchema> = {};
    for (const [k, op] of Object.entries(ops)) {
      shape[k] = Type.Optional(envelopeSchema(op.contract) as any, { default: defaultEnvelope(op.contract) });
    }

    const schema = S.obj(shape);
    const defaultConfig = normalizeSchema(schema as any, {});

    return {
      requires: def.requires ?? [],
      provides: def.provides ?? [],
      schema,
      defaultConfig,
      run: def.run as any,
      _ops: ops,
    };
  },
};
```

No `uses`, no `io`, no `addr`. Dependencies are direct arrays. Identity comes from stage+step keys when composing the workflow.

---

## 8. Public config lives on stages (views) and recipe (composition)

### 8.1 View primitive

A view defines:

* a public schema
* a `toInternal` transform

```ts
import type { Static, TObject } from "typebox";

export type View<PublicSchema extends TObject, Internal> = Readonly<{
  publicSchema: PublicSchema;
  toInternal: (publicValue: Static<PublicSchema>) => Internal;
}>;

export function view<const PublicSchema extends TObject, Internal>(
  publicSchema: PublicSchema,
  toInternal: (v: Static<PublicSchema>) => Internal
): View<PublicSchema, Internal> {
  return { publicSchema, toInternal } as const;
}
```

### 8.2 Stage module

Stages contain:

* optional resources catalog
* steps (internal)
* optional public views per step
* optional `advanced` flag

```ts
export type StageModule = Readonly<{
  resources?: Record<string, ResourceRef<string, any>>;
  steps: Record<string, StepModule<any>>;
  public?: Record<string, View<any, any>>;
  advanced?: boolean;
}>;

export function stage(def: StageModule): StageModule {
  return def;
}
```

### 8.3 Policy: preventing accidental internal leakage

Recipe build must enforce:

* If `advanced !== true`, every step must have a public view.
* If a step lacks a public view:

  * either throw (default)
  * or require explicit stage `advanced: true`.

This guarantees modder safety without relying on conventions.

---

## 9. Recipe: public contract, compilation pipeline, execution

### 9.1 Public schema shape

Public config is:

* optional root `knobs` (recipe/global knobs)
* each stage at root:

  * derived knob fields from domains used by that stage (auto)
  * step public configs keyed by step name (from views)

No `pipeline`. No step ids.

### 9.2 Recipe builder responsibilities

The recipe builder must:

1. Build `publicSchema`.
2. Normalize public config.
3. For each stage:

   * derive stage knob schema by scanning stage steps’ ops
   * normalize knob values from the stage object
   * for each step:

     * normalize step public config against view schema
     * transform public → internal using view
     * normalize against step internal schema
     * apply `op.resolveConfig` mechanically using stage knob values
4. Build dependency graph and schedule nodes.
5. Run nodes with runtime params + resource store.

### 9.3 Compilation algorithm details (mechanical and centralized)

Let:

* `stageObj` be the normalized stage object from public config
* `stageKnobsSchema` be derived from the stage’s referenced domains’ knobs
* `stageKnobs = normalize(stageKnobsSchema, stageObj)` (this extracts only knob keys; step keys are ignored)
* `stepPublic = normalize(view.publicSchema, stageObj[stepName])` (and defaults are applied here)
* `stepInternalCandidate = view.toInternal(stepPublic)` (or stepInternal if advanced)
* `stepInternal = normalize(step.schema, stepInternalCandidate ?? step.defaultConfig)`
* Apply op normalization:

  * single-op step: `stepInternal = op.resolveConfig(stepInternal, normalize(op.contract.settings, stageKnobs))`
  * multi-op step: for each op key `k`, `stepInternal[k] = op.resolveConfig(stepInternal[k], normalize(op.contract.settings, stageKnobs))`

This is the only place where op settings are threaded. Steps don’t do it. Stages don’t do it. It is centralized.

### 9.4 Execution plan identity

Internal plan node ids are derived from composition keys:

* `nodeId = "${stageKey}.${stepKey}"`

Renames are breaking. If you need stable ids across renames later, add optional override at the recipe composition point (not in the step module), e.g. `{ steps: { biomes: { step: biomesStep, id: "ecology.biomes" } } }`. Keep this out of step DX unless you actually need it.

---

## 10. Detailed implementation plan (full migration, no long-lived shims)

This plan assumes you will fully migrate to the new architecture and stop authoring new code in the legacy style immediately.

### Phase 0 — Freeze legacy authoring surface (guardrail first)

**Goal:** prevent new legacy patterns from being added while refactor proceeds.

* Add a lint/grep guardrail to fail CI if new code introduces:

  * `"pipeline"` in map config types
  * step ids with `:` in any public-facing schema/module
  * direct references to `{ strategy, config }` envelopes in exported map configs
* Add a “do not export internal step schemas publicly” rule:

  * exported public config must be built only by recipe builder.

Work type: mechanical.

---

### Phase 1 — Introduce shared primitives in the authoring SDK

**Deliverables:**

* `S` strict schema builder
* normalization helper `normalizeSchema`
* resources primitives + `ResourceStore`
* `RuntimeParams` type
* view primitive `view(...)`

Work type: mechanical.

---

### Phase 2 — Wrap domains with knob ownership metadata (cleanup #1)

**Deliverables:**

* `domain({ id, knobs, ops })` wrapper that annotates each op with:

  * `domainId`
  * `domainKnobsSchema`
* Convert each domain module export to use the wrapper.

Work type:

* mostly mechanical (wiring exports)
* non-mechanical only if domain currently does not have a well-defined knobs schema (you must define it once).

Key rule to enforce during review:

* `op.contract.settings` must be derived from domain knobs (subset/pick). If it isn’t, fix it now.

---

### Phase 3 — Implement `step.op` and `step.ops`

**Deliverables:**

* `step.op(op, { requires, provides, run })`
* `step.ops({ …ops }, { requires, provides, run })`
* Both must:

  * derive internal schema from op contracts
  * derive default config from op contracts
  * store bound ops for compilation (`_ops` private field)

Work type: mechanical.

Migration step:

* choose one existing step and rewrite it to the new step module format; ensure it runs.

---

### Phase 4 — Implement stages and resources catalogs

**Deliverables:**

* `stage({ resources?, steps, public?, advanced? })`
* Encourage stage-local `resources(...)` catalogs to replace tag registries.

Work type:

* mechanical (structure)
* moderate non-mechanical where resource typing must be introduced (deciding resource types and ids).

Recommendation:

* start by wrapping existing artifact keys as resources with the same underlying id strings to minimize disruption.

---

### Phase 5 — Implement `recipe(...)` builder: public contract + compilation + execution

**Deliverables:**

* `recipe({ id, knobsSchema?, stages })` returns:

  * `publicSchema`
  * `compile(publicConfig) -> plan`
  * `run(runtime, publicConfig, resources)`

Key sub-deliverables:

* derive stage knob schema from stage steps’ ops (the #1 cleanup)
* enforce “modder-safe” rule:

  * if stage not advanced, every step must have a public view
* implement dependency scheduling:

  * producer map, edge build, toposort, cycle detection

Work type:

* mechanical for schema composition and normalization
* non-mechanical for scheduling integration if the legacy engine assumes a different plan format

Migration strategy:

* implement recipe builder to output an execution plan format compatible with your current executor, or replace executor at the same time. Do not maintain two plan formats long-term.

---

### Phase 6 — Migrate one recipe end-to-end (golden path)

**Goal:** prove the system with one complete map generation workflow.

Work items:

* Create one new recipe module using new `recipe(...)`.
* Build stage modules and step modules under it.
* Write public views for steps so modder config is clean (manual for now; #2 deferred).
* Create one map file using `createMap(...)` with the new public config.
* Run it through compilation and execution.

Work type:

* mixed

  * mechanical conversion of steps
  * non-mechanical design of public views (what you expose to modders)

Acceptance criteria:

* modder config has no envelope/ops/pipeline/internal ids
* compilation produces a deterministic plan
* execution produces the same artifacts as legacy for equivalent internal configs (or explain intentional differences)

---

### Phase 7 — Bulk migrate remaining recipes/maps

Work items:

* Convert all remaining steps to `step.op/step.ops`.
* Convert stage structure and resources catalogs.
* Replace legacy map configs with `createMap(...)` using the new public config.

Work type:

* mostly mechanical once patterns are established
* public view work remains non-mechanical but should be minimized by adopting a small set of reusable view patterns (even without #2 automation).

---

### Phase 8 — Remove legacy systems (no shims)

Work items:

* delete legacy “pipeline config” structures and any map-file schema that exposes them
* delete tag registry/dependency tag indirection if replaced by resources
* delete legacy run-settings threading in steps if still present
* lock exports so only the new recipe/map surfaces are public

Work type: mechanical.

---

## 11. Guardrails (must be implemented to “lock down”)

### 11.1 Build-time assertions

* recipe builder throws unless:

  * every non-advanced stage provides public views for every step
  * no knob key collides with step key
  * no knob key collisions across domains within a stage
  * resource producer uniqueness holds (unless explicitly allowed)
  * dependency graph is acyclic

### 11.2 ESLint / TS boundary rules

* mod/map authoring code may import:

  * `createMap`
  * recipes
  * nothing from domain ops directly
* step modules may import:

  * domain ops
  * resources catalog
  * not recipes/maps

### 11.3 CI grep patterns

Fail if public-facing configs contain any of:

* `"pipeline"`
* `"ops"` (as a public field in map config)
* `"strategy"` (as a public field in map config)
* `":"` in any public step key path

Be careful: these strings will exist internally. Scope checks to `mods/**/maps/**` and exported map config files.

### 11.4 Type-level “public config” sealing

* `createMap` should require `config: Static<recipe.publicSchema>`
* `recipe.publicSchema` is the only source of public config types

This ensures public config doesn’t drift.

---

## 12. Limitations, considerations, and gotchas

### 12.1 Domain knob collisions

Deriving stage knobs by merging domain knob schemas will fail if two domains define the same key with different semantics.

Policy:

* collisions are errors
* the fix is to namespace at the domain level or explicitly separate stages so those domains don’t merge
* do not reintroduce nested `domains.{id}` just to avoid collisions unless you have a real semantic need

### 12.2 Public views are manual for now (#2 deferred)

Without automated public view generation, you must:

* explicitly define what modders can change per step
* maintain view transforms when internal configs evolve

Mitigation:

* keep internal step config stable where possible
* standardize a small set of view patterns (quality preset, toggle, scalar) as reusable helpers later

### 12.3 Internal schema changes are still breaking internally

Even though modders don’t see internal configs, internal schema changes can break:

* public view transforms (they must be updated)
* execution plan caching/diffing if you use it
* tests that assume internal shapes

Mitigation:

* treat internal step config schemas as stable contracts too
* version when necessary

### 12.4 Identity derived from composition keys

Stage/step renames change internal node ids.

Mitigation options:

* accept as breaking (preferred early)
* later add an optional id override at composition time in recipe (not in step authoring)

### 12.5 TypeBox defaults caveats

Defaults only apply reliably when object schemas have `{ default: {} }`. `S.obj(...)` enforces that, but:

* if you build object schemas without `S.obj`, you can reintroduce “missing defaults” bugs

Guardrail:

* forbid `Type.Object(` outside of `S.obj` in authoring packages via lint (or codemod rule)

### 12.6 Runtime-dependent behavior

Runtime params are separated by design. If you want behavior that depends on runtime params, you must:

* express it declaratively in public config (e.g. a mapping), or
* keep it as runtime logic inside steps

Be explicit and consistent; do not reintroduce “runtime params inside config.”

### 12.7 Multi-op steps public UX

Multi-op steps can be hard to present cleanly to modders. Without automation:

* either expose a high-level public schema and translate to multiple envelopes
* or split the step into multiple steps (often cleaner)

---

## 13. Summary (what this architecture represents and what it enables)

This architecture replaces a stringly, internally-leaky map configuration model with a strict separation between:

* a modder-facing **PublicMapConfig** (clean, declarative, stage-scoped, no ops/pipeline)
* an internal, contract-first pipeline configuration derived mechanically from domains and ops

It enables:

* composing an entire workflow inline in a single file because:

  * identity comes from object composition keys (stage/step keys), not separate registries
  * step internal schemas and defaults are derived from op contracts automatically
  * stage knob exposure is derived from domains automatically (#1)
  * compilation is centralized and mechanical (normalize → view transform → op resolve → schedule)

It locks down the system by enforcing:

* public surfaces live only at stage/recipe
* internal contracts stay internal
* dependencies are declared where produced/consumed (steps), and recipes only compose

Next to lock this down for real, the critical work is guardrails: build-time assertions + lint boundaries + CI grep, so the old leakage patterns cannot re-enter the codebase.

If you re-upload the current repo bundle(s), I can turn the implementation plan into an exact, phased migration checklist keyed to your actual packages/modules, including a mechanical codemod outline for step conversion and recipe rebuilding.
