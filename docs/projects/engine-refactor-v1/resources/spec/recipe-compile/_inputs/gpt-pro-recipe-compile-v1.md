# Proposal: composition-first recipe compiler (v1)

This document describes the target architecture “as if it already existed” (canonical spec + variations), with explicit boundaries, types, and compilation/execution flow.

It keeps the intended design and behavior unchanged, but it replaces hand-wavy examples and vocabulary drift with concrete anchors from the current repo baseline:

- **Baseline reality (implemented today):**
  - `packages/mapgen-core/src/authoring/recipe.ts` — `createRecipe(...)` and the current recipe→plan wiring.
  - `packages/mapgen-core/src/engine/execution-plan.ts` — `compileExecutionPlan(...)`, schema defaulting, and the current `step.resolveConfig(...)` hook.
  - `packages/mapgen-core/src/authoring/op/create.ts` — `createOp(...)` and op-level `resolveConfig(...)` (currently typed against engine `RunSettings`).
  - `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` — the real `standard` recipe composition and `StandardRecipeConfig` shape.
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/*` — a real multi-op step whose `resolveConfig` is currently forwarding op `resolveConfig` calls.
  - `mods/mod-swooper-maps/src/domain/ecology/ops/features-plan-reefs/strategies/default.ts` — a real strategy that currently re-defaults config inside `run(...)` (a “runtime normalization smell” this proposal explicitly removes).

The two vocabulary updates this proposal assumes:

1. **Runtime channel is `env`** (not `runtime`). Baseline today uses `context.settings: RunSettings` (plus `context.dimensions`), and there is no existing `context.runtime` property.
2. **Config shapes stay stable**. All “resolution” moves to compile-time composition; public→internal is an explicit facade transform; runtime derives values but does not reshape config.

---

# Decision log

### D1 — Runtime becomes `env`

**Decision:** Standardize on **`env`** for all runtime/game-provided parameters (seed, map size, player/civ info, wrap, etc.).
**Why:** The current name `settings` is overloaded and makes it too easy to conflate “player/runtime params” with “author knobs”. `env` is clearer and composes better.

### D2 — “Knobs/settings” are compile-time authoring inputs, not runtime

**Decision:** Introduce **`knobs`** as the compile-time “settings surface” that can affect multiple ops/steps.
**Why:** This creates a strict boundary: **author knobs** are part of map authoring config; **env** is runtime.

### D3 — No config shape resolution at runtime

**Decision:** Internal config shapes are stable. The only permitted shape transformation is **public→internal facade translation**, which is explicit and deterministic in the authoring compiler.
**Why:** This preserves composability and avoids the “mysterious resolved config” anti-pattern.

### D4 — Move config compilation out of the engine

**Decision:** Engine does **not** call step/op “resolveConfig”. The recipe compiler produces a compiled run payload containing validated, defaulted, normalized **internal step configs**.
**Why:** Removes engine↔domain coupling; makes authoring composition the source of truth.

### D5 — Mechanical op normalization (no per-step forwarding boilerplate)

**Decision:** Steps declare the ops they embed, and the compiler applies op-level normalization automatically.
**Why:** Removes repetitive step `resolveConfig` plumbing.

### D6 — Rename semantics: “resolveConfig” → “normalizeConfig”

**Decision:** Treat “resolution” as misleading; normalization is value defaulting/derivation *within the same schema*.
**Why:** Aligns with your “single shape for composability” principle.

---

# Canonical architecture proposal (standalone target spec)

This is the target architecture “as if it already existed”, with explicit boundaries, types, and compilation/execution flow.

## 1) Core model: four channels, each with a distinct job

There are exactly four “inputs” that influence behavior:

1. **`env` (runtime)**
   Game/player-provided parameters known only at run time.
   Examples: map dimensions, map size id, player count, civ selections, seed, wrap flags, etc.

2. **`knobs` (authoring / compile-time)**
   Cross-cutting tunables that affect multiple operations and/or steps.
   These are *authored* (modder/recipe author) and are part of the public map config schema.

3. **`config` (per-step / per-op static config)**
   Strategy selection and its specific config payload. Stable shape.

4. **`inputs` (runtime data dependencies)**
   The actual data a step/op consumes (artifacts/resources) produced by prior steps.

### Critical invariants

* **No runtime “config resolution”**. Runtime may compute *values* from `{env, inputs, config}`, but it must not reshape config.
* **All schema defaulting and knob-driven derivation happens in the authoring compiler.**
* **The engine never imports domains or contracts.** The engine executes compiled steps and validates dependencies.

---

## 2) Layers and dependency direction

### Layer A — Domain (pure contract + pure implementation; no engine imports)

**Domain exports two routers:**

* `domain/contracts` (pure, no runtime code):

  * domain id
  * domain knobs schema (the *compile-time* settings surface)
  * op contracts (input/output/config schemas and metadata)
* `domain/ops` (runtime implementations):

  * `createOp(contract, strategies)` results

**Domain MUST NOT:**

* import the pipeline/engine plan,
* import engine `RunSettings`,
* know about recipes/stages.

---

### Layer B — Operations and strategies (contract-first)

**Op contract** defines schemas and identifiers.
**Strategy** provides:

* `normalizeConfig(config, knobsSlice)` (compile-time value normalization, optional)
* `run(input, config)` (runtime algorithm; config assumed already normalized)

**Key semantic change:** strategy normalization no longer takes `settings`/`RunSettings`; it takes a **domain knob slice** (or an op-specific knob slice if you later decide to subset).

---

### Layer C — Steps (runtime nodes; config compilation is mechanical)

A step module has:

* `contract` (schemas + requires/provides + embedded op bindings)
* `compileConfig(publicStepConfig, compileCtx)`
  Produces **internal step config**:

  * apply defaults to public
  * optional public→internal facade transform
  * apply defaults to internal
  * mechanically call op.normalizeConfig for each bound op (using knob slices)
* `run(ctx, internalConfig)`
  Uses:

  * `ctx.env` (runtime)
  * `ctx.artifacts/resources` (inputs)
  * `internalConfig` (stable shape)

Steps do not “resolve config” at runtime.

---

### Layer D — Stages and recipes (routers/composers; own schema)

**Stage** is an optional composition unit:

* groups steps
* optionally defines **public views** (facades) and transforms
* optionally defines stage knobs (recipe-owned knobs namespaces)

**Recipe** is the owner of the **public map config schema** and the compiler:

* composes domains + stages/steps into one public schema
* compiles public config → internal per-step config
* produces a **CompiledRun** payload for the engine
* the engine builds the execution plan and runs it

---

## 3) Canonical type surfaces

Below are full shapes (not “minimal”), with the updated `env` naming.

### 3.1 Schema normalization helper (single canonical utility)

```ts
import { Value } from "typebox/value";
import type { Static, TSchema } from "typebox";

/**
 * Canonical, deterministic schema defaulting:
 * Clone → Default → Clean
 *
 * Baseline reference: `applySchemaDefaults` in `packages/mapgen-core/src/authoring/schema.ts`.
 *
 * Note: the current baseline does not use `Value.Convert(...)` for authoring defaults; conversions
 * are intentionally explicit (and TypeBox Convert semantics can be surprising across boundaries).
 */
export function applySchemaDefaults<T extends TSchema>(schema: T, input: unknown): Static<T> {
  const cloned = Value.Clone(input ?? {});
  const defaulted = Value.Default(schema, cloned);
  return Value.Clean(schema, defaulted) as Static<T>;
}
```

**Rule:** In this target architecture, `applySchemaDefaults(...)` is a **compile-time tool**:
it is called from the recipe/step compilation path (`compileConfig(...)`, `normalizeConfig(...)`, facade expansion), and it is **not** called from runtime `run(...)` bodies.
To prevent accidental runtime usage, treat it as a **compiler-internal** helper (not exported from public authoring entrypoints).

---

### 3.2 Runtime env contract (engine/game-facing)

This is intentionally “engine‑agnostic Civ7 runtime env”, even if populated by the Civ7 adapter.

Baseline anchor: the current runtime surface is `RunSettings` / `RunSettingsSchema` in
`packages/mapgen-core/src/engine/execution-plan.ts` and is threaded through the system as
`context.settings: RunSettings` (see `packages/mapgen-core/src/core/types.ts`).

```ts
import { RunSettingsSchema, type RunSettings } from "@swooper/mapgen-core/engine";

// Target rename (mechanical): `settings` -> `env`.
export const EnvSchema = RunSettingsSchema;
export type Env = RunSettings;
```

**Important:** `EnvSchema` is the place where “Civ7 official runtime shapes/settings” land, *normalized once*, and then passed down as `ctx.env`.

---

### 3.3 Knobs (authoring settings) contract model

Knobs are *recipe-owned*, but **domain-owned knob schemas** compose into it.

Canonical shape (explicit namespacing):

```ts
/**
 * A recipe-defined knobs object.
 * - global: cross-cutting knobs (rare; optional)
 * - domains: domainId → domain knobs
 * - recipe: recipe-specific knobs
 */
export type KnobsShape = Readonly<{
  global: Record<string, unknown>;
  domains: Record<string, unknown>;
  recipe: Record<string, unknown>;
}>;
```

A given recipe will define a concrete schema and type for knobs:

```ts
import { Type, type Static } from "@swooper/mapgen-core/authoring";
import type { TObject } from "typebox";

export function defineKnobsSchema(args: {
  global: TObject;
  domains: Record<string, TObject>;
  recipe: TObject;
}) {
  return Type.Object(
    {
      global: args.global,
      domains: Type.Object(args.domains, { additionalProperties: false, default: {} }),
      recipe: args.recipe,
    },
    { additionalProperties: false, default: {} }
  );
}

export type KnobsOf<TKnobsSchema extends TObject> = Static<TKnobsSchema>;
```

---

### 3.4 Op contracts and strategy normalization (compile-time knobs, not env)

#### Strategy type

```ts
import type { Static, TSchema } from "typebox";

type NoInfer<T> = [T][T extends any ? 0 : never];

// Baseline reference: `OpStrategy` in `packages/mapgen-core/src/authoring/op/strategy.ts`.
// Target rename: `resolveConfig(settings)` -> `normalizeConfig(knobs)`.
export type OpStrategy<ConfigSchema extends TSchema, Input, Output, Knobs = unknown> = Readonly<{
  config: ConfigSchema;

  /**
   * Compile-time value normalization ONLY.
   * Must return the same schema type (shape stable).
   */
  normalizeConfig?: (
    config: Static<NoInfer<ConfigSchema>>,
    knobs: Knobs
  ) => Static<NoInfer<ConfigSchema>>;

  /** Runtime execution. Config is assumed normalized already. */
  run: (input: Input, config: Static<NoInfer<ConfigSchema>>) => Output;
}>;
```

#### Op implementation surface

```ts
export type StrategySelection<Strategies extends Record<string, { config: TSchema }>> = {
  [K in keyof Strategies & string]: Readonly<{
    strategy: K;
    config: Static<Strategies[K]["config"]>;
  }>;
}[keyof Strategies & string];

export type DomainOp<InputSchema extends TSchema, OutputSchema extends TSchema, Strategies extends Record<string, any>, Knobs> =
  Readonly<{
    id: string;
    kind: "plan" | "compute" | "score" | "select"; // baseline: `DomainOpKind`
    input: InputSchema;
    output: OutputSchema;
    strategies: Strategies;
    config: TSchema;        // envelope union schema
    defaultConfig: unknown; // envelope default value
    normalizeConfig: (cfg: StrategySelection<Strategies>, knobs: Knobs) => StrategySelection<Strategies>;
    run: (input: Static<InputSchema>, cfg: StrategySelection<Strategies>) => Static<OutputSchema>;
  }>;
```

**Key change from baseline:** `normalizeConfig` takes **knobs**, not engine `RunSettings` / runtime.

---

### 3.5 Step contracts (declarative) and step modules (compile + run)

#### Step contract

A step contract declares:

* public schema (author-facing)
* internal schema (runtime-facing)
* op bindings list (for mechanical normalization)

```ts
import type { Static, TObject } from "typebox";
import type { DependencyTag, GenerationPhase } from "@swooper/mapgen-core/engine";
import type { OpContract } from "@swooper/mapgen-core/authoring"; // pure contract type

export type StepOpBinding<C extends OpContract<any, any, any, any, any>> = Readonly<{
  key: string;             // key under internalConfig.ops.<key>
  contract: C;             // op contract (pure)
  knobsDomain: string;     // which domain knob slice to pass
}>;

export type StepContract<
  StepId extends string,
  Phase extends GenerationPhase,
  PublicSchema extends TObject,
  InternalSchema extends TObject,
  Ops extends ReadonlyArray<StepOpBinding<any>>,
> = Readonly<{
  id: StepId;
  phase: Phase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];

  publicSchema: PublicSchema;
  internalSchema: InternalSchema;
  ops: Ops;

  meta?: Readonly<{ title?: string; description?: string }>;
}>;

export type StepPublicConfigOf<C extends StepContract<any, any, any, any, any>> = Static<C["publicSchema"]>;
export type StepInternalConfigOf<C extends StepContract<any, any, any, any, any>> = Static<C["internalSchema"]>;
```

#### Step contract helper

```ts
// Baseline reference: `defineStep` in `packages/mapgen-core/src/authoring/step/contract.ts`.
export function defineStep<
  const StepId extends string,
  const Phase extends GenerationPhase,
  const PublicSchema extends TObject,
  const InternalSchema extends TObject = PublicSchema,
  const Ops extends ReadonlyArray<StepOpBinding<any>> = readonly [],
>(def: {
  id: StepId;
  phase: Phase;
  requires: readonly string[];
  provides: readonly string[];
  publicSchema: PublicSchema;
  internalSchema?: InternalSchema;
  ops?: Ops;
  meta?: StepContract<StepId, Phase, PublicSchema, InternalSchema, Ops>["meta"];
}): StepContract<StepId, Phase, PublicSchema, InternalSchema, Ops> {
  return {
    ...def,
    internalSchema: (def.internalSchema ?? def.publicSchema) as InternalSchema,
    ops: (def.ops ?? ([] as unknown as Ops)) as Ops,
  };
}
```

#### Step module (compile + run)

```ts
import type { Env } from "./env";
import type { KnobsShape } from "./knobs";
import type { EngineAdapter, TraceScope } from "@swooper/mapgen-core";
import { applySchemaDefaults } from "@swooper/mapgen-core/authoring";

export type StepContext<TArtifacts> = Readonly<{
  env: Env;                 // runtime, game-provided
  artifacts: TArtifacts;    // resource store / artifact store
  trace: TraceScope;
  adapter: EngineAdapter;
}>;

export type StepModule<
  C extends StepContract<any, any, any, any, any>,
  TArtifacts,
  TDomainOps extends Record<string, any>,
> = Readonly<{
  contract: C;

  /**
   * Runtime op implementations keyed by binding key.
   * Used for compile-time normalizeConfig and runtime run.
   */
  ops: TDomainOps;

  /**
   * Optional facade translation: public config -> internal config.
   * This is the ONLY allowed place for config shape transformation.
   */
  expandConfig?: (publicCfg: StepPublicConfigOf<C>, knobs: KnobsShape) => unknown;

  /**
   * Compile-time step compilation:
   * - normalize defaults on public schema
   * - (optional) expand public -> internal
   * - normalize defaults on internal schema
   * - mechanically apply op.normalizeConfig for each bound op
   */
  compileConfig: (publicCfg: StepPublicConfigOf<C>, knobs: KnobsShape) => StepInternalConfigOf<C>;

  /** Runtime execution */
  run: (ctx: StepContext<TArtifacts>, cfg: StepInternalConfigOf<C>) => void | Promise<void>;
}>;

export function createStep<
  C extends StepContract<any, any, any, any, any>,
  TArtifacts,
  TDomainOps extends Record<string, { normalizeConfig: Function }>,
>(
  contract: C,
  impl: {
    ops: TDomainOps;
    run: StepModule<C, TArtifacts, TDomainOps>["run"];
    expandConfig?: StepModule<C, TArtifacts, TDomainOps>["expandConfig"];
  }
): StepModule<C, TArtifacts, TDomainOps> {
  function compileConfig(publicCfg: StepPublicConfigOf<C>, knobs: KnobsShape): StepInternalConfigOf<C> {
    const publicNorm = applySchemaDefaults(contract.publicSchema, publicCfg);

    const internalCandidate = impl.expandConfig ? impl.expandConfig(publicNorm, knobs) : publicNorm;

    const internalNorm = applySchemaDefaults(contract.internalSchema, internalCandidate) as any;

    // Mechanical op normalization (no per-step forwarding)
    if (contract.ops?.length) {
      internalNorm.ops = internalNorm.ops ?? {};
      for (const binding of contract.ops) {
        const opImpl = impl.ops[binding.key];
        if (!opImpl) throw new Error(`Step ${contract.id} missing op impl for '${binding.key}'`);

        const domainKnobs = knobs.domains[binding.knobsDomain] ?? {};
        internalNorm.ops[binding.key] = opImpl.normalizeConfig(internalNorm.ops[binding.key], domainKnobs);
      }
    }

    return internalNorm as StepInternalConfigOf<C>;
  }

  return { contract, ops: impl.ops, expandConfig: impl.expandConfig, compileConfig, run: impl.run };
}
```

**This is the central win:** step authors stop writing `resolveConfig` forwarding glue.

---

## 4) Engine boundary: compiled runs only

### 4.1 What the recipe compiler hands the engine

The engine should receive a “compiled run payload” where:

* step configs are already internal + normalized,
* the engine only schedules and executes.

```ts
export type CompiledRun = Readonly<{
  recipeId: string;
  env: Env;                     // runtime
  steps: ReadonlyArray<{
    id: string;
    phase: string;
    requires: readonly string[];
    provides: readonly string[];
    config: unknown;            // internal, already compiled
  }>;
}>;
```

### 4.2 What the engine does with it

* Build execution plan graph / ordering policy
* Execute steps in chosen order
* Validate requires/provides

No config compilation. No calling step normalization hooks.

---

## 5) Recipe compiler: owns composition and compilation

A recipe is a router over:

* knobs schema
* pipeline schema (stages/steps)
* compilation transforms (public→internal + op normalization)
* step list

### 5.1 Public map config shape

Canonical (explicit, composable):

```ts
type PublicMapConfig = {
  knobs: {
    global: { ... };
    domains: { ecology: { ... }, morphology: { ... } };
    recipe: { ... };
  };

  pipeline: {
    // stage namespace
    ecology: {
      biomes: { ... public schema ... };
      featuresPlan: { ... public schema ... };
    };
    foundation: {
      plates: { ... };
    };
  };
};
```

### 5.2 Recipe compile algorithm

1. Normalize `PublicMapConfig` using recipe’s `publicSchema`
2. Normalize knobs once (domain knobs via domain schemas)
3. For each step module:

   * read its public config from `pipeline.stage.step`
   * call `step.compileConfig(publicStepCfg, normalizedKnobs)`
4. Emit `CompiledRun` with internal step configs

### 5.3 Why this satisfies “composition is resolution”

* The recipe’s schema and config object are authored compositionally.
* The compilation phase is deterministic and “pure” (defaults + transforms + normalizeConfig).
* The runtime engine never resolves config.

---

# Core variations (fully specified)

You asked to “show all core variations in full”. These are the ones that materially change the architecture, not cosmetic differences.

## Variation A — Internal-only authoring (advanced mode)

**Public schema == internal schema.**
No facade translation. Modders author op envelopes directly.

* Step contract: `publicSchema` == `internalSchema`
* Step module: no `expandConfig`
* Recipe: no stage view transforms

**Pros:** simplest; least code; easiest to migrate
**Cons:** exposes `{strategy, config}` envelopes and internal wiring

This is acceptable for *internal recipe authors*, not ideal for external modders.

---

## Variation B — Step-owned facade (canonical “minimal clean-cut”)

**Public schema differs from internal schema**, but translation is local to the step.

* Step contract declares both `publicSchema` and `internalSchema`
* Step module implements `expandConfig(public, knobs)`
  (and then mechanical op normalization occurs)

**Pros:**

* hides envelopes cleanly per step
* minimal structural change beyond config compilation relocation
* easy incremental adoption step-by-step, but still a clean cut if you migrate all steps at once

**Cons:**

* facade logic distributed across steps (but explicit)

This is the best “progressive enhancement” without a broader stage/view system.

---

## Variation C — Stage-owned public views (modder-first, more centralized)

Public schema is defined by stage/recipe; steps define internal schema only.

* Step contract has **only internal schema**
* Stage defines:

  * `publicSchema` for each step config
  * `toInternal(publicStepCfg, knobs)` transform
* Recipe composes stage public schemas into the public map config

**Pros:**

* strongest boundary: steps are purely internal runtime nodes
* public UX can be curated holistically
* easier to enforce “no internal ids/envelopes leak”

**Cons:**

* more machinery up front (view registry + transforms)
* more work to migrate in one shot

If your top priority is “modder config must never mention envelopes/internal ids”, this becomes the canonical endpoint. If your top priority is “fix config compilation and engine/domain decoupling now”, Variation B is the right first landing.

Given the preference for a clean, incremental landing path, the canonical recommendation remains:
**Variation B now, with a clean path to Variation C later if needed.**

---

# Illustrative examples (end-to-end)

Two examples:

1. **Simple**: single op, single strategy, no facade
2. **Full**: multiple ops + multiple strategies + shared domain knobs + facade + env influence at runtime (value derivation only)

## Example 1 — Simple end-to-end (single op, no facade)

### A) Domain op (baseline): `ecology/biomes/refine-edge`

This is a real baseline op from `mods/mod-swooper-maps/src/domain/ecology/ops/refine-biome-edges/*` (contract-first, strategy envelope).

#### `mods/mod-swooper-maps/src/domain/ecology/ops/refine-biome-edges/contract.ts`

```ts
import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const RefineBiomeEdgesInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    biomeIndex: TypedArraySchemas.u8({ description: "Biome indices per tile." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask (1 = land, 0 = water)." }),
  },
  { additionalProperties: false }
);

const RefineBiomeEdgesOutputSchema = Type.Object(
  {
    biomeIndex: TypedArraySchemas.u8({ description: "Smoothed biome indices per tile." }),
  },
  { additionalProperties: false }
);

const RefineBiomeEdgesConfigSchema = Type.Object(
  {
    radius: Type.Integer({ minimum: 1, maximum: 5, default: 1 }),
    iterations: Type.Integer({ minimum: 1, maximum: 4, default: 1 }),
  },
  { additionalProperties: false }
);

export const RefineBiomeEdgesContract = defineOp({
  kind: "compute",
  id: "ecology/biomes/refine-edge",
  input: RefineBiomeEdgesInputSchema,
  output: RefineBiomeEdgesOutputSchema,
  strategies: {
    default: RefineBiomeEdgesConfigSchema,
    morphological: RefineBiomeEdgesConfigSchema,
    gaussian: RefineBiomeEdgesConfigSchema,
  },
});
```

#### `mods/mod-swooper-maps/src/domain/ecology/ops/refine-biome-edges/index.ts`

```ts
import { createOp } from "@swooper/mapgen-core/authoring";
import { RefineBiomeEdgesContract } from "./contract.js";
import { defaultStrategy, gaussianStrategy } from "./strategies/index.js";

export const refineBiomeEdges = createOp(RefineBiomeEdgesContract, {
  strategies: {
    default: defaultStrategy,
    morphological: defaultStrategy,
    gaussian: gaussianStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";
```

#### `mods/mod-swooper-maps/src/domain/ecology/ops/refine-biome-edges/strategies/default.ts`

```ts
import { createStrategy } from "@swooper/mapgen-core/authoring";
import { RefineBiomeEdgesContract } from "../contract.js";

export const defaultStrategy = createStrategy(RefineBiomeEdgesContract, "default", {
  run: (input, config) => {
    const { width, height } = input;
    const size = width * height;
    if (input.biomeIndex.length !== size || input.landMask.length !== size) {
      throw new Error("Refine biome edges: invalid input size.");
    }
    let working = new Uint8Array(input.biomeIndex);
    const radius = config.radius;

    for (let iter = 0; iter < config.iterations; iter++) {
      const next = new Uint8Array(size);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (input.landMask[idx] === 0) {
            next[idx] = working[idx]!;
            continue;
          }
          const counts: Record<number, number> = {};
          for (let dy = -radius; dy <= radius; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;
              const nIdx = ny * width + nx;
              const biome = working[nIdx]!;
              counts[biome] = (counts[biome] ?? 0) + 1;
            }
          }
          let dominant = working[idx]!;
          let bestCount = -1;
          for (const [biome, count] of Object.entries(counts)) {
            const numericBiome = Number(biome);
            if (count > bestCount) {
              dominant = numericBiome;
              bestCount = count;
            }
          }
          next[idx] = dominant;
        }
      }
      working = next;
    }

    return { biomeIndex: working };
  },
});
```

### B) Step (baseline): `biome-edge-refine` (stage `ecology`)

This is a real baseline step from `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biome-edge-refine/*`.

#### `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biome-edge-refine/contract.ts`

```ts
import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

export const BiomeEdgeRefineStepContract = defineStep({
  id: "biome-edge-refine",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
    M3_DEPENDENCY_TAGS.artifact.heightfield,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1],
  schema: Type.Object(
    {
      refine: ecology.ops.refineBiomeEdges.config,
    },
    {
      additionalProperties: false,
      default: {
        refine: ecology.ops.refineBiomeEdges.defaultConfig,
      },
    }
  ),
});
```

#### `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biome-edge-refine/index.ts`

```ts
import { createStep } from "@swooper/mapgen-core/authoring";
import type { HeightfieldBuffer } from "@swooper/mapgen-core";
import type { Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { isBiomeClassificationArtifactV1 } from "../../../../artifacts.js";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";
import { BiomeEdgeRefineStepContract } from "./contract.js";

type BiomeEdgeRefineConfig = Static<typeof BiomeEdgeRefineStepContract.schema>;

const isHeightfield = (value: unknown, size: number): value is HeightfieldBuffer => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HeightfieldBuffer>;
  return candidate.landMask instanceof Uint8Array && candidate.landMask.length === size;
};

export default createStep(BiomeEdgeRefineStepContract, {
  resolveConfig: (config, settings) => ({
    refine: ecology.ops.refineBiomeEdges.resolveConfig(config.refine, settings),
  }),
  run: (context, config: BiomeEdgeRefineConfig) => {
    const classification = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1);
    if (!isBiomeClassificationArtifactV1(classification)) {
      throw new Error("BiomeEdgeRefineStep: Missing biome classification artifact.");
    }

    const { width, height } = context.dimensions;
    const heightfieldArtifact = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.heightfield);
    if (!isHeightfield(heightfieldArtifact, width * height)) {
      throw new Error("BiomeEdgeRefineStep: Missing heightfield for land mask.");
    }
    const heightfield = heightfieldArtifact as HeightfieldBuffer;

    const refined = ecology.ops.refineBiomeEdges.runValidated(
      {
        width,
        height,
        biomeIndex: classification.biomeIndex,
        landMask: heightfield.landMask,
      },
      config.refine
    );

    context.artifacts.set(M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1, {
      ...classification,
      biomeIndex: refined.biomeIndex,
    });
  },
});
```

### C) Recipe wiring (baseline): `standard`

Baseline today, recipes are composed with `createRecipe(...)` and produce a `RecipeModule` that:

- Builds `StepRegistry` + `TagRegistry` from stages/steps.
- `instantiate(config?) -> RecipeV2` (structural recipe + per-step config objects).
- `runRequest(settings, config?) -> RunRequest`.
- `compile(settings, config?) -> ExecutionPlan` (calls `compileExecutionPlan(...)` in the engine; this is where schema defaulting + `step.resolveConfig(...)` happen today).
- `run(context, settings, config?, ...)` (constructs the plan and executes it via `PipelineExecutor`).

Real baseline recipe (`mods/mod-swooper-maps/src/recipes/standard/recipe.ts`):

```ts
import { createRecipe } from "@swooper/mapgen-core/authoring";
import type { RecipeConfigOf } from "@swooper/mapgen-core/authoring";

import ecology from "./stages/ecology/index.js";
import foundation from "./stages/foundation/index.js";
import hydrologyCore from "./stages/hydrology-core/index.js";
import hydrologyPost from "./stages/hydrology-post/index.js";
import hydrologyPre from "./stages/hydrology-pre/index.js";
import morphologyMid from "./stages/morphology-mid/index.js";
import morphologyPost from "./stages/morphology-post/index.js";
import morphologyPre from "./stages/morphology-pre/index.js";
import narrativeMid from "./stages/narrative-mid/index.js";
import narrativePost from "./stages/narrative-post/index.js";
import narrativePre from "./stages/narrative-pre/index.js";
import narrativeSwatches from "./stages/narrative-swatches/index.js";
import placement from "./stages/placement/index.js";
import { STANDARD_TAG_DEFINITIONS } from "./tags.js";

const NAMESPACE = "mod-swooper-maps";
const stages = [
  foundation,
  morphologyPre,
  narrativePre,
  morphologyMid,
  narrativeMid,
  morphologyPost,
  hydrologyPre,
  narrativeSwatches,
  hydrologyCore,
  narrativePost,
  hydrologyPost,
  ecology,
  placement,
] as const;

export type StandardRecipeConfig = RecipeConfigOf<typeof stages>;

export default createRecipe({
  id: "standard",
  namespace: NAMESPACE,
  tagDefinitions: STANDARD_TAG_DEFINITIONS,
  stages,
} as const);
```

Baseline step ids are composed by `createRecipe` as:

- Full id: `"<namespace>.<recipeId>.<stageId>.<stepId>"` (see `packages/mapgen-core/src/authoring/recipe.ts`).
- Example: `mod-swooper-maps.standard.ecology.biome-edge-refine`.

### D) Engine executes `CompiledRun` (no config compilation)

Baseline today:

* Engine compiles an `ExecutionPlan` (including schema defaulting and optional `step.resolveConfig`).
* `PipelineExecutor.executePlan(context, plan, ...)` executes steps and enforces requires/provides at runtime via the tag registry.

Target in this proposal:

* Recipe compiler produces compiled per-step internal configs (validated/defaulted/normalized at composition time).
* Engine only schedules and executes compiled nodes; it does not call any step/op config normalization hook.

---

## Example 2 — Full end-to-end (multi-op, strategies, knobs, facade, env-driven value derivation)

We’ll model a realistic ecology stage that:

* uses multiple ops
* exposes a simple public config (“quality” + “density”)
* compiles to internal op envelopes and configs
* at runtime derives values based on env.map size (without changing config shape)

### A) Domain: `ecology`

#### Domain knobs (compile-time settings affecting multiple ops)

```ts
import { Type } from "@swooper/mapgen-core/authoring";

export const EcologyKnobsSchema = Type.Object(
  {
    featureDensityScale: Type.Optional(Type.Number({ default: 1.0, minimum: 0 })),
    reefWarmThresholdBias: Type.Optional(Type.Number({ default: 0.0 })),
  },
  { additionalProperties: false, default: {} }
);
```

#### Op contract: `planReefs` with two strategies

* `default`
* `shipping-lanes`

```ts
import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";
import { FeaturePlacementSchema } from "../../shared/placement-schema.js";

const PlanReefsInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    landMask: TypedArraySchemas.u8({ description: "Land mask (1 = land, 0 = water)." }),
    surfaceTemperature: TypedArraySchemas.f32({ description: "Surface temperature (C)." }),
  },
  { additionalProperties: false }
);

const PlanReefsOutputSchema = Type.Object(
  {
    placements: Type.Array(FeaturePlacementSchema),
  },
  { additionalProperties: false }
);

const PlanReefsConfigSchema = Type.Object(
  {
    warmThreshold: Type.Number({ default: 12 }),
    density: Type.Number({ minimum: 0, maximum: 1, default: 0.35 }),
  },
  { additionalProperties: false }
);

export const PlanReefsContract = defineOp({
  kind: "plan",
  id: "ecology/features/plan-reefs",
  input: PlanReefsInputSchema,
  output: PlanReefsOutputSchema,
  strategies: {
    default: PlanReefsConfigSchema,
    "shipping-lanes": PlanReefsConfigSchema,
  },
});
```

#### Strategy normalization uses knobs (not env)

```ts
import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { PlanReefsContract } from "../contract.js";

type Knobs = Readonly<{
  featureDensityScale?: number;
  reefWarmThresholdBias?: number;
}>;

type Config = Static<typeof PlanReefsContract["strategies"]["default"]>;
const EMPTY_CONFIG: Config = {} as Config;

export const defaultStrategy = createStrategy(PlanReefsContract, "default", {
  /**
   * Target semantics:
   * - called at compile-time composition
   * - shape-stable (same schema in/out)
   * - takes `knobs` (not runtime `RunSettings`)
   */
  normalizeConfig: (cfg: Config, knobs: Knobs): Config => {
    const base = applySchemaDefaults(PlanReefsContract.strategies.default, cfg ?? EMPTY_CONFIG);
    return {
      ...base,
      warmThreshold: base.warmThreshold + (knobs.reefWarmThresholdBias ?? 0),
      density: base.density * (knobs.featureDensityScale ?? 1),
    };
  },

  run: (input, config) => {
    // config already normalized; do not call normalize/defaulting again
    const placements: Array<{ x: number; y: number; feature: string; weight?: number }> = [];
    const { width, height } = input;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = row + x;
        if (input.landMask[idx] !== 0) continue; // water only
        const temperature = input.surfaceTemperature[idx] ?? 0;
        if (temperature < config.warmThreshold) continue;
        if ((x + y) % 3 !== 0) continue; // simple spacing
        placements.push({ x, y, feature: "FEATURE_REEF", weight: config.density });
      }
    }
    return { placements };
  },
});
```

### B) Step: `features-plan` (baseline multi-op step; facade candidate)

**Public intent:**

```ts
type Public = {
  quality?: "fast" | "accurate";
  density?: "sparse" | "normal" | "dense";
};
```

**Internal canonical shape:**

```ts
type Internal = {
  // Baseline reality today: this step's config is already "internal" op envelopes,
  // one per op (no `ops: {...}` wrapper).
  vegetation: { strategy: "default" | "clustered"; config: { /* PlanVegetationConfig */ } };
  wetlands: { strategy: "default"; config: { /* PlanWetlandsConfig */ } };
  reefs: { strategy: "default" | "shipping-lanes"; config: { /* PlanReefsConfig */ } };
  ice: { strategy: "default"; config: { /* PlanIceConfig */ } };
};
```

#### Baseline contract (`mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/contract.ts`)

```ts
import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

export const FeaturesPlanStepContract = defineStep({
  id: "features-plan",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.pedologyV1,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.featureIntentsV1],
  schema: Type.Object(
    {
      vegetation: ecology.ops.planVegetation.config,
      wetlands: ecology.ops.planWetlands.config,
      reefs: ecology.ops.planReefs.config,
      ice: ecology.ops.planIce.config,
    },
    {
      additionalProperties: false,
      default: {
        vegetation: ecology.ops.planVegetation.defaultConfig,
        wetlands: ecology.ops.planWetlands.defaultConfig,
        reefs: ecology.ops.planReefs.defaultConfig,
        ice: ecology.ops.planIce.defaultConfig,
      },
    }
  ),
});
```

#### Baseline step module (excerpt showing the current forwarding glue)

```ts
export default createStep(FeaturesPlanStepContract, {
  resolveConfig: (config, settings) => ({
    vegetation: ecology.ops.planVegetation.resolveConfig(config.vegetation, settings),
    wetlands: ecology.ops.planWetlands.resolveConfig(config.wetlands, settings),
    reefs: ecology.ops.planReefs.resolveConfig(config.reefs, settings),
    ice: ecology.ops.planIce.resolveConfig(config.ice, settings),
  }),
  // `run(...)` unchanged here; see `mods/mod-swooper-maps/.../features-plan/index.ts` for the full baseline implementation.
});
```

#### Target facade overlay (public → internal), grounded in baseline contracts

Under this proposal, the **only** shape-changing step is an explicit facade expansion during recipe composition.

For example, we can expose a small public config surface that compiles down to the same internal op-envelope config that the baseline `FeaturesPlanStepContract.schema` already expects:

```ts
import { Type, applySchemaDefaults } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { FeaturesPlanStepContract } from "./contract.js";

const FeaturesPlanPublicSchema = Type.Object(
  {
    quality: Type.Optional(Type.Union([Type.Literal("fast"), Type.Literal("accurate")]), { default: "fast" }),
    density: Type.Optional(
      Type.Union([Type.Literal("sparse"), Type.Literal("normal"), Type.Literal("dense")]),
      { default: "normal" }
    ),
  },
  { additionalProperties: false, default: {} }
);

type FeaturesPlanPublicConfig = Static<typeof FeaturesPlanPublicSchema>;
type FeaturesPlanInternalConfig = Static<typeof FeaturesPlanStepContract.schema>;

export function expandFeaturesPlanConfig(publicCfg: FeaturesPlanPublicConfig): FeaturesPlanInternalConfig {
  const densityScalar =
    publicCfg.density === "sparse" ? 0.6 : publicCfg.density === "dense" ? 1.4 : 1.0;

  // Public -> internal is deterministic and pure. Defaults are applied by schema.
  return applySchemaDefaults(FeaturesPlanStepContract.schema, {
    reefs:
      publicCfg.quality === "accurate"
        ? { strategy: "shipping-lanes", config: { density: densityScalar } }
        : { strategy: "default", config: { density: densityScalar } },

    // Optional: leave other ops unspecified and rely on schema defaults.
    // vegetation, wetlands, ice: omitted
  });
}
```

**Runtime env influence (value derivation only):**
If a step needs to scale behavior by map size/seed/etc, compute a local derived value from `ctx.env`/`ctx.dimensions` and use it as a runtime input (preferred), or as a transient derived value that never persists back into stored config.

* `planReefs` input adds `densityScale: number`
* op multiplies internally

That is the strictest interpretation of “config shape and values remain unchanged”. Both are valid; choose based on taste. My recommendation for maximum clarity is:

* keep config immutable
* pass runtime-derived scalars via input (since it is, semantically, runtime input)

---

# Addressing your two explicit concerns

## Concern 1 — How do `env` (runtime params) and `knobs` (settings) flow, and what do ops declare?

### Correct framing

* **Ops should not “resolve” config shape.**
* Ops may:

  * normalize *values* at compile-time using `knobs` (same schema in/out)
  * derive runtime values using `env` + `inputs` at runtime

### How do we pass Civ7 runtime shapes down?

**Canonical answer:** the step runtime context includes `ctx.env`.
You can choose how ops consume env:

#### Option A (recommended for explicitness): env-derived values are passed as input fields

* op contract input includes `width`, `height`, etc (already common)
* step reads `ctx.env` and passes them in

**Pros:** explicit, testable, contract-driven
**Cons:** repeated `width/height` fields

#### Option B (DX-first): op `run(input, config, ctx)` and `ctx.env` is standard

* ops can access `ctx.env` without repeating in input schema

**Pros:** fewer repeated fields
**Cons:** more ambient dependency; input schema less explicit

My recommendation remains **Option A** for now, because it aligns with your “operations + contracts” worldview and keeps domain ops pure/testable. If repetition becomes painful, add helpers like:

* `withDimsInput(schema)` to compose `width/height` in a standard way
* `EnvPickSchema(["dimensions", "seed"])` to standardize subsets

### Where should env live in code?

* In your current baseline, runtime stuff is on `context.settings` and `context.dimensions`.
* In the target architecture:

  * **rename** `settings` → `env`
  * optionally fold `dimensions` into `env.dimensions` (you already have that shape in the engine settings schema)
  * keep `ctx.dimensions` as a derived convenience if you want, but canonical should be `ctx.env.dimensions`.

## Concern 2 — Why do we need config “resolution” at all?

We basically don’t.

### What we eliminate

* “Resolve config shape” as a concept.
* Runtime “resolveConfig” calls inside ops/strategies.
* Engine-owned config resolution pipeline.

### What we keep (and rename for honesty)

1. **Schema defaulting + cleanup** (`applySchemaDefaults`)
   Clone/Default/Clean — deterministic, stable shape.

2. **Facade translation (public → internal)**
   This is the *only* legitimate shape transform, and it is explicit:

* `expandConfig(publicCfg)` yields internal canonical config
* internal canonical config schema never changes afterward

3. **Value normalization hooks**

* compile-time: `normalizeConfig(cfg, knobsSlice)` returns same schema type
* runtime: derive values from env/inputs/config but do not mutate config (or, if you do clone, treat it as transient and never persist back)

That matches your proposed mental model precisely.

---

# Implementation plan (scoped, with parallelization)

This is framed as “work units” and risk categories, not time.

## Phase 0 — Mechanical inventory (parallel, low risk)

**Goal:** identify every existing place where runtime config resolution occurs.

Parallelizable tasks for agents:

* Locate all `resolveConfig` implementations in:

  * step modules
  * op strategies
  * op creation pipeline
* Locate any runtime calls to `resolveConfig` inside `run(...)` bodies
* Categorize:

  * “forwarding boilerplate” (safe to delete)
  * “real normalization” (needs migration to compile-time normalize)

Deliverable: a checklist per module.

## Phase 1 — Introduce `env` as the runtime channel (mechanical, medium blast radius)

**Goal:** stop overloading the term “settings”.

Steps:

* Introduce `Env` + `EnvSchema` in core.
* Rename:

  * engine `RunSettings` → `Env` (or keep alias temporarily but the clean-cut version is a rename)
  * `RunRequest.settings` → `RunRequest.env`
  * `ExecutionPlan.settings` → `ExecutionPlan.env`
  * `ExtendedMapContext.settings` → `ExtendedMapContext.env`

This is large but mostly mechanical rename/refactor.

**Careful handling:**

* anything relying on `settings.directionality` (ensure it becomes `env.directionality` or is relocated)
* adapter/map-init code that constructs the settings/env object

## Phase 2 — Move compilation out of engine (architectural, high value, medium risk)

**Goal:** engine stops calling `step.resolveConfig`.

Steps:

* Create a recipe-level compiler that:

  * normalizes public map config
  * normalizes knobs
  * compiles internal step configs via step modules
* Engine compile step becomes “graph compilation only”:

  * validates step ids exist
  * validates internal configs against step internal schema (optional but recommended)
  * does not transform configs

**Key cut line:** remove `resolveConfig` from `MapGenStep` entirely (clean cut), or keep but forbid engine usage (less clean). Given your “no shims”, I recommend removing it.

## Phase 3 — Update op/strategy normalization signature (architectural, medium risk)

**Goal:** domain no longer imports engine types.

Steps:

* Change strategy normalization signature:

  * from `(config, settings: RunSettings)`
  * to `(config, knobsSlice)`
* Change op normalize dispatcher similarly.
* Update any strategy that actually used runtime settings (you likely have few or none; most ignore).

Parallelizable: yes, across ops/strategies.

## Phase 4 — Introduce `StepContract` + `createStep` compileConfig (architectural, medium risk)

**Goal:** eliminate per-step resolve forwarding.

Steps:

* Add `StepContract` and `StepModule` as shown.
* Update recipe/stage to reference `step.contract.publicSchema` for composition.
* Step compilation uses mechanical op normalization.

Parallelizable: step-by-step migration.

## Phase 5 — Bulk step migration (highly parallel, mostly mechanical)

For each step:

* delete step-level `resolveConfig` forwarding glue
* ensure public/internal schemas are declared in contract
* ensure embedded op bindings list is correct
* ensure run uses `ctx.env` instead of `ctx.settings`
* ensure op configs are expected to be normalized already

This is where multiple agents help a lot.

**Careful handling (mixed):**

* steps currently relying on runtime `resolveConfig` inside strategy.run; remove those calls and rely on compile normalization
* steps where “public config” today is already internal envelope; decide whether to keep (Variation A) or introduce facade (Variation B)

## Phase 6 — Guardrails + tests (sequential, high leverage)

Add/extend guardrails so regressions are caught:

* Domain modules cannot import engine plan/runtime types
* No `normalizeConfig/resolveConfig` calls inside runtime `run` bodies
* Facade transforms must be deterministic and pure (no reading runtime env)
* Internal config shape must match internal schema and must not be mutated at runtime (optional lint)

Update or add tests:

* recipe compile produces identical internal configs given same public config/knobs
* engine execution does not call any config compilation hook
* config defaults are applied exactly once

---

# Summary of shape and scope

* **One clean-cut progressive enhancement** is achieved by:

  * introducing `env` and `knobs` as distinct channels
  * moving config compilation into the recipe compiler
  * removing engine-driven config resolution hooks
  * making step compilation mechanical (no forwarding boilerplate)
  * keeping config shapes stable, with only explicit facade transforms

* The architecture stays focused on config resolution + boundary enforcement.
  It does not require re-architecting scheduling, dependency semantics, or artifacts beyond what’s necessary.

If you want, in the next turn I can also restate the “canonical public map config schema” for your *standard* recipe as a concrete example tree (recipe → stages → steps → per-step public config), so you can literally see what modders will type into.
