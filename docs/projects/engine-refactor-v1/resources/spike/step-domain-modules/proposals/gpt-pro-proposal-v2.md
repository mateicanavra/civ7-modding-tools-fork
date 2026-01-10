A quick note before the main doc: the file-browsing tool in this chat can no longer re-open some previously uploaded bundles. If you want me to quote or cross‑reference additional repo excerpts beyond what we’ve already been discussing, please re-upload them. I can still provide a complete proposal and canonical structure now.

---

# Domain Operation Contracts + Strategy Implementations

## A contract-first, boundary-clean, type-safe authoring model with an “obvious” directory shape

### Executive intent

Make authoring feel like a standard Strategy pattern again—simple, predictable, contract-first—while preserving your non‑negotiables:

* operation config at the step boundary is always `{ strategy, config }` (envelope)
* config schema for the envelope is derived from strategies (union)
* a `default` strategy always exists
* `resolveConfig` is per-strategy and operates on **inner config**
* inline strategies remain perfectly inferred (zero boilerplate)
* out-of-line strategies remain perfectly inferred without exported `Static<>` aliases or explicit generics

This document also proposes **a canonical on-disk domain structure** that makes the boundaries obvious, prevents import cycles, and makes “contract vs implementation” feel as natural as a router/handler system (like oRPC’s contract-first flow). ([oRPC][1])

---

## 1) Original problem: context and root cause

### Context

You have a domain/step architecture where steps orchestrate execution and domain ops encapsulate reusable computation/plan logic. Each op supports multiple **strategies** (algorithm variants) that share the same input/output schema. The plan-truth config is always an envelope:

```ts
{ strategy: "<strategyId>", config: <innerStrategyConfig> }
```

### What broke DX

Two independent issues compounded:

1. **TypeScript contextual typing does not propagate “backwards” into exported objects.**
   When a strategy is defined out-of-line and exported as a plain object, TypeScript cannot later use `createOp({ strategies: { ... } })` to contextualize the function parameters inside that exported strategy. So authors lose `cfg` inference and start exporting `Static<>` aliases or writing explicit generics. This is the same underlying phenomenon described in TypeScript’s own handbook explanation of contextual typing. ([typescriptlang.org][2])

2. **Boundary leakage via `RunSettings`.**
   `resolveConfig(config, settings: RunSettings)` couples domain strategy modules to the runtime engine’s settings type. That violates your intended dependency direction: domain logic should not depend on a concrete engine context type.

### Why it feels “overcomplicated”

When you try to compensate for (1) purely with types, it tends to produce:

* curried helpers
* schema bundles that mix IO + config “default strategy” assumptions
* multiple authoring shapes

This is not a novel algorithmic problem. It’s a classic Strategy pattern scenario (context delegates to interchangeable strategies behind a stable interface). ([Refactoring Guru][3])
The uniqueness is primarily *TypeScript inference + out-of-line exports* plus *schema-derived config*.

---

## 2) Canonical architecture (contract-first, oRPC-style separation)

### Key design principle

**Separate “contract” from “implementation.”**

* **Contract**: stable, shareable, implementation-free description of an operation’s IO and identity.
* **Implementation**: strategies + derived config envelope + runtime execution hooks.

This mirrors the contract-first approach in oRPC: define contract first, implement later, then assemble a router. ([oRPC][1])

### Terminology (recommended)

* **Op Contract** (instead of “op schema”): describes `kind`, `id`, `input schema`, `output schema` only.
* **Strategy**: defines `config schema`, `resolveConfig`, and `run`.
* **Implemented Op**: created by attaching strategies to a contract; derives envelope config schema + default config.

This explicitly removes the smell you called out:

* there is **no default config baked into the contract**
* strategies are attachable without rewiring the contract

### Architectural boundary fix: remove `RunSettings` from domain surface

Introduce a domain-facing `Settings` type parameter and an adapter layer at the runtime boundary.

* Domain strategies depend on `Settings` (domain- or app-scoped)
* Engine has `RunSettings` (runtime-scoped)
* Adapter converts `RunSettings → Settings` before calling `resolveConfig`

This makes dependency direction correct:

* domain does not import engine
* engine depends on domain, not vice versa

### Core SDK API (single canonical convention)

#### 2.1 Define the contract (IO only)

```ts
export type OpContract<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Settings = unknown
> = Readonly<{
  kind: DomainOpKind;
  id: string;
  input: InputSchema;
  output: OutputSchema;
}>

export function defineOp<
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  Settings = unknown
>(c: {
  kind: DomainOpKind;
  id: string;
  input: InputSchema;
  output: OutputSchema;
}): OpContract<InputSchema, OutputSchema, Settings>
```

#### 2.2 Define a strategy (one simple factory)

```ts
export type OpStrategy<
  ConfigSchema extends TSchema,
  Input,
  Output,
  Settings = unknown
> = Readonly<{
  config: ConfigSchema;
  resolveConfig?: (
    config: Static<ConfigSchema>,
    settings: Settings
  ) => Static<ConfigSchema>;
  run: (input: Input, config: Static<ConfigSchema>) => Output;
}>

export function createStrategy<
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  Settings,
  const ConfigSchema extends TSchema
>(
  contract: OpContract<InputSchema, OutputSchema, Settings>,
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
>
```

**This is the whole out-of-line inference story.**
The contract provides the contextual types at definition time, so `run(input, cfg)` and `resolveConfig(cfg, settings)` infer correctly, with no exported `Static<>` aliases.

#### 2.3 Implement the operation (attach strategies; derive envelope schema)

```ts
export function createOp<
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  Settings,
  const ConfigSchemas extends Readonly<Record<string, TSchema>> & { default: TSchema }
>(
  contract: OpContract<InputSchema, OutputSchema, Settings>,
  impl: {
    strategies: {
      [K in keyof ConfigSchemas & string]: OpStrategy<
        ConfigSchemas[K],
        Static<InputSchema>,
        Static<OutputSchema>,
        Settings
      >
    };
    customValidate?: CustomValidateFn<
      Static<InputSchema>,
      { strategy: string; config: unknown } // actual is derived union
    >;
  }
): DomainOp<...>
```

Runtime behavior remains exactly what you already require:

* `op.config` schema is derived union `{ strategy, config }`
* `op.defaultConfig` is derived from default strategy schema defaults
* `op.resolveConfig` dispatches to strategy-level `resolveConfig`

### Domain router (optional but strongly recommended)

Provide two exported routers per domain:

* `domain.contract` router: tree of op contracts (no logic)
* `domain.ops` router: tree of implemented ops (logic)

oRPC’s docs explicitly model contract routers as plain nested objects. ([oRPC][1])
You can do the same, with no fancy framework required.

---

## 3) Canonical domain directory structure (enforceable and “obvious”)

This is the key to making boundaries natural for authors.

### Goals of the structure

* no import cycles
* contract-first layering is visible in the filesystem
* strategies can live out-of-line without losing inference
* steps import from a stable public surface
* “domain does not depend on engine” is enforceable by lint

### Recommended canonical layout

```txt
mods/mod-*/src/domain/<domain>/
  index.ts                  # public surface: exports ops router (and optionally contract)
  settings.ts               # domain Settings type/schema + adapter from runtime
  contract.ts               # domain contract router (optional aggregator)
  ops/
    <op>/
      contract.ts           # the OpContract (IO-only, no strategy config)
      index.ts              # createOp(contract, { strategies }) => implemented op
      strategies/
        default.ts          # createStrategy(contract, { config, run, resolveConfig? })
        <name>.ts
      rules/                # pure helper functions used by strategies
      schema/               # optional: large IO schema fragments if needed
```

### Dependency direction (the “obvious” part)

* `ops/<op>/contract.ts` imports only schema fragments (TypeBox) and domain settings types
* `ops/<op>/strategies/*` imports **only** `../contract`
* `ops/<op>/index.ts` imports contract + strategies
* `domain/index.ts` imports only implemented ops (`ops/*/index`)
* **Steps import only from `domain/<domain>` public surface**, not deep op paths

This prevents cycles because strategies never import an index module that imports them.

### Can it be a single file?

Yes, but only when you don’t need out-of-line strategies.

* **Single-file op is feasible** if:

  * the op has only the default strategy
  * the strategy is inlined inside `createOp(...)`
  * you don’t export strategies separately
  * you accept that “contract-first” is less explicit

However, if you want out-of-line strategies with perfect inference, you need a contract module that strategies can import without cycling. TypeScript can’t infer types “from later usage,” so the contract must be available at strategy definition time. ([typescriptlang.org][2])

**Recommendation:** enforce the multi-file shape as canonical, and allow single-file only behind a “trivial-op” exception (linted and rare).

---

## 4) End-to-end illustrative example (single and multi-strategy)

Below is a complete slice that shows both “core paths.”

### 4.1 Domain settings: domain-owned, engine-adapted

**`src/domain/ecology/settings.ts`**

```ts
import { Type, type Static } from "@sinclair/typebox";

// Domain-facing settings (stable boundary)
export const EcologySettingsSchema = Type.Object({
  climateProfile: Type.Union([Type.Literal("realistic"), Type.Literal("arcade")]),
  biomeNoiseScale: Type.Number({ default: 1 }),
});

export type EcologySettings = Static<typeof EcologySettingsSchema>;

// Engine adapter lives here (or in integration layer)
// Converts engine RunSettings into EcologySettings.
export function adaptEcologySettings(run: { /* engine RunSettings-like */ }): EcologySettings {
  return {
    climateProfile: "realistic",
    biomeNoiseScale: 1,
  };
}
```

### 4.2 Operation contract (IO-only)

**`src/domain/ecology/ops/classify-biomes/contract.ts`**

```ts
import { Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { EcologySettings } from "../../settings.js";

export const classifyBiomesContract = defineOp({
  kind: "compute",
  id: "ecology/biomes/classify",
  input: Type.Object({
    width: Type.Integer(),
    height: Type.Integer(),
    rainfall: Type.Any(), // typed array schema in real code
    // ...
  }),
  output: Type.Object({
    biomeIndex: Type.Any(),
    vegetationDensity: Type.Any(),
    // ...
  }),
}) satisfies ReturnType<typeof defineOp<
  any, any, EcologySettings
>>;
```

(You can also encode `Settings` into `defineOp` directly via a generic or helper; the concrete mechanics aren’t the point—the point is: contract is IO-only and stable.)

### 4.3 Strategy definition (single strategy case)

**`src/domain/ecology/ops/classify-biomes/strategies/default.ts`**

```ts
import { Type, createStrategy } from "@swooper/mapgen-core/authoring";
import { classifyBiomesContract } from "../contract.js";

const DefaultConfig = Type.Object({
  seed: Type.Integer({ default: 0 }),
  moistureBias: Type.Number({ default: 0.0 }),
});

export const defaultStrategy = createStrategy(classifyBiomesContract, {
  config: DefaultConfig,

  resolveConfig: (cfg, settings) => {
    // cfg: Static<typeof DefaultConfig>
    // settings: EcologySettings
    if (settings.climateProfile === "arcade") {
      return { ...cfg, moistureBias: cfg.moistureBias + 0.1 };
    }
    return cfg;
  },

  run: (input, cfg) => {
    // input: Static<typeof classifyBiomesContract.input>
    // cfg: Static<typeof DefaultConfig>
    return {
      biomeIndex: new Uint8Array(input.width * input.height),
      vegetationDensity: new Float32Array(input.width * input.height),
    };
  },
});
```

### 4.4 Multi-strategy case: “fast” strategy with a different config schema

**`src/domain/ecology/ops/classify-biomes/strategies/fast.ts`**

```ts
import { Type, createStrategy } from "@swooper/mapgen-core/authoring";
import { classifyBiomesContract } from "../contract.js";

const FastConfig = Type.Object({
  seed: Type.Integer({ default: 0 }),
  maxIters: Type.Integer({ default: 50 }),
});

export const fastStrategy = createStrategy(classifyBiomesContract, {
  config: FastConfig,

  run: (input, cfg) => {
    // cfg: Static<typeof FastConfig>
    return {
      biomeIndex: new Uint8Array(input.width * input.height),
      vegetationDensity: new Float32Array(input.width * input.height),
    };
  },
});
```

### 4.5 Implement the op: attach strategies, derive envelope config

**`src/domain/ecology/ops/classify-biomes/index.ts`**

```ts
import { createOp } from "@swooper/mapgen-core/authoring";
import { classifyBiomesContract } from "./contract.js";
import { defaultStrategy } from "./strategies/default.js";
import { fastStrategy } from "./strategies/fast.js";

export const classifyBiomes = createOp(classifyBiomesContract, {
  strategies: {
    default: defaultStrategy,
    fast: fastStrategy,
  },
});
```

Now `classifyBiomes.config` is derived as the union:

* `{ strategy: "default"; config: Static<typeof DefaultConfig> }`
* `{ strategy: "fast"; config: Static<typeof FastConfig> }`

And `defaultConfig` is derived from DefaultConfig defaults.

### 4.6 Domain router: contract + ops (contract-first + router-like)

**`src/domain/ecology/contract.ts`**

```ts
import { classifyBiomesContract } from "./ops/classify-biomes/contract.js";

export const ecologyContract = {
  classifyBiomes: classifyBiomesContract,
  // more ops...
};
```

**`src/domain/ecology/index.ts`**

```ts
import { classifyBiomes } from "./ops/classify-biomes/index.js";
import { ecologyContract } from "./contract.js";

export const ecology = {
  contract: ecologyContract,
  ops: {
    classifyBiomes,
    // more ops...
  },
} as const;
```

This is the exact “contract router + implementation router” split oRPC advocates (contract as nested objects, implementation attached later, then router assembled). ([oRPC][1])

### 4.7 Step usage (importing from multiple domains)

**`src/recipes/.../steps/some-step/index.ts`**

```ts
import { ecology } from "../../../domain/ecology/index.js";
import { adaptEcologySettings } from "../../../domain/ecology/settings.js";

export async function runStep(ctx: { runSettings: unknown }) {
  const settings = adaptEcologySettings(ctx.runSettings);

  const op = ecology.ops.classifyBiomes;

  const planTruthConfig = op.defaultConfig; // { strategy: "default", config: ... }

  const resolved = op.resolveConfig(planTruthConfig, settings);

  const out = op.runValidated(
    { width: 10, height: 10, rainfall: new Uint8Array(100) },
    resolved
  );

  return out;
}
```

---

## 5) Heads-up limitations and edge cases

### Limitations that are genuinely unavoidable

1. **Out-of-line strategies must import some contract/context.**
   If you want `run(input, cfg)` parameters inferred inside a strategy module without annotations, you must provide contextual typing at definition time. TypeScript’s inference works from context, not from later usage. ([typescriptlang.org][2])

2. **If schemas are widened, inference degrades.**
   If authors write `export const X: TSchema = ...`, `Static<typeof X>` becomes too weak. Your tooling should discourage explicit widening.

3. **Single-file ops cannot support “out-of-line strategy modules” without cycles.**
   If a strategy imports contract from the same file that imports the strategy, you create an import cycle. The canonical structure avoids this by keeping contract in a module that never imports strategies.

### Non-obvious but important “typing guardrails”

* Avoid type assertions on the object literal passed to `createOp(...)` that disable contextual typing (your existing spec already warns about this). ([typescriptlang.org][2])

---

## 6) Patterns to guard or lint against

These are the rules that make the architecture “self-enforcing.”

### 6.1 Import boundary rules (eslint `no-restricted-imports`)

1. **Domain ops/strategies must not import engine runtime types.**

   * Ban `@mapgen/engine/*` in `src/domain/**`
   * Ban `RunSettings` imports entirely from domain code

2. **Strategies must not import `ops/<op>/index.ts`**

   * Allow only `../contract` and `../rules/*`

3. **Steps must not deep-import ops**

   * Ban imports matching `src/domain/*/ops/*/index` from step directories
   * Require step imports from `src/domain/<domain>/index` public surface

Example eslint rule sketch:

```js
{
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [
        {
          group: ["@mapgen/engine/*"],
          message: "Domain code must not depend on engine runtime modules."
        },
        {
          group: ["**/src/domain/**/ops/**/index*"],
          message: "Strategies/steps must import ops via the domain public surface, not deep paths."
        }
      ]
    }]
  }
}
```

### 6.2 Structural rules (filesystem discipline)

* Every op directory must contain:

  * `contract.ts`
  * `index.ts`
  * `strategies/` (must exist even if empty initially)
  * `rules/` (must exist even if empty initially)

These can be enforced via a repo script (your repo already uses guardrail scripts for refactors).

### 6.3 Semantic rules (type-level + runtime validation)

* `default` strategy must exist in `createOp(contract, { strategies })`
* `resolveConfig` must return a value validating against its own `config` schema
* `op.defaultConfig` must always be derived from the default strategy config schema

---

## 7) Migration plan (implementation-level)

This is designed as **additive first**, then gradual conversion, then deprecation.

### Phase 0 — Lay the foundation (no domain code changes yet)

**Goal:** introduce the new contract-first surfaces without breaking anything.

* Add `defineOp` and `OpContract` (IO only).
* Add the new canonical `createStrategy(contract, def)` signature.
* Add `createOp(contract, impl)` overload (keep the existing one temporarily).

**Acceptance criteria**

* Existing ops compile unchanged.
* New APIs compile and can be used in a pilot op.

**Tests to add**

* Type-level “expect type” tests proving:

  * out-of-line strategy `cfg` is inferred as `Static<typeof ConfigSchema>`
  * out-of-line strategy `input` is inferred as `Static<typeof contract.input>`
* Runtime tests proving:

  * derived config envelope union is correct across multiple strategies
  * default config is derived correctly

### Phase 1 — Fix the boundary: remove `RunSettings` from domain surface

**Goal:** domain code stops referencing engine types.

* Change `OpStrategy.resolveConfig` second arg from `RunSettings` → generic `Settings`.
* Change `op.resolveConfig(envelope, settings)` similarly.
* Introduce adapter function pattern:

  * Each domain exports `adapt<Domain>Settings(runSettings)` (or integration layer does it).

**Acceptance criteria**

* No imports from `@mapgen/engine/*` remain in `src/domain/**`.
* Engine builds still work by adapting settings.

**Tests to add**

* Lint test / guardrail script that fails if domain imports engine.
* One integration test calling `op.resolveConfig(...)` via adapter path.

### Phase 2 — Pilot a real domain slice with contract-first layout

Pick one op (e.g., `classify-biomes`) and migrate fully:

* Create `ops/<op>/contract.ts`
* Convert strategies to `createStrategy(contract, {...})`
* Convert op to `createOp(contract, { strategies })`
* Update domain router exports (`domain/index.ts`)

**Acceptance criteria**

* No exported `Static<>` aliases in strategy modules.
* Strategies compile with fully inferred types.
* Existing runtime behavior (validation, derived config, defaults) matches baseline tests.

### Phase 3 — Codify canonical structure and update docs/templates

* Update workflow/spec docs to state:

  * contract-first: `contract.ts` vs `index.ts`
  * strategies live under `strategies/`
* Provide a generator/template for new ops:

  * scaffolds contract, index, strategies dirs

### Phase 4 — Migrate remaining ops opportunistically

* Convert as domains are touched; do not require a big-bang change.
* For each op migrated:

  * remove old helper types/generics in that op
  * ensure tests still pass
  * enforce lint rules

### Phase 5 — Deprecate legacy authoring shapes

Once the majority is migrated:

* Deprecate (but don’t instantly delete):

  * `defineOpSchema({ input, config, output })` as a canonical pattern (keep for legacy)
  * `createStrategy(strategyOnly)` identity helper
  * any schema helpers whose primary purpose was compensating for inference loss

---

## 8) Why the oRPC-style contract-first approach is a good fit here

**Similarities**

* You want a stable, implementation-free **contract** that can be exported safely.
* You want implementations that are type-checked against that contract.
* You want a router-like public surface (domain ops catalog).

This is exactly the workflow oRPC documents: define contract router, implement contract, then assemble the router. ([oRPC][1])

**Differences (and why you still keep it simpler)**

* You don’t need middleware, OpenAPI routes, or procedure transport.
* Your “router” is just a plain object mapping names → ops.
* Your contract is IO + identity; strategy config is part of implementation (by design).

So you take the ergonomic insight (contract-first + router composition) without adopting a heavy framework.

---

# Final recommendation (canonical standard)

1. **Adopt “contract” terminology** for IO+id+kind. It clarifies what is stable and reusable.
2. **Enforce the canonical directory shape**:

   * `contract.ts` (no implementation) + `index.ts` (implementation) + `strategies/*`
3. **Single createStrategy convention**:

   * `createStrategy(contract, { config, resolveConfig?, run })`
4. **Remove engine types from domain**:

   * `Settings` generic + adapter layer

If you do only one thing: enforce the filesystem shape. It makes the correct dependency direction the path of least resistance, and it makes the typing story “obvious” because authors always know what to import where.

If you want, I can also propose:

* a minimal op scaffolding generator (template)
* a single guardrail script (like your existing refactor guardrail script) that enforces:

  * required files
  * forbidden imports
  * deep import restrictions
  * default strategy presence

[1]: https://orpc.dev/docs/contract-first/define-contract "Define Contract - oRPC"
[2]: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html?utm_source=chatgpt.com "Documentation - Everyday Types"
[3]: https://refactoring.guru/design-patterns/strategy "Strategy"
