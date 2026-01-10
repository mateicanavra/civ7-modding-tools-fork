Below is a full, integrated re‑composition of the architecture—contracts, implementation modules, config/settings flow, and guardrails—grounded in what the current codebase is actually doing (and *not* doing). I’ll start with the constraints/problems ledger, then propose a canonical contract‑first design that makes authorship declarative, minimizes import‑porting, and standardizes file structure so humans and agents can stamp out repeatable patterns.

---

## Design problems and constraints ledger

### Hard constraints we should treat as non‑negotiable

1. **Plan‑truth op config is always the envelope**

   * The “real” config shape that flows through step schemas → plan compilation → step `run` → op `run` is the envelope:

     * `{ strategy: "<id>", config: <innerConfig> }`
   * This is already encoded in `DomainOp` types via `StrategySelection<Strategies>` and enforced via guardrails (no shorthand/merges).

2. **Every op must have strategies, and `"default"` must exist**

   * The authoring SDK’s `createOp` signature enforces `ConfigSchemas & { default: TSchema }` at the type level (so `"default"` must exist).

3. **TypeScript contextual typing is fragile**

   * Any “factory that returns identity” does *not* improve inference unless it captures the schema literals *at the call site* with a `const` generic (or equivalent) and feeds that into the callback param types.
   * If you export POJOs out-of-line, you need a factory call at definition time to “lock in” inference.

4. **TypeBox schema inference widens easily**

   * If schemas are stored in variables typed as `TSchema`, you lose the `Static<typeof schema>` shape.
   * So factories must be designed to keep schema literals “live” and avoid forcing authors to restate types.

### Problems in the current codebase we should explicitly fix

5. **`createStep` provides almost no type inference**

   * Current `createStep` is effectively an identity function that asserts the schema and returns the object unchanged.
   * The `Step` type is generic over `TConfig` rather than deriving `TConfig` from the schema, so the schema does not drive the `config` param type in `run`/`resolveConfig` unless the author manually supplies it.

6. **Step-level `resolveConfig` is silently dropped when building recipes**

   * In `createRecipe`’s `finalizeOccurrences`, the authored step is converted to an engine `MapGenStep` with `configSchema: authored.schema` and `run: authored.run`, but **`authored.resolveConfig` is not forwarded**.
   * Net effect: even if a step module defines `resolveConfig`, it will not be invoked through the normal recipe→plan compilation path.

7. **Current step modules compensate with boilerplate**

   * Example: the ecology “features” step:

     * manually defines config types as `typeof ecology.ops.X.defaultConfig` and imports settings types, because step config types are not inferred from the schema.
     * defines `resolveConfig` that just forwards into `ecology.ops.*.resolveConfig(...)` per op, i.e. repetitive plumbing.
   * This is exactly the “port imports everywhere + restate types + restate defaults” DX problem you’re trying to avoid.

8. **Engine settings types leak upward into authoring and domains**

   * `DomainOp.resolveConfig` is typed as `(config, settings: RunSettings) => ...` and explicitly documented as “compile-time only” and “called by step resolvers.”
   * Strategy types also import `RunSettings` from the engine package (boundary violation).

9. **There is already a guardrails system—and it’s a good foundation**

   * The repo has a script that checks domain/ops boundaries (no adapter/context crossing, no RNG, no engine imports, no runtime config merges) and also checks steps for runtime config merges.
   * We should extend this guardrail surface for the new canonical architecture rather than inventing a parallel one.

---

## What we actually want the system to be

A contract‑first pipeline where **schemas/metadata compose upward** and runtime logic is attached later:

**Strategies → Ops → Steps → Stages → Recipes → Map File Schema**

And separately:

**Runtime params (player/game) + Map tuning (mod author) → Run settings**

Key goal: **authorship is declarative, transparent, and import‑light**.

### The “two planes” model

1. **Declarative plane**

   * TypeBox schemas + IDs + dependency metadata.
   * Pure composition.
   * Produces the *map file config schema* and types.

2. **Executable plane**

   * `run` functions and optional normalization hooks.
   * Binds contracts to code.
   * Produces the execution plan nodes.

The mistake in the current shape is that steps are half‑in/half‑out: authors manually “resolve” configs even though the compiler can do it, and then that resolve isn’t even wired into the recipe path.

---

## Canonical architecture (integrated)

### Layer 1: Runtime params vs map tuning (settings separation)

We need a crisp split:

* **Runtime params (runtime-only; player/game-provided)**

  * map dimensions, seed, players, civs, wrap, etc.
  * Not authored in the map file.
  * Stable across recipes; should live in a shared “runtime params contract” module.

* **Map tuning (compile-time knobs; modder-authored)**

  * domain knobs, global knobs, recipe knobs.
  * Lives in the map file.
  * Fully contract-derived and statically composable.

Canonical “run settings” shape passed around at runtime:

```ts
type RunSettings<DomainTuning, GlobalTuning, RecipeTuning> = {
  runtime: RuntimeParams;      // runtime-only
  tuning: {
    global: GlobalTuning;      // global knobs
    domains: DomainTuning;     // per-domain knobs (namespaced)
    recipe: RecipeTuning;      // recipe knobs (optional)
  };
  trace?: TraceConfig;         // instrumentation (optional)
};
```

**DX win:** steps/ops can depend on stable `runtime` fields without importing engine internals, and tuning stays clearly “map file authored”.

### Layer 2: Domains (settings contract + op contracts + op implementations)

A domain exports two routers:

* **`domain.contract.ts`**: pure contracts

  * domain tuning schema
  * op contracts (input/output + strategy config schemas + IDs)
* **`domain/index.ts`**: implementations

  * `createOp` binds strategies to op contracts
  * exports runnable ops

### Layer 3: Operations (contracts + implementations)

* **Op contract** defines:

  * `id`, `kind`
  * `input` schema, `output` schema
  * strategy config schemas
  * (optional) what parts of settings it expects for normalization

* **Op implementation** is `createOp(opContract, { strategies })`

  * Derives:

    * `op.config` (envelope union)
    * `op.defaultConfig`
    * `op.resolveConfig` dispatcher (compile-time normalization)
    * `op.run`, `op.runValidated`

### Layer 4: Steps (contracts + implementations)

This is where the largest DX improvement is available.

**Step contract** should be the canonical config surface for authors.

Baseline case (the common case):

* Step config schema is a pure composition of the ops it uses.
* No manual step-level `resolveConfig` written by authors.

Advanced case (optional):

* Step exposes a facade (a simplified config surface) and provides an explicit transform/normalize step.

### Layer 5: Stages and Recipes

* **Stage contract**: grouping only (for config organization and readability)
* **Recipe contract**: top-level composition

  * run settings contract (tuning schema composition)
  * map file schema derived from stage/step contracts

---

## The minimal set of *meaningful* DX improvements

### 1) Fix the wiring bug: step `resolveConfig` must be forwarded

Today, step `resolveConfig` is not forwarded into the engine `MapGenStep` when recipes are built.
Even if we redesign everything, this is a correctness issue to fix.

### 2) Make `createStep` as inferrable as `createOp`

Today it is not, because:

* It doesn’t derive config type from the schema
* It doesn’t bind settings type
* It’s identity-only

### 3) Remove manual per-step “op forwarding” boilerplate

Today, steps like “features” have:

* duplicated types (`typeof op.defaultConfig`)
* duplicated defaults in schema
* duplicated forwarding resolution (`{ op: op.resolveConfig(...) }`)

Instead, we want:

* If step config is “just ops”, a step contract factory should:

  * generate the step schema
  * generate the step default config
  * generate a step resolver that calls `op.resolveConfig` for each op config field
* Authors only write the step’s runtime `run`.

### 4) Eliminate settings-type import porting via “bound factories”

If a step has to import and annotate `RunSettings` (or any recipe settings type), you will keep paying the “port imports everywhere” tax. This is exactly what you don’t want.

The practical fix: **provide a recipe-bound step factory**, analogous to how `createOp` captures strategy config schema literals.

---

## Canonical, standardized file structure

You asked for stable structure across “simple” and “hefty” implementations. Here is the recommended canonical layout.

### Domains

```txt
src/domain/ecology/
  settings.contract.ts
  contract.ts
  index.ts
  ops/
    classify-biomes/
      contract.ts
      strategies/
        default.ts
        legacy.ts
      index.ts
    plan-feature-placements/
      contract.ts
      strategies/
        default.ts
      index.ts
```

* “Simple op” still has these three files; they’re just small.
* “Hefty op” fills out strategy modules and helpers, but structure stays the same.

### Recipes / stages / steps

```txt
src/recipes/standard/
  runtime.contract.ts       // RuntimeParams schema (or re-export)
  settings.contract.ts      // Tuning composition schema
  contract.ts               // RecipeContract (stages + map schema)
  index.ts                  // runnable recipe
  stages/
    ecology/
      contract.ts
      index.ts
      steps/
        features/
          contract.ts
          index.ts
        biomes/
          contract.ts
          index.ts
```

---

## The proposed authoring SDK primitives

This is the “one canonical way” set. There can be convenience, but canonical should be repeatable.

### Settings contracts

* `defineRuntimeParams()` (shared, stable)
* `defineDomainSettings(domainId, schema)`
* `defineRecipeSettings({ runtime, global, domains, recipe })`

### Operation contracts

* `defineOp({ id, kind, input, output, strategies, settings?: selector })`

### Operation implementation

* `createOp(opContract, { strategies, customValidate? })`

### Strategy implementation

* `createStrategy(opContract, "default", { resolveConfig?, run })`

Or (preferred DX) a pre-bound factory:

* `const defineStrategy = opContract.strategyFactory();`
* `export const default = defineStrategy("default", { ... })`

### Step contracts

Two modes:

#### A) Composition-first (baseline)

* `defineStep({ id, phase, requires, provides, ops: { ... } })`

This auto-derives:

* `step.configSchema = Type.Object({ ...op.config }, { default: { ...op.defaultConfig } })`
* `step.resolveConfig = (cfg, settings) => ({ ...op.resolveConfig(cfg.op, settings) })`

#### B) Facade (optional)

* `defineStep({ ..., configSchema })`
* `implementStep(stepContract, { normalizeConfig?, run })`

But the baseline should not require `normalizeConfig`.

### Step implementation

* `implementStep(stepContract, { run })`
* Optionally override `resolveConfig/normalizeConfig` if the step is a facade step.

### Recipe contract + implementation

* `defineRecipeContract({ id, stages, settings, tags })`
* `implementRecipe(recipeContract, { stages, run })`

---

## Concrete worked example

I’ll show (1) a “simple” domain op, (2) a “hefty” op, then (3) a step that composes ops *without* hand-written resolve/default forwarding.

### 1) Simple domain op (same structure, minimal content)

#### `src/domain/placement/ops/plan-starts/contract.ts`

```ts
import { Type } from "typebox";
import { defineOp } from "@mapgen/authoring";

export const planStarts = defineOp({
  id: "placement.planStarts",
  kind: "plan",
  input: Type.Object({
    // ...
  }),
  output: Type.Object({
    // ...
  }),
  strategies: {
    default: {
      config: Type.Object(
        {
          // knobs
          minDistance: Type.Number({ default: 6 }),
        },
        { additionalProperties: false }
      ),
    },
  },
});
```

#### `src/domain/placement/ops/plan-starts/strategies/default.ts`

```ts
import { createStrategy } from "@mapgen/authoring";
import { planStarts } from "../contract";

export const defaultStrategy = createStrategy(planStarts, "default", {
  run(input, cfg, env) {
    // env.runtime + env.tuning.domain (if needed)
    return { /* ... */ };
  },
});
```

#### `src/domain/placement/ops/plan-starts/index.ts`

```ts
import { createOp } from "@mapgen/authoring";
import { planStarts as def } from "./contract";
import { defaultStrategy } from "./strategies/default";

export const planStarts = createOp(def, {
  strategies: { default: defaultStrategy },
});
```

No repeated schemas. No repeated types. Strategy `cfg` is inferred from the contract.

### 2) Hefty op (multi-strategy)

Same structure; the only difference is more strategies.

#### `.../ops/classify-biomes/contract.ts`

```ts
import { Type } from "typebox";
import { defineOp } from "@mapgen/authoring";

export const classifyBiomes = defineOp({
  id: "ecology.classifyBiomes",
  kind: "compute",
  input: Type.Object({ /* fields */ }),
  output: Type.Object({ /* fields */ }),
  strategies: {
    default: { config: Type.Object({ /* ... */ }, { additionalProperties: false }) },
    legacy: { config: Type.Object({ /* ... */ }, { additionalProperties: false }) },
  },
});
```

#### `.../ops/classify-biomes/strategies/default.ts`

```ts
import { createStrategy } from "@mapgen/authoring";
import { classifyBiomes } from "../contract";

export const defaultStrategy = createStrategy(classifyBiomes, "default", {
  resolveConfig(cfg, env) {
    // compile-time normalization, deterministic
    return cfg;
  },
  run(input, cfg) {
    return { /* ... */ };
  },
});
```

#### `.../ops/classify-biomes/index.ts`

```ts
import { createOp } from "@mapgen/authoring";
import { classifyBiomes as def } from "./contract";
import { defaultStrategy } from "./strategies/default";
import { legacyStrategy } from "./strategies/legacy";

export const classifyBiomes = createOp(def, {
  strategies: {
    default: defaultStrategy,
    legacy: legacyStrategy,
  },
});
```

### 3) Step that composes ops without per-step forwarding

Today, your “features” step manually defines types and forwards resolution per op.

Under this architecture, the baseline step looks like:

#### `src/recipes/standard/stages/ecology/steps/features/contract.ts`

```ts
import { defineStep } from "@mapgen/authoring";
import { ecology } from "@mapgen/domain/ecology"; // domain router exporting ops

export const features = defineStep({
  id: "features",
  phase: "ecology",
  requires: [],
  provides: [],
  ops: {
    features: ecology.ops.planFeaturePlacements,
    effects: ecology.ops.planPlotEffects,
    reefs: ecology.ops.planReefEmbellishments,
    vegetation: ecology.ops.planVegetationEmbellishments,
  },
});
```

That one declaration is enough for the SDK to auto-generate:

* `configSchema`:

  * `{ features: op.config, effects: op.config, ... }`
  * with `{ default: { features: op.defaultConfig, ... } }`
* `resolveConfig`:

  * `{ features: op.resolveConfig(cfg.features, settingsSlice), ... }`

#### `src/recipes/standard/stages/ecology/steps/features/index.ts`

```ts
import { implementStep } from "@mapgen/authoring";
import { features as contract } from "./contract";
import { ecology } from "@mapgen/domain/ecology";

export const features = implementStep(contract, {
  run(ctx, cfg) {
    // cfg.features is already resolved and validated once at compile
    const placements = ecology.ops.planFeaturePlacements.run(/* input */, cfg.features);
    // ...
  },
});
```

No `Static`, no `typeof op.defaultConfig` types, no step-level resolution boilerplate.

---

## How config resolution becomes understandable again

### What gets resolved where (and why)

1. **Schema defaults (pure TypeBox)**

   * Applied to:

     * map file config (tuning + step configs)
     * step configs (via step config schema defaults)
     * op inner config defaults (via strategy config schema defaults → op.defaultConfig)
   * This is declarative and compositional.

2. **Op-level `resolveConfig` (optional, deterministic)**

   * Used when defaults alone are insufficient (needs derived values from settings/runtime).
   * Still “compile-time” in the sense: **plan compilation time**, not per-tile runtime.

3. **Step-level resolve**

   * In the baseline: **auto-generated** solely to call `op.resolveConfig` for each op config in the step config.
   * In the facade case: step may provide a custom normalization/translation (optional).

### Why step-level resolution exists at all (but shouldn’t be author-written normally)

Because you want the plan to contain the normalized/resolved configs and you want the engine to:

* fingerprint the plan after normalization,
* validate resolver output,
* pass resolved configs into step `run` once.

The current engine compiler already supports this pattern (it re-validates resolver output). Your tests demonstrate exactly that behavior at the engine level.

The problem is not that the mechanism is wrong—the problem is:

* it’s not wired through recipes today, and
* you’re forcing authors to write plumbing that should be generated.

---

## Direct answers to the “createStep vs createOp” questions

### Why `createStep` is not as typesafe/inferable as `createOp`

Because `createOp` captures the *schema literals* for strategies using a `const` generic and threads them into the types for `run` and `resolveConfig`. Current `createStep` does not:

* derive the config type from the schema,
* bind settings type,
* or provide any schema-driven contextual typing. It’s identity-only.

Also, the current `Step` type is generic over `TConfig`, so the compiler cannot “see” `schema → Static<schema>` unless you manually restate it.

### Do we have to import the settings type and restate types in `resolveConfig`?

In the current codebase: you effectively do, which is why step modules look like the “features” step today.

In the canonical architecture: **no**, because step authors shouldn’t normally be writing `resolveConfig`. It should be auto-generated from the op composition. For the rare facade step that does need custom normalization, it should be typed via a recipe-bound factory (so no settings type import at the call site).

### “You mentioned the implementation helper is omitted—which helper?”

It’s not a helper you forgot to import; it’s a wiring omission in `createRecipe`:

* `finalizeOccurrences` adapts authored `Step` to engine `MapGenStep`, but does not forward `resolveConfig`.

That makes authored step resolvers dead code in the normal execution path.

---

## Guardrails (extend what you already have)

You already have a strong guardrails script that checks the domain boundary and some step patterns.

To support the new canonical architecture, extend guardrails in three categories:

### A) Boundary guardrails

1. **Domains must not import engine settings types**

   * Disallow `@mapgen/engine/execution-plan` imports in `mods/**/src/domain/**`
   * Replace with imports from shared authoring/core settings contracts.

2. **Domain ops must remain “pure contracts”**

   * Keep existing checks:

     * no adapter/context
     * no RNG
     * no runtime default merges (`Value.Default`, `?? {}`)

### B) Step authoring guardrails

1. **No manual schema default forwarding for op configs**

   * If a step is composition-first (declares `ops`), forbid writing `{ default: { op: op.defaultConfig } }` manually in that step’s schema—because the factory should generate it.

2. **No manual per-op resolve forwarding**

   * For composition-first steps, forbid `resolveConfig: (...) => ({ op: op.resolveConfig(...) })` patterns. (These should be auto-generated.)

### C) Structural guardrails (repeatable patterns)

A simple but high-leverage guardrail:

* enforce `contract.ts` + `index.ts` presence in:

  * each op folder
  * each step folder
  * each stage folder
* optionally allow exceptions with an explicit marker.

This is extremely helpful for AI agents to navigate and for humans to predict structure.

---

## Implementation plan (no shims, full cutover)

This is the smallest sequence that preserves your “latest wins” while significantly improving DX.

### Phase 1 — Correctness + plumbing (must-do)

* Forward `step.resolveConfig` through recipe → step registry wiring. (Fix the omission in `finalizeOccurrences`.)
* Keep existing engine compiler behavior (validate defaults, call resolve, revalidate). Tests already rely on this behavior.

### Phase 2 — Settings boundary inversion

* Move “run settings contracts” out of the engine surface area:

  * Domains and authoring types must not import `RunSettings` from engine anymore (currently they do).
* Introduce shared contracts for:

  * runtime params
  * trace settings (optional)
* Recipes compose domain tuning schemas into map-file tuning schema.

### Phase 3 — Step contract + auto-resolution (DX unlock)

* Introduce `defineStep({ ops: ... })` that:

  * generates schema + defaults from ops
  * generates `resolveConfig` that calls `op.resolveConfig` for each op config field
* Introduce `implementStep(stepContract, { run })`

Refactor existing steps (like features) to eliminate:

* manual config type aliases (`typeof op.defaultConfig`)
* manual default forwarding
* manual resolve forwarding

### Phase 4 — Strategy contract-first upgrade

* Introduce `defineOp` + `createStrategy(opContract, key, impl)` so strategies no longer restate schemas (and don’t import engine settings types).

### Phase 5 — Update guardrails and enforce canonical structure

* Extend the existing guardrail script with the new boundary and authoring checks.

---

## Sanity check vs baseline

Baseline today (features step):

* must manually define config types and import settings types
* must manually forward resolve into each op’s resolver
* and even then, that resolve isn’t reliably invoked through recipes because it’s dropped

Canonical design:

* step author writes: `ops: { ... }` once
* factory generates defaults + forwarding resolver
* implementation file writes only `run`
* resolution is invoked exactly once at plan compilation and revalidated (existing engine behavior)

This is a strict reduction in boilerplate while restoring correctness.

---

## Assumptions and uncertainty ledger

1. **Assumption:** It’s acceptable for map-file schema to group step configs by stage (current recipe config shape already does this).
2. **Assumption:** Op resolvers are deterministic and safe to run at plan compile time (this matches the intent/comment in `DomainOp.resolveConfig`).
3. **Uncertainty:** Some steps may currently rely on doing resolution inside `run` (because step-level resolvers weren’t wired); refactors must ensure behavior stays stable when moving resolution back into plan compilation.

---

## Bottom line

* You do **not** need “resolveConfig everywhere” as an authoring burden.
* You do need **one** compile-time normalization mechanism in the system so the plan has resolved, validated configs.
* The right move is:

  1. wire step resolvers correctly,
  2. make step contracts first-class and compositional,
  3. auto-generate the “boring” resolver/default forwarding when a step is just composing ops,
  4. invert settings so domains depend on shared contracts, not engine internals,
  5. enforce structure + boundaries with guardrails.

If you want, I can next produce a *single canonical template* for:

* `defineOp` + `createStrategy` + `createOp`
* `defineStep` + `implementStep`
* `defineRecipeContract` + `implementRecipe`
  including the minimal TypeScript types needed to make inference work reliably (especially for out-of-line strategies/steps).
