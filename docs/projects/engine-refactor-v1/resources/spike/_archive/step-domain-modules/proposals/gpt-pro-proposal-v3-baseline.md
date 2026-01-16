Note: I can still access the U14 repomix bundle and your prior proposal markdown in this session; some other previously-uploaded bundles appear to have expired. The design below is grounded in the U14 excerpts you provided and is self-contained. If you want me to align examples precisely to additional domain code not present in that bundle, you’ll need to re-upload those files.

---

# Contract-first Ops and Strategy Implementations

## 1) Original problem: context and root cause

### What you’re trying to achieve

You have a “hard-path” authoring model where:

* Ops are strategy-centric: `run` lives on strategies.
* Plan-truth op config is *always* the envelope `{ strategy, config }`.
* `createOp` derives:

  * a union schema over strategies: `{ strategy: Literal(id), config: <schema> }`
  * `defaultConfig = { strategy: "default", config: defaultedInner }`
  * a dispatcher `op.resolveConfig(envelope, settings)` that calls per-strategy `resolveConfig(inner, settings)` (if present).

This is explicitly documented as the repo-wide “U14” hard-path: stable `default` strategy id; uniform envelope; resolution at strategy level; no optional discriminator behavior.

### What was broken (DX)

You’ve been fighting **TypeScript contextual typing**: when a strategy is defined out-of-line (exported from a different module), its object literal doesn’t get contextual typing from the later place it’s consumed. That breaks inference for `run(input, cfg)` and `resolveConfig(cfg, settings)` unless authors:

* export `Static<typeof Schema>` aliases,
* pass explicit generics,
* or manually annotate callback params.

You already built `defineOpSchema` specifically because “TypeBox object inference can be lossy across package boundaries,” and you needed a helper to “pin” schema types so downstream callers can reuse `schema.properties.*` without re-exporting types.

That same “pinning + contextual typing” reality is the underlying problem for exported strategies.

### Architectural boundary violation that amplifies the pain

Your authoring-layer op surface currently imports the engine’s `RunSettings` and threads it into strategy resolution:

* `createOp` imports `RunSettings` from the engine package and defines `resolveConfig(..., settings: RunSettings)`.
* Steps also see `RunSettings` at the authoring type boundary (`Step.resolveConfig?: (config, settings: RunSettings) => ...`).

Even if steps are “runtime-side,” domain ops/strategies being forced to depend on an engine-owned type undermines the intended layering.

### Root cause summary

1. **TS contextual typing does not flow “backwards” into exported objects**. Out-of-line strategies must receive typing context at definition time.
2. **TypeBox schema inference can widen across package boundaries**; you already use “pinning helpers” to fight that, so the solution must be consistent with that pattern.
3. **`RunSettings` in the authoring strategy surface is a boundary leak** that forces cross-layer type coupling.

---

## 2) Canonical architecture: contract-first, then implementations

This is the “oRPC-style” split adapted to your op/strategy model:

* **Contract-first**: define *what* an op is (IO + strategy ids + config schemas), with *no* algorithmic implementation.
* **Implementation**: define *how* a strategy runs/resolves, attached to an existing contract.
* **Router composition**:

  * per-op: `contract` + `strategies` ⇒ implemented `op`
  * per-domain: `contracts router` + `ops router` ⇒ stable domain API surface

This mirrors the core contract-first idea in oRPC: define the contract first, then attach handlers later, then build a router that enforces the contract.

### Why this directly solves your complaints

* No “default config baked into op schema”: the **contract** contains schemas, not values. `defaultConfig` remains **derived** exactly as it is today from the default strategy’s config schema using your existing defaulting logic (`Value.Default`/`Convert`/`Clean`).
* You can swap “what algorithm is default” by changing the **implementation** of the `"default"` strategy without changing the contract (as long as the config schema remains the same). Your stable-id requirement already encodes this intent.
* One canonical `createStrategy`: the strategy module imports the contract and attaches an implementation; it gets the config type from the contract’s schema immediately (contextual typing happens inside the strategy module).
* Better composability: steps can import either:

  * implemented ops for execution; and/or
  * contracts for UIs, plan builders, validation tooling, etc. (without pulling implementation code).

### The key design decision

**The operation contract owns the strategy config schemas.**
Strategies do not “declare config”; they “implement strategy behavior for an already-declared config.”

That is the thing you were asking for (and is closest to oRPC’s contract-first approach): you can define the full envelope space for an op in one place.

---

## 3) Proposed authoring API (types + runtime surface)

This section is intentionally concrete: these are the exact shapes that make TS inference “obvious” and stable.

### 3.1 Domain settings: remove `RunSettings` from domain ops/strategies

**Design:** the authoring SDK becomes generic over a *domain-defined* `Settings` type. The engine owns `RunSettings`. Steps (or an integration layer) map `RunSettings → DomainSettings`.

This is the clean boundary inversion you described.

#### Settings token (bind once, no generics at callsites)

```ts
// packages/mapgen-core/src/authoring/op/settings.ts
export type SettingsToken<S> = { readonly __settings?: (s: S) => S };

export const defineSettings = <S = unknown>(): SettingsToken<S> =>
  ({} as any);
```

### 3.2 Op contract: IO + strategy config schemas

```ts
import type { Static, TSchema } from "typebox";
import type { DomainOpKind } from "./types.js";
import type { SettingsToken } from "./settings.js";

export type StrategyConfigSchemas = Readonly<Record<string, TSchema>>;

export type OpContract<
  Kind extends DomainOpKind,
  Id extends string,
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Settings,
  Strategies extends StrategyConfigSchemas & { default: TSchema }
> = Readonly<{
  kind: Kind;
  id: Id;
  input: InputSchema;
  output: OutputSchema;

  // purely type-level binding
  settings: SettingsToken<Settings>;

  // contract says which strategies exist and what their inner config schema is
  strategies: Strategies;
}>;

export function defineOp<
  const Kind extends DomainOpKind,
  const Id extends string,
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  Settings,
  const Strategies extends StrategyConfigSchemas & { default: TSchema }
>(def: OpContract<Kind, Id, InputSchema, OutputSchema, Settings, Strategies>): typeof def {
  return def;
}
```

Key point: `defineOp` is the contract equivalent of your existing `defineOpSchema` “pinning helper.” You already do this because inference gets lossy across boundaries.

### 3.3 Strategy implementation: `createStrategy(contract, id, impl)`

A strategy module should not need to export any `Static<>` types.

```ts
import type { Static, TSchema } from "typebox";
import type { OpContract } from "./contract.js";

// optional "brand" to tie strategy to the contract/id without runtime cost
declare const __strategyBrand: unique symbol;

type NoInfer<T> = [T][T extends any ? 0 : never];

export type StrategyImpl<Input, Config, Output, Settings> = Readonly<{
  resolveConfig?: (config: Config, settings: Settings) => Config;
  run: (input: Input, config: Config) => Output;
}>;

export type StrategyImplFor<
  C extends OpContract<any, any, any, any, any, any>,
  Id extends keyof C["strategies"] & string
> =
  & StrategyImpl<
      Static<C["input"]>,
      Static<NoInfer<C["strategies"][Id]>>,
      Static<C["output"]>,
      C extends OpContract<any, any, any, any, infer S, any> ? S : unknown
    >
  & { readonly [__strategyBrand]?: { contract: C; id: Id } };

export function createStrategy<
  const C extends OpContract<any, any, any, any, any, any>,
  const Id extends keyof C["strategies"] & string
>(
  contract: C,
  id: Id,
  impl: StrategyImplFor<C, Id>
): StrategyImplFor<C, Id> {
  return impl;
}
```

What this buys you:

* **Out-of-line inference works** because `impl` is contextually typed by `StrategyImplFor<C, Id>` right where it’s authored.
* The strategy file only imports a single thing: the contract handle.
* No generics, no Static aliases, no manual annotation.

### 3.4 createOp: finalize an implemented op from a contract + strategy impls

This preserves your existing runtime semantics:

* `default` strategy required and non-empty strategies enforced (already runtime-enforced).
* config schema union derived as union of envelopes (same as today).
* `defaultConfig` derived by defaulting `strategies.default` inner config. (same as today).
* `resolveConfig` dispatch unwraps → resolves inner → rewraps (same as today).

```ts
import { Type } from "typebox";
import type { Static } from "typebox";
import { buildDefaultConfigValue } from "./defaults.js";
import type { CustomValidateFn } from "../validation.js";
import type { OpContract } from "./contract.js";
import type { StrategyImplFor } from "./strategy.js";

// envelope type derived from the contract
export type EnvelopeFor<C extends OpContract<any, any, any, any, any, any>> = {
  [K in keyof C["strategies"] & string]:
    Readonly<{ strategy: K; config: Static<C["strategies"][K]> }>;
}[keyof C["strategies"] & string];

type StrategyImplsFor<C extends OpContract<any, any, any, any, any, any>> = {
  [K in keyof C["strategies"] & string]: StrategyImplFor<C, K>;
};

export function createOp<
  const C extends OpContract<any, any, any, any, any, any>
>(
  contract: C,
  opts: Readonly<{
    strategies: StrategyImplsFor<C>;
    customValidate?: CustomValidateFn<Static<C["input"]>, EnvelopeFor<C>>;
  }>
) {
  const ids = Object.keys(contract.strategies);

  // derived defaults exactly as today
  const defaultInnerConfig = buildDefaultConfigValue(contract.strategies.default) as any;
  const defaultConfig = { strategy: "default", config: defaultInnerConfig } as const;

  // derived union schema exactly as today, but using contract schemas
  const configCases = ids.map((id) =>
    Type.Object(
      {
        strategy: Type.Literal(id),
        config: (contract.strategies as any)[id],
      },
      { additionalProperties: false }
    )
  );

  const configSchema = Type.Union(configCases as any, { default: defaultConfig });

  // dispatcher uses strategy impl map
  const resolveConfig = (cfg: any, settings: any) => {
    const selected = (opts.strategies as any)[cfg.strategy];
    if (!selected?.resolveConfig) return cfg;
    return { strategy: cfg.strategy, config: selected.resolveConfig(cfg.config, settings) };
  };

  const run = (input: any, cfg: any) => {
    const selected = (opts.strategies as any)[cfg.strategy];
    return selected.run(input, cfg.config);
  };

  // attachValidationSurface(...) as today
  // return { kind, id, input, output, config: configSchema, defaultConfig, resolveConfig, run, strategies: opts.strategies, ... }
}
```

---

## 4) Canonical domain directory and module shape

This is the part that makes the architecture *obvious* to authors and prevents import cycles.

### 4.1 Canonical directory structure (per domain)

**Rule of thumb:** “Contracts depend on schemas; strategies depend on contracts; ops depend on contracts + strategies; steps depend on ops (runtime side).”

```
src/domain/<domain>/
  settings.ts                 # DomainSettings type + adapter from RunSettings (runtime boundary)
  contracts.ts                # Domain contract router (export-only)
  ops.ts                      # Domain implemented op router (export-only)
  index.ts                    # Re-export { settings, contracts, ops }

  ops/<op-name>/
    contract.ts               # input/output + strategy config schemas (no implementations)
    strategies/
      default.ts              # createStrategy(contract, "default", impl)
      <other>.ts
    index.ts                  # createOp(contract, { strategies })
    schema/                   # optional: schema fragments used by contract.ts
```

### 4.2 Why this structure is enforceable

It aligns cleanly with dependency direction:

* `contract.ts` must not import `strategies/*` (no cycles).
* `strategies/*` must import `contract.ts` (gives TS the context needed for inference).
* `ops/<op>/index.ts` imports both to produce the final `DomainOp`.
* `domain/contracts.ts` aggregates contracts (no implementations).
* `domain/ops.ts` aggregates implemented ops (runtime surface).

This is essentially the same split oRPC encourages: contract router defined separately, then implementation attaches handlers, then router assembled.

### 4.3 Single-file vs multi-file

You can absolutely do an op in **one file** if it’s small:

* Put `contract`, strategies (inline or via `createStrategy`), and `createOp` in the same file.
* The directory structure is still canonical; you’re just collapsing the module boundaries.

However, the moment you want out-of-line exported strategies, **you need a contract artifact** (or some other typed handle) because TS won’t infer callback params without contextual typing at definition time.

---

## 5) End-to-end illustrative example (single and multi-strategy)

Below is an example slice that mirrors your current repo patterns (domain ops used by steps, step schemas composed from `op.config` and defaults). The mechanics are consistent with how steps compose configs today.

### 5.1 Domain settings and adapter (fix `RunSettings` boundary)

```ts
// src/domain/ecology/settings.ts
import type { RunSettings } from "@mapgen/engine/execution-plan.js";

export type EcologySettings = {
  // domain-owned knobs; stable and testable
  climateProfile: "earthlike" | "arid" | "wet";
  biomeNoiseScale: number;
};

// runtime boundary adapter (steps call this)
export function ecologySettingsFromRunSettings(rs: RunSettings): EcologySettings {
  return {
    climateProfile: rs.profile as any,
    biomeNoiseScale: rs.tunables?.biomeNoiseScale ?? 1,
  };
}
```

Domain ops/strategies never import `RunSettings` now; only the runtime integration points do (steps/recipes), which already depend on it today.

### 5.2 Multi-strategy op: `classifyBiomes`

#### `ops/classify-biomes/contract.ts`

```ts
import { Type } from "typebox";
import { defineSettings } from "@swooper/mapgen-core/authoring/op/settings";
import { defineOp } from "@swooper/mapgen-core/authoring/op/contract";
import type { EcologySettings } from "../../settings";

// (schemas can be composed from fragments as you already do in this op)
const Input = Type.Object({ /* ... */ });
const Output = Type.Object({ /* ... */ });

const DefaultCfg = Type.Object({
  moistureWeight: Type.Number({ default: 1 }),
  temperatureWeight: Type.Number({ default: 1 }),
}, { additionalProperties: false });

const FastCfg = Type.Object({
  maxIterations: Type.Integer({ default: 20 }),
}, { additionalProperties: false });

export const classifyBiomesContract = defineOp({
  kind: "compute",
  id: "ecology/classifyBiomes",
  input: Input,
  output: Output,

  settings: defineSettings<EcologySettings>(),

  strategies: {
    default: DefaultCfg,
    fast: FastCfg,
  },
} as const);
```

#### `ops/classify-biomes/strategies/default.ts`

```ts
import { createStrategy } from "@swooper/mapgen-core/authoring/op/strategy";
import { classifyBiomesContract } from "../contract";

export const defaultClassifyBiomes = createStrategy(
  classifyBiomesContract,
  "default",
  {
    resolveConfig: (cfg, settings) => {
      // cfg is Static<typeof classifyBiomesContract.strategies.default>
      // settings is EcologySettings
      return {
        ...cfg,
        moistureWeight: cfg.moistureWeight * settings.biomeNoiseScale,
      };
    },

    run: (input, cfg) => {
      // input is Static<typeof classifyBiomesContract.input>
      // cfg is Static<typeof classifyBiomesContract.strategies.default>
      return { /* must satisfy Static<typeof classifyBiomesContract.output> */ };
    },
  }
);
```

#### `ops/classify-biomes/strategies/fast.ts`

```ts
import { createStrategy } from "@swooper/mapgen-core/authoring/op/strategy";
import { classifyBiomesContract } from "../contract";

export const fastClassifyBiomes = createStrategy(
  classifyBiomesContract,
  "fast",
  {
    run: (input, cfg) => {
      // cfg is Static<typeof classifyBiomesContract.strategies.fast>
      return { /* ... */ };
    },
  }
);
```

#### `ops/classify-biomes/index.ts`

```ts
import { createOp } from "@swooper/mapgen-core/authoring/op/create";
import { classifyBiomesContract } from "./contract";
import { defaultClassifyBiomes } from "./strategies/default";
import { fastClassifyBiomes } from "./strategies/fast";

export const classifyBiomes = createOp(classifyBiomesContract, {
  strategies: {
    default: defaultClassifyBiomes,
    fast: fastClassifyBiomes,
  },
});
```

Result:

* `classifyBiomes.config` is the derived envelope union schema (as required).
* `classifyBiomes.defaultConfig` is `{ strategy: "default", config: <defaultedDefaultCfg> }` derived by your existing mechanism.
* Strategy modules got full inference, out-of-line, without exported type aliases.

### 5.3 Single-strategy op: `planFloodplains` (default-only)

Your repo already models this op today with a single `default` strategy and uses it in tests/steps via `defaultConfig` and `config` schema. 

Contract-first version is straightforward:

#### `ops/plan-floodplains/contract.ts`

```ts
import { defineOp } from "@swooper/mapgen-core/authoring/op/contract";
import { defineSettings } from "@swooper/mapgen-core/authoring/op/settings";
import { PlanFloodplainsSchema } from "./schema"; // existing defineOpSchema bundle
import type { PlacementSettings } from "../../settings";

export const planFloodplainsContract = defineOp({
  kind: "plan",
  id: "placement/planFloodplains",
  input: PlanFloodplainsSchema.properties.input,
  output: PlanFloodplainsSchema.properties.output,

  settings: defineSettings<PlacementSettings>(),

  strategies: {
    default: PlanFloodplainsSchema.properties.config,
  },
} as const);
```

#### `ops/plan-floodplains/index.ts`

```ts
import { createOp } from "@swooper/mapgen-core/authoring/op/create";
import { planFloodplainsContract } from "./contract";

export const planFloodplains = createOp(planFloodplainsContract, {
  customValidate: (_input, cfg) => {
    // cfg is { strategy: "default", config: ... } (envelope)
    if (cfg.config.maxLength < cfg.config.minLength) {
      return [{ path: "/config/config/maxLength", message: "..." }];
    }
    return [];
  },

  strategies: {
    default: {
      run: (_input, cfg) => ({ minLength: cfg.minLength, maxLength: cfg.maxLength }),
    },
  },
});
```

This preserves the “planFloodplains customValidate reads envelope config.config.*” pattern present today.

### 5.4 Step integration (runtime boundary: adapt RunSettings once)

Current steps pass `RunSettings` into `op.resolveConfig(...)` repeatedly.

Under the new boundary, steps do:

```ts
import * as ecology from "@mapgen/domain/ecology";
import { ecologySettingsFromRunSettings } from "@mapgen/domain/ecology/settings";

resolveConfig: (config, runSettings) => {
  const s = ecologySettingsFromRunSettings(runSettings);
  return {
    featuresPlacement: ecology.ops.planFeaturePlacements.resolveConfig(config.featuresPlacement, s),
    reefEmbellishments: ecology.ops.planReefEmbellishments.resolveConfig(config.reefEmbellishments, s),
    vegetationEmbellishments: ecology.ops.planVegetationEmbellishments.resolveConfig(config.vegetationEmbellishments, s),
  };
}
```

This preserves the step’s structure while eliminating the domain dependency on engine settings.

---

## 6) Limitations and edge cases

### 6.1 Unavoidable: strategies must import a typed handle

Out-of-line strategy inference cannot be “magic.” Without contextual typing at the point of definition, TS will not infer callback parameter types. That’s the reason `createStrategy(contract, id, impl)` exists.

### 6.2 Schema widening still breaks inference

If someone writes:

```ts
export const Cfg: TSchema = Type.Object({ ... });
```

then `Static<typeof Cfg>` becomes `Static<TSchema>` (useless). This is the same “pinning” issue you already address with `defineOpSchema`.

**Guardrail:** discourage explicit `: TSchema` annotations for exported schemas; prefer `const Cfg = Type.Object(...)` or `defineConfigSchema(...)` if you add a pinning helper.

### 6.3 Contract drift vs implementation drift

Because contracts now declare the strategy universe, adding/removing a strategy is a contract change. That’s by design: it’s a breaking contract surface, just like adding/removing a procedure in an API contract.

### 6.4 Swapping “default strategy”

If you mean “change the algorithm behind the default,” that’s easy: replace the `"default"` implementation, contract unchanged.

If you mean “rename which strategy id is considered default,” that *is* a contract change (and also contradicts the stable-id requirement you already committed to). Your U14 spec requires a `"default"` strategy. 

---

## 7) Patterns to guard or lint against

### 7.1 Enforce dependency direction (prevents cycles, preserves boundaries)

Add ESLint `no-restricted-imports` rules:

1. **Domain contracts / strategies must not import engine**

* Disallow imports matching:

  * `@mapgen/engine/*`
  * `@swooper/mapgen-core/src/authoring/*` (if you want domain packages to consume the public entrypoints only)

2. **Contract files must not import implementations**

* Disallow within `**/ops/**/contract.ts` importing:

  * `./strategies/*`
  * `./index*`

3. **Strategies must not import op index**

* Disallow within `**/ops/**/strategies/*` importing `../index*`

4. **Steps should import domain routers, not deep op internals**

* Encourage imports from `@mapgen/domain/<domain>` only (where `domain/index.ts` re-exports `ops`).

Also add `import/no-cycle` to detect accidental cycles early.

### 7.2 Enforce “default strategy exists” at contract definition time

Your current runtime throws if strategies are missing or `"default"` is absent.

With contract-first, you should enforce the same constraint in `defineOp`’s type and (optionally) runtime assertion. Type-level enforcement: `Strategies extends { default: TSchema }`.

### 7.3 Guard against config schema duplication

Because contract owns config schemas, strategy impls should not accept/declare config schema. If you see a strategy defining `config: ...`, that’s a smell in this architecture.

---

## 8) Migration plan (implementation-level) with acceptance criteria and tests

This is a staged migration that avoids destabilizing the system.

### Phase 0 — Additive primitives (no callsite breakage)

**Implement**

* Add new modules:

  * `authoring/op/settings.ts` (`defineSettings`)
  * `authoring/op/contract.ts` (`defineOp`, `OpContract` types)
* Update `authoring/op/strategy.ts`:

  * introduce `createStrategy(contract, id, impl)` as above
  * keep existing `createStrategy(strategyObj)` as deprecated alias for a short window if needed
* Add `createOp(contract, opts)` overload while keeping existing `createOp({ ...strategies... })` temporarily.

**Acceptance criteria**

* Existing U14 tests still pass (op-validation, plan-ops, classify-biomes). Your tests currently depend heavily on `.defaultConfig` and envelope validation, so this is non-negotiable.
* No behavior change in derived envelope schema or `defaultConfig` derivation: still derived via the same code path (Value.Default/Convert/Clean).

### Phase 1 — Fix the boundary: remove engine `RunSettings` from domain ops/strategies

**Implement**

* Make `OpStrategy` and `DomainOp` generic over `Settings`, and remove the engine import from authoring op modules.

  * Today `createOp` imports `RunSettings` from engine. That must go.
* Domain ops choose a `DomainSettings` type via `defineSettings<DomainSettings>()` in each contract.

**Update runtime integration points**

* Steps that call `op.resolveConfig(config, settings)` must now adapt once per domain (or once per step) from `RunSettings → DomainSettings`. The current step pattern is visible in your repomix excerpt.

**Acceptance criteria**

* Domain strategy modules compile without importing engine types.
* All step resolve paths still function and tests pass.

### Phase 2 — Convert domain ops to contract-first (target: one domain first)

Pick one domain (ecology is a good target because it already composes multiple ops inside steps).

**Implement**

* For each op:

  * Create `contract.ts` defining IO + strategy config schemas.
  * Convert strategy files to `createStrategy(contract, id, impl)` (or inline in `index.ts` for simple default-only cases).
  * Convert op `index.ts` to `createOp(contract, { strategies })`.

**Acceptance criteria**

* No change in runtime config schema shape: still envelope union. (You can assert this via `op.config` snapshots or by continuing to run the existing plan/step tests that depend on it.)
* No new type exports needed in strategy modules.

### Phase 3 — Introduce domain routers (contracts + ops)

**Implement**

* `src/domain/<domain>/contracts.ts`: export contract router
* `src/domain/<domain>/ops.ts`: export implemented ops router
* `src/domain/<domain>/index.ts`: export `{ settings, contracts, ops }`

Optionally introduce helper types:

* `OpRouterForContracts<typeof contracts>` to ensure you implemented everything declared.

**Acceptance criteria**

* Steps import from `@mapgen/domain/<domain>` and use `domain.ops.*`.
* A build that imports only `domain.contracts` does not pull implementation code (useful for tooling).

### Phase 4 — Deprecate legacy authoring shapes

Once migrated:

* Deprecate/remove the “strategy object includes config schema” variant of createStrategy if it still exists.
* Keep `defineOpSchema` as a utility for legacy schema bundling, but stop framing it as the canonical op authoring shape (it can remain useful for single-strategy ops or schema organization).

### Tests to add (beyond existing runtime tests)

Because TS inference regressions often won’t show up in runtime tests:

1. **Type tests**

* Add a `tsconfig.type-tests.json` that includes `test-dts/**/*.ts`.
* Add “compile-only” tests with `// @ts-expect-error` assertions:

  * attaching a strategy with the wrong id should fail
  * `cfg` inside strategy should be the correct `Static<typeof contract.strategies[id]>`
  * `settings` type inside strategy should be `DomainSettings`

2. **Contract/implementation mismatch tests**

* If you add the optional brand in `StrategyImplFor`, test that a strategy from another contract fails assignment.

---

## 9) Patch sketch (representative files + diffs)

This is not a PR; it’s a map of the minimum edit surface.

### Files to add

* `packages/mapgen-core/src/authoring/op/settings.ts`
* `packages/mapgen-core/src/authoring/op/contract.ts`

### Files to edit

* `packages/mapgen-core/src/authoring/op/strategy.ts`

  * Add `createStrategy(contract, id, impl)` and new `StrategyImplFor` type.
* `packages/mapgen-core/src/authoring/op/types.ts`

  * Add contract-derived envelope types (or put them in `contract.ts`).
  * Make `DomainOp` generic over Settings (remove engine `RunSettings` dependency).
* `packages/mapgen-core/src/authoring/op/create.ts`

  * Add overload `createOp(contract, opts)`.
  * Internally derive `config` union and `defaultConfig` from **contract.strategies** (same algorithm as today).
  * `resolveConfig` dispatch uses strategy impls; signature uses `Settings` not `RunSettings`.
* `packages/mapgen-core/src/authoring/op/index.ts`

  * Re-export `defineOp`, `defineSettings`, etc.

### Representative diff hunk (conceptual)

```diff
// packages/mapgen-core/src/authoring/op/create.ts
-import type { RunSettings } from "@mapgen/engine/execution-plan.js";
+// no engine import

-const resolveConfig = (cfg: StrategySelection<typeof strategies>, settings: RunSettings) => {
+const resolveConfig = (cfg: EnvelopeFor<typeof contract>, settings: SettingsOf<typeof contract>) => {
  ...
}
```

```diff
// packages/mapgen-core/src/authoring/op/strategy.ts
-export function createStrategy(strategy: OpStrategy<any, any, any>) { return strategy; }
+export function createStrategy(contract, id, impl) { return impl; }
```

---

# Bottom line

If the goal is “obvious, contract-first authoring with clean boundaries and excellent inference,” the simplest coherent system is:

1. **Op contract** declares IO + strategy config schemas (no implementations).
2. **Strategy modules** implement strategies against a contract via `createStrategy(contract, id, impl)`.
3. **Op module** composes implementations with `createOp(contract, { strategies })`, preserving your existing envelope semantics and defaultConfig derivation. 
4. **Domain index** exports `contracts` and `ops` routers (oRPC-style), making imports obvious and future multi-domain composition straightforward.
5. **Engine boundary** stays clean: `RunSettings` is adapted in steps/integration code, not pulled into domain strategies.

If you want, I can also provide a “minimal set of lint rules” JSON snippet (`no-restricted-imports` + `import/no-cycle`) that exactly encodes the layering constraints above.
