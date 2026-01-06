You’re not wrong to react to “schema bundles with config + curried helpers” as a smell. Most of that complexity is self‑inflicted by two choices:

1. **Conflating “op schema” with “default strategy config schema.”**
2. **Letting domain strategies depend on a runtime-owned `RunSettings` type.**

The rest is TypeScript reality: exported objects don’t get contextual typing later, so if you want `run(input, cfg)` inferred inside a strategy module, you must give the strategy definition *some* context at definition time (either the op’s IO types or a handle that carries them). TypeScript calls this *contextual typing* and it’s how callback parameter types get inferred in the first place.

Below is a “greenfield within constraints” design that makes this whole system feel like a normal Strategy pattern again, while keeping your envelope + TypeBox requirements.

---

# The simplification: separate “Op Definition (IO)” from “Strategies (Config)”

## Core idea

* **Op definition** owns only: `kind`, `id`, `input schema`, `output schema` (and *optionally* a domain settings type).
* **Strategies** own: `config schema`, optional `resolveConfig(config, settings)`, and `run(input, config)`.
* **createOp** still derives:

  * union envelope schema `{ strategy, config }` over strategies
  * default config `{ strategy: "default", config: defaultedInner }`
  * dispatcher `op.resolveConfig(...)`

This matches the canonical Strategy pattern: a context delegates to interchangeable strategies via a stable contract.

---

# Answering your numbered directions directly

## 1) A simpler `createStrategy` API (and remove “default config in op schema”)

### What changes

* Replace today’s `DomainOpSchema { input, config, output }` as the canonical *op* schema with an **IO-only op definition**.
* Strategies define their own config schemas; *nothing* about “default config” is baked into the op definition.

### New canonical primitives

1. `defineOp(...)` (IO-only)
2. `createStrategy(opDef, strategyDef)` (single, simple call)
3. `createOp(opDef, { strategies, customValidate? })` (finalize op)

No curried builder. No “op schema config that implies default strategy.”

---

## 2) Do strategies need input/output context at definition time?

If you want **strongly typed `run(input, cfg)` without manual annotations**, then yes—*TypeScript requires it*.

Why:

* TypeScript infers function parameter types from **context** (the expected type).
* An exported object literal does not receive later contextual typing from where it’s consumed (your exact issue).

So the simplest “truthy” statement is:

> Strategies don’t need IO schemas for runtime behavior, but they **do need IO types at definition time** to get type inference for `run(input, ...)` in an out-of-line module.

The trick is to make that context painless: strategy authors should import **one op definition handle** (not copy/paste input/output schemas).

---

## 3) `RunSettings` is a boundary violation (and how to fix it cleanly)

### Yes, it violates the boundary you described

Your current authoring surface (`OpStrategy.resolveConfig(cfg, settings: RunSettings)`) forces domain modules to know an engine-level settings type. That’s an architectural dependency inversion.

Even worse, in your repo excerpt `authoring/*` imports engine types directly (including `RunSettings`). That makes it hard to keep “domain authoring” independent.

### Concrete alternative

Make “settings” a **generic domain-level type** and keep the engine’s `RunSettings` on the engine side.

* `OpStrategy<..., Settings>`
* `DomainOp<..., Settings>`
* `op.resolveConfig(envelope, settings: Settings)`

Then introduce an adapter at the step/engine boundary:

* engine knows `RunSettings`
* domain knows `DomainSettings`
* step resolver (or mod integration) maps: `DomainSettings = mapRunSettings(runSettings)`

This is exactly the standard layering: context may pass data to strategies, but the strategy contract shouldn’t depend on a concrete runtime environment type.

---

## 4) Make config vs settings separation explicit

Codify it in the signatures:

* `run(input, config)` — runtime algorithm only
* `resolveConfig(config, settings)` — compile-time normalization only

Optionally make it even clearer by using a named object param:

```ts
resolveConfig?: (args: { config: Static<ConfigSchema>; settings: Settings }) => Static<ConfigSchema>
```

That prevents “what is the second param again?” and makes the mental model obvious.

---

## 5) Are you solving something novel, or did it drift?

### Not novel: you’re implementing Strategy pattern + config normalization

Your architecture is a recognizable Strategy pattern:

* Context = `op` dispatches to strategy based on `strategy` id
* Strategy = algorithm variant (run)
* Config = per-strategy parameters

That’s straight down the middle of Strategy.

### What *is* unique

Two constraints make your implementation more specialized than typical TS examples:

1. **Config is validated/defaulted via TypeBox schemas**, and op’s config schema is a **derived union** of strategies.
2. You have **compile-time resolution** (`resolveConfig`) and a **plan-truth envelope**.

Those aren’t common in typical design pattern writeups, but they don’t require a complicated authoring API. They just require careful typing.

### The real source of your pain

It’s TypeScript contextual typing + out-of-line exports (not the Strategy pattern itself).

So yes: you drifted into avoidable complexity (bundling config into op schema + engine settings leaking into domain), but the core problem is standard and solvable cleanly.

---

# Proposed simplified design (coherent end state)

## The authoring experience you want

* Strategy file: one `createStrategy(...)` call, no generics, no `Static<>` aliases.
* Op file: import strategies, attach them, done.
* No “default config in op schema”
* No `RunSettings` in domain code.

### Canonical file layout (prevents import cycles)

* `op.def.ts` — op definition (IO only)
* `strategies/*.ts` — strategies import op definition
* `index.ts` — final op imports op definition + strategies

This is a standard dependency direction and avoids cycles cleanly.

---

# Exact proposed TypeScript signatures

Below are **precise** signatures (not prose). Names can be adjusted, but the type structure is the key.

## 1) `OpStrategy` becomes settings-generic and stops importing engine types

```ts
type NoInfer<T> = [T][T extends any ? 0 : never];

export type OpStrategy<
  ConfigSchema extends TSchema,
  Input,
  Output,
  Settings = unknown
> = Readonly<{
  config: ConfigSchema;

  // compile-time only
  resolveConfig?: (
    config: Static<NoInfer<ConfigSchema>>,
    settings: Settings
  ) => Static<NoInfer<ConfigSchema>>;

  // runtime
  run: (
    input: Input,
    config: Static<NoInfer<ConfigSchema>>
  ) => Output;
}>;
```

## 2) Op definition is IO-only

```ts
export type OpDef<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Settings = unknown
> = Readonly<{
  kind: DomainOpKind;
  id: string;
  input: InputSchema;
  output: OutputSchema;
}>;
```

Helper to define it (pins types across boundaries, like your current `defineOpSchema` does):

```ts
export function defineOp<
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  Settings = unknown
>(def: Readonly<{
  kind: DomainOpKind;
  id: string;
  input: InputSchema;
  output: OutputSchema;
}>): OpDef<InputSchema, OutputSchema, Settings>;
```

(If you want to infer `Settings` without generics, you can add an optional `settingsSchema` later; not required for core DX.)

## 3) One simple `createStrategy` (single calling convention)

```ts
export function createStrategy<
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  Settings,
  const ConfigSchema extends TSchema
>(
  op: OpDef<InputSchema, OutputSchema, Settings>,
  strategy: OpStrategy<
    ConfigSchema,
    Static<InputSchema>,
    Static<OutputSchema>,
    Settings
  >
): OpStrategy<
  ConfigSchema,
  Static<InputSchema>,
  Static<OutputSchema>,
  Settings
>;
```

That is the whole point: the op def supplies IO + Settings context; `ConfigSchema` is inferred from `strategy.config`, enabling `cfg` inference.

## 4) `createOp` finalizes with derived envelope union (unchanged semantics)

Type-level skeleton (mirrors your current `ConfigSchemas` mapping approach):

```ts
type StrategyConfigSchemas = Readonly<Record<string, TSchema>>;

type StrategiesFor<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Settings,
  ConfigSchemas extends StrategyConfigSchemas
> = Readonly<{
  [K in keyof ConfigSchemas & string]: OpStrategy<
    ConfigSchemas[K],
    Static<InputSchema>,
    Static<OutputSchema>,
    Settings
  >;
}>;

export function createOp<
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  Settings,
  const ConfigSchemas extends StrategyConfigSchemas & { default: TSchema }
>(
  op: OpDef<InputSchema, OutputSchema, Settings>,
  opts: Readonly<{
    strategies: StrategiesFor<InputSchema, OutputSchema, Settings, ConfigSchemas>;
    customValidate?: CustomValidateFn<
      Static<InputSchema>,
      StrategySelection<StrategiesFor<InputSchema, OutputSchema, Settings, ConfigSchemas>>
    >;
  }>
): DomainOp<
  InputSchema,
  OutputSchema,
  StrategiesFor<InputSchema, OutputSchema, Settings, ConfigSchemas>,
  Settings
>;
```

And `DomainOp` becomes settings-generic as well:

```ts
export type DomainOp<..., Settings = unknown> = Readonly<{
  ...
  resolveConfig: (
    config: StrategySelection<Strategies>,
    settings: Settings
  ) => StrategySelection<Strategies>;
}>;
```

---

# Concrete usage examples

## Example A: Out-of-line strategy, zero type exports

### `my-op.def.ts`

```ts
import { Type, defineOp } from "@swooper/mapgen-core/authoring";

export const MyOpDef = defineOp({
  kind: "compute",
  id: "ecology/biomes/classify",
  input: Type.Object({ /* ... */ }),
  output: Type.Object({ /* ... */ }),
});
```

### `strategies/default.ts`

```ts
import { Type, createStrategy } from "@swooper/mapgen-core/authoring";
import { MyOpDef } from "../my-op.def.js";

const DefaultConfig = Type.Object({
  seed: Type.Integer({ default: 0 }),
});

export const defaultStrategy = createStrategy(MyOpDef, {
  config: DefaultConfig,

  resolveConfig: (cfg, settings) => {
    // cfg is Static<typeof DefaultConfig>
    // settings is Settings (domain-scoped), not engine RunSettings
    return cfg;
  },

  run: (input, cfg) => {
    // input is Static<typeof MyOpDef.input>
    // cfg is Static<typeof DefaultConfig>
    return { /* must satisfy Static<typeof MyOpDef.output> */ };
  },
});
```

### `index.ts`

```ts
import { createOp } from "@swooper/mapgen-core/authoring";
import { MyOpDef } from "./my-op.def.js";
import { defaultStrategy } from "./strategies/default.js";

export const myOp = createOp(MyOpDef, {
  strategies: {
    default: defaultStrategy,
  },
});
```

## Example B: Multi-strategy op, each strategy gets correct cfg type

### `strategies/fast.ts`

```ts
import { Type, createStrategy } from "@swooper/mapgen-core/authoring";
import { MyOpDef } from "../my-op.def.js";

const FastConfig = Type.Object({
  seed: Type.Integer({ default: 0 }),
  maxIters: Type.Integer({ default: 50 }),
});

export const fastStrategy = createStrategy(MyOpDef, {
  config: FastConfig,
  run: (input, cfg) => {
    // cfg is Static<typeof FastConfig>
    return { /* ... */ };
  },
});
```

### `index.ts`

```ts
import { createOp } from "@swooper/mapgen-core/authoring";
import { MyOpDef } from "./my-op.def.js";
import { defaultStrategy } from "./strategies/default.js";
import { fastStrategy } from "./strategies/fast.js";

export const myOp = createOp(MyOpDef, {
  strategies: {
    default: defaultStrategy,
    fast: fastStrategy,
  },
});
```

Derived op config type becomes:

* `{ strategy: "default"; config: Static<typeof DefaultConfig> }`
* `{ strategy: "fast"; config: Static<typeof FastConfig> }`

…exactly as you want.

---

# Migration plan (pragmatic)

## Phase 1 (additive, no breakage)

1. Introduce `defineOp` (IO-only) + new two-arg `createStrategy(opDef, def)` overload.
2. Update `OpStrategy`/`DomainOp` to be `Settings`-generic and **stop importing engine RunSettings**.
3. Add `createOp(opDef, opts)` overload while keeping existing `createOp({ kind,id,input,output,strategies })`.

Docs: update canonical examples to:

* define op def in `*.def.ts`
* strategies in `strategies/*.ts` use `createStrategy(MyOpDef, ...)`
* op `index.ts` calls `createOp(MyOpDef, { strategies })`

## Phase 2 (guided migration)

* Convert existing ops gradually:

  * Extract `kind/id/input/output` into `op.def.ts`
  * Move config schema into strategies (especially default)
  * Replace `createStrategy({...} satisfies OpStrategy<...>)` with `createStrategy(opDef, {...})`

## Phase 3 (deprecate old shapes)

* Deprecate:

  * `createStrategy(strategyOnly)` (identity helper)
  * `defineOpSchema({ input, config, output })` as “canonical” (keep as convenience if you must, but stop implying default config semantics)

---

# Known limitations / edge cases (what remains unavoidable)

1. **Out-of-line strategies must import opDef (or IO types)**

   * This is the core TS constraint; without context, `run(input, cfg)` params can’t be inferred.

2. **If you widen schemas, you lose inference**

   * If someone writes `export const Cfg: TSchema = ...`, then cfg becomes `Static<TSchema>` (effectively useless).
   * Fix: don’t widen; or provide a `defineSchema(...)` pinning helper (you already have `defineOpSchema`; you’d add `defineConfigSchema` if needed).

3. **Settings typing requires one place to bind the domain settings type**

   * Either per domain (recommended) or keep `unknown`.
   * Engine-side adapter is required if runtime settings differ.

---

# Patch sketch (not a PR)

## Files to edit

* `packages/mapgen-core/src/authoring/op/strategy.ts`

  * Remove import of engine `RunSettings`
  * Add `Settings` generic param to `OpStrategy`
  * Update `createStrategy` to the new `(opDef, strategyDef)` signature (and optionally keep deprecated identity overload temporarily)

* `packages/mapgen-core/src/authoring/op/types.ts`

  * Add `Settings` generic to `DomainOp`
  * Update `resolveConfig` to take `Settings`

* `packages/mapgen-core/src/authoring/op/create.ts`

  * Add overload `createOp(opDef, opts)`
  * Internally unify to existing runtime implementation (no semantic change)

* `packages/mapgen-core/src/authoring/op/define.ts` (new) or `packages/mapgen-core/src/authoring/schema.ts`

  * Add `defineOp` (IO-only)
  * (Optionally keep `defineOpSchema` but mark as legacy convenience)

* Docs:

  * Update references and examples to show `*.def.ts` + `createStrategy(opDef, ...)`

## Representative diff hunk (illustrative only)

```diff
// packages/mapgen-core/src/authoring/op/strategy.ts
-import type { RunSettings } from "@mapgen/engine/execution-plan.js";
+// no engine import

 export type OpStrategy<ConfigSchema extends TSchema, Input, Output, Settings = unknown> = Readonly<{
   config: ConfigSchema;
-  resolveConfig?: (config: Static<NoInfer<ConfigSchema>>, settings: RunSettings) => Static<NoInfer<ConfigSchema>>;
+  resolveConfig?: (config: Static<NoInfer<ConfigSchema>>, settings: Settings) => Static<NoInfer<ConfigSchema>>;
   run: (input: Input, config: Static<NoInfer<ConfigSchema>>) => Output;
 }>;

-export function createStrategy<ConfigSchema extends TSchema, Input, Output>(strategy: OpStrategy<...>) { ... }
+export function createStrategy(opDef, strategyDef) { return strategyDef; }
```

---

# Bottom line

You can make this feel “normal” again by:

* **Removing config from the op schema entirely** (op def is IO-only).
* Making `createStrategy` a **single simple factory**: `createStrategy(opDef, { config, run, resolveConfig? })`.
* Fixing the boundary by making `settings` **domain-generic** and adapting from runtime at the step/engine boundary.
* Keeping inline POJO strategies as the “best path” (unchanged).

If you want, I can also propose a clean naming scheme (`defineOpIO`, `defineOp`, `createOp`, `createStrategy`) and a folder convention that prevents import cycles in practice, but the design above is the minimal coherent core.
