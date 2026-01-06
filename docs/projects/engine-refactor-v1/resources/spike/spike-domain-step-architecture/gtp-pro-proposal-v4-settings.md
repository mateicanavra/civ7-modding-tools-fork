According to a document (undated in the repo excerpts you shared), your instinct here is correct: **the current `RunSettings` threading is an architectural boundary leak**, and your “invert it” proposal is a clean way to fix it—*if* we’re willing to treat runtime settings as **a composed, contract-defined object** rather than an engine-owned type.

Below is a full proposal that answers your questions directly and then lays out a coherent end state.

---

## 0) Quick housekeeping: repo bundle access

I can still see the earlier U14-focused repomix excerpt (and the prior proposal markdown). Some of the other bundles you uploaded earlier have expired in this session, so I can’t re-open them right now. If you want this grounded against specific additional files (e.g., the ecology “canonical repomix” or createStrategy DX bundle), you’ll need to re-upload them.

That said, we have enough from the U14 excerpt to design the settings inversion and explain how it fits your current flow.

---

## 1) What’s actually broken today, and why it’s a boundary issue

### The hard fact

In your current authoring surface, **domain operations and strategies are typed against the engine runtime’s `RunSettings`**:

* `DomainOp.resolveConfig(config, settings: RunSettings)` is part of the op contract today.


* `OpStrategy.resolveConfig(config, settings: RunSettings)` is also typed directly to engine settings.


This means a domain op/strategy contract can’t be “pure domain”; it is structurally coupled to runtime.

### Why this violates your stated intent

The repo itself explicitly documents the intended boundary:

> Ops are pure domain contracts… Steps own runtime binding…
>

Yet the types force the opposite direction: domain → engine.

So yes: **passing `RunSettings` into domain strategies is a boundary violation given your own contract language**.

---

## 2) Your inversion proposal: is it sound?

### Proposal restated (in my words)

* A **domain declares its own settings** (a schema + type): “domain knobs”.
* Ops/strategies that need settings depend only on a **subset** of those knobs.
* A recipe/pipeline composes:

  * global settings (SDK-defined, “world/map fundamentals”),
  * domain settings (imported from domains),
  * optionally recipe-local settings,
    into a single “run settings” object passed at runtime.
* Therefore: **domains do not import runtime `RunSettings` at all**. Runtime simply carries the composed object.

### Is it sound?

Yes—*architecturally* it is sound, and it actually aligns better with your boundary intent than the “adapter mapping” approach.

### Does it remove complexity or add it?

It **moves** complexity to a more appropriate location:

* It **removes** complexity in domain modules:

  * no runtime type import,
  * no adapter mapping glue in every step,
  * clearer mental model (settings are contract-level).
* It **adds** one-time complexity at the recipe boundary:

  * compose settings schemas,
  * decide namespacing to avoid collisions.

That trade is favorable because “composition at the boundary” is a one-time cost per recipe/pipeline, while “mapping per op/step” is a recurring cost and a source of drift.

### The key constraint

To make this work cleanly without engine↔domain dependency cycles:

* The engine must treat settings as **opaque data** (store + forward), or be generic over settings.
* The recipe authoring layer becomes the place where settings are validated/defaulted (TypeBox), not the engine.

That’s consistent with what your current recipe authoring already does: it passes `settings` into compile/run and stores it on context (`context.settings = plan.settings`).


---

## 3) Do we have enough info to design this now?

### Yes, for the authoring-facing contract and typing model

We can design:

* domain settings declarations,
* op contract referencing settings subsets,
* strategy authoring inference,
* recipe settings composition,
* step integration patterns.

### What we do *not* know (and would need to implement safely)

To implement with zero surprises, we’d want to confirm:

1. Whether the engine **reads/assumes specific fields** on `RunSettings` today (vs purely transporting it).
2. Where `RunSettings` is constructed in real runs (CLI/UI/service), and how it’s validated today (if at all).
3. Whether `ExtendedMapContext.settings` is typed as `RunSettings` in `@mapgen/core/types.js` and how widely that’s used.

We can still propose the clean design now; those unknowns only affect the exact migration mechanics.

---

## 4) Full proposal: contract-defined settings, recipe-composed runtime

### Design goals satisfied

* Domains define knobs once.
* Ops use a subset.
* Strategies see **only** the subset (strong typing).
* No engine `RunSettings` in domain code.
* No “default config baked into op schema”.
* Strategy inference remains solved via contextual typing.

---

## 4.1 Canonical data model

### Three distinct things

1. **Input**: runtime values for computation (op input schema).
2. **Config**: per-step/per-op plan-truth parameters (`{ strategy, config }` envelope).
3. **Settings**: run-scoped knobs (global/domain/recipe), not part of plan-truth.

### Namespacing (strong recommendation)

Make settings a structured object to prevent collisions:

```ts
settings: {
  global: { /* world/map fundamentals */ },
  domains: {
    ecology: { /* ecology knobs */ },
    placement: { /* placement knobs */ },
    // ...
  },
  recipe?: { /* recipe-local knobs */ },
}
```

This guarantees composition is deterministic and avoids two domains both defining `seed`, `scale`, etc.

---

## 4.2 New primitives

### A) Domain settings declaration

Each domain exports a settings contract:

* TypeBox schema (for defaults/validation at boundary)
* helper to pick subsets
* helper to select from composed settings

```ts
import { Type, type Static, type TSchema } from "typebox";

export type DomainSettingsDef<
  DomainId extends string,
  Schema extends TSchema
> = Readonly<{
  id: DomainId;
  schema: Schema;

  // purely type-level helpers
  pick<const Keys extends readonly (keyof Static<Schema> & string)[]>(
    ...keys: Keys
  ): TSchema; // concretely: a TypeBox Pick schema
}>;
```

Concrete implementation details can use `Type.Pick(schema, keys)`; the important part is that authors get a stable interface.

### B) Op contract includes settings subset schema (optional)

Your op contract/def should be IO-first, but it can also specify the settings it expects:

```ts
export type OpDef<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  SettingsSchema extends TSchema = TSchema // or Type.Any()
> = Readonly<{
  kind: DomainOpKind;
  id: string;
  input: InputSchema;
  output: OutputSchema;

  // NEW: settings slice required by this op’s strategies/resolveConfig
  settings?: SettingsSchema;
}>;
```

If `settings` is omitted:

* `resolveConfig` can be omitted (common), or
* settings param becomes `unknown` (fine).

### C) Strategy authoring uses op contract for context

This retains your key TS constraint: exported objects need contextual typing at definition time.

```ts
export type OpStrategy<
  ConfigSchema extends TSchema,
  Input,
  Output,
  Settings
> = Readonly<{
  config: ConfigSchema;

  resolveConfig?: (
    config: Static<ConfigSchema>,
    settings: Settings
  ) => Static<ConfigSchema>;

  run: (input: Input, config: Static<ConfigSchema>) => Output;
}>;

export function createStrategy<
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  const SettingsSchema extends TSchema,
  const ConfigSchema extends TSchema
>(
  op: OpDef<InputSchema, OutputSchema, SettingsSchema>,
  strategy: OpStrategy<
    ConfigSchema,
    Static<InputSchema>,
    Static<OutputSchema>,
    Static<SettingsSchema>
  >
): typeof strategy;
```

This yields:

* `input` inferred from op contract
* `settings` inferred from op contract’s `settings`
* `cfg` inferred from `strategy.config`
* no exported `Static<>` aliases required

### D) createOp finalization stays as-is semantically

`createOp` still derives:

* envelope union schema `{ strategy, config }`
* `defaultConfig` derived from default strategy schema defaults
* dispatcher `run` and `resolveConfig`

But `DomainOp.resolveConfig` becomes settings-generic and **no longer mentions engine RunSettings**.

(You already know this part; the key change here is: settings type now comes from op contract.)

---

## 4.3 Recipe settings composition

### A) Global settings schema in authoring SDK

Define “global” settings schema in authoring (not engine), e.g.:

```ts
export const GlobalSettingsSchema = Type.Object({
  // e.g. width/height, seed, world profile, etc
}, { additionalProperties: false, default: {} });
```

### B) Compose domains into recipe settings schema

Provide a single canonical helper to do this:

```ts
export function defineRunSettings<const Domains extends Record<string, TSchema>>(args: {
  global: TSchema;
  domains: Domains;
  recipe?: TSchema;
}) {
  return Type.Object(
    {
      global: args.global,
      domains: Type.Object(args.domains, { additionalProperties: false }),
      recipe: args.recipe ?? Type.Optional(Type.Any()),
    },
    { additionalProperties: false }
  );
}
```

(Exact runtime details can vary. The point: **one canonical composition path**.)

### C) Recipe module becomes typed over its settings

Right now recipe uses `RunSettings` imported from engine:


In the new model:

* The recipe module’s `run(settings)` takes `Static<typeof RecipeSettingsSchema>`
* The engine just stores/passes this settings object; it should not own its shape.

You can keep the runtime method named `run(settings, ...)`, but the **type** is recipe-defined.

---

## 4.4 Step integration

Today, steps call op resolveConfig like this:

```ts
resolveConfig: (config, settings) => ({
  wonders: placement.ops.planWonders.resolveConfig(config.wonders, settings),
  ...
})
```



Under the new model, ops don’t want the entire settings object. They want their domain slice (or subset).

So the step does:

```ts
resolveConfig: (config, settings) => ({
  wonders: placement.ops.planWonders.resolveConfig(config.wonders, settings.domains.placement),
  ...
})
```

Optionally, domain exports a selector:

```ts
const placementSettings = placement.selectSettings(settings);
placement.ops.planWonders.resolveConfig(config.wonders, placementSettings);
```

This keeps steps clean and prevents hardcoding the path in many places.

---

## 5) End-to-end example (ecology slice)

### 5.1 Domain settings contract

#### `src/domain/ecology/settings.ts`

```ts
import { Type } from "@mapgen/authoring";
import { defineDomainSettings } from "@mapgen/authoring/settings";

export const ecologySettings = defineDomainSettings({
  id: "ecology",
  schema: Type.Object(
    {
      globalAridity: Type.Number({ default: 0.5, minimum: 0, maximum: 1 }),
      vegetationBias: Type.Number({ default: 0.0, minimum: -1, maximum: 1 }),
    },
    { additionalProperties: false, default: {} }
  ),
});
```

### 5.2 Op contract (contract-first)

#### `src/domain/ecology/ops/classify-biomes/contract.ts`

```ts
import { Type } from "@mapgen/authoring";
import { defineOp } from "@mapgen/authoring/op";
import { ecologySettings } from "../../settings";

// IO-only plus settings slice
export const ClassifyBiomes = defineOp({
  kind: "compute",
  id: "ecology/classifyBiomes",
  input: Type.Object({ /* ... */ }),
  output: Type.Object({ /* ... */ }),

  // the op only needs aridity knob, not everything
  settings: ecologySettings.pick("globalAridity"),
});
```

### 5.3 Strategy implementation in its own module

#### `src/domain/ecology/ops/classify-biomes/strategies/default.ts`

```ts
import { Type, createStrategy } from "@mapgen/authoring";
import { ClassifyBiomes } from "../contract";

const DefaultCfg = Type.Object(
  { threshold: Type.Number({ default: 0.6 }) },
  { additionalProperties: false, default: {} }
);

export const defaultStrategy = createStrategy(ClassifyBiomes, {
  config: DefaultCfg,

  resolveConfig: (cfg, settings) => {
    // settings is { globalAridity: number } inferred
    return {
      ...cfg,
      threshold: cfg.threshold * settings.globalAridity,
    };
  },

  run: (input, cfg) => {
    // input inferred from contract
    // cfg inferred from DefaultCfg
    return { /* output */ };
  },
});
```

No exported `Static<>` aliases. No generics. Strong inference.

### 5.4 Op assembly (implementation router)

#### `src/domain/ecology/ops/classify-biomes/index.ts`

```ts
import { createOp } from "@mapgen/authoring";
import { ClassifyBiomes } from "./contract";
import { defaultStrategy } from "./strategies/default";

export const classifyBiomes = createOp(ClassifyBiomes, {
  strategies: { default: defaultStrategy },
});
```

### 5.5 Domain router exports settings + ops

#### `src/domain/ecology/index.ts`

```ts
import { ecologySettings } from "./settings";
import { classifyBiomes } from "./ops/classify-biomes";

export const ecology = {
  id: "ecology",
  settings: ecologySettings,
  ops: { classifyBiomes },
  selectSettings: (settings: any) => settings.domains.ecology, // typed in real impl
} as const;
```

### 5.6 Recipe composes settings

#### `src/recipes/standard/index.ts`

```ts
import { defineRunSettings, GlobalSettingsSchema } from "@mapgen/authoring/settings";
import { ecology } from "@mapgen/domain/ecology";
import { placement } from "@mapgen/domain/placement";

export const StandardSettingsSchema = defineRunSettings({
  global: GlobalSettingsSchema,
  domains: {
    ecology: ecology.settings.schema,
    placement: placement.settings.schema,
  },
});
```

### 5.7 Step uses settings slice

```ts
resolveConfig: (config, settings) => ({
  biomes: ecology.ops.classifyBiomes.resolveConfig(
    config.biomes,
    settings.domains.ecology
  ),
})
```

That’s it.

---

## 6) Multi-strategy example (proves typing)

Same op contract, two strategies with different config schemas:

```ts
export const fast = createStrategy(ClassifyBiomes, {
  config: Type.Object({ maxIters: Type.Integer({ default: 20 }) }, { default: {} }),
  run: (input, cfg) => { /* cfg.maxIters typed */ return /* output */; },
});

export const accurate = createStrategy(ClassifyBiomes, {
  config: Type.Object({ maxIters: Type.Integer({ default: 200 }) }, { default: {} }),
  run: (input, cfg) => { /* cfg.maxIters typed */ return /* output */; },
});

export const classifyBiomes = createOp(ClassifyBiomes, {
  strategies: { default: fast, accurate },
});
```

The derived envelope config union remains identical to your U14 requirement:

* `{ strategy: "default"; config: FastCfg }`
* `{ strategy: "accurate"; config: AccurateCfg }`

No semantic changes to your envelope model.

---

## 7) Migration plan (implementation-level)

### Phase 1: Stop leaking engine settings into ops/strategies

* Change `OpStrategy` and `DomainOp` to be settings-generic (as above).
* Remove engine `RunSettings` type from:

  * `packages/mapgen-core/src/authoring/op/strategy.ts` (currently imports engine)
  * `packages/mapgen-core/src/authoring/op/types.ts` (DomainOp.resolveConfig signature)
  * `packages/mapgen-core/src/authoring/op/create.ts` (currently imports RunSettings)

Acceptance criteria:

* Domain ops compile with no reference to engine `RunSettings` type.
* Existing runtime behavior unchanged.

### Phase 2: Introduce domain settings contracts

* For each domain:

  * add `settings.ts` exporting `domainSettings` schema.
* For each op contract:

  * optionally declare `settings` subset if it has `resolveConfig`.

Acceptance criteria:

* Strategy modules get inferred settings param types with no manual aliases.

### Phase 3: Recipe settings composition

* Add `defineRunSettings` helper and `GlobalSettingsSchema`.
* Update recipe entrypoints to accept settings typed as the composed schema.
* Update steps to pass `settings.domains.<domain>` (or selector helper) into ops.

Acceptance criteria:

* Recipe settings are validated/defaulted once (if you choose to do runtime validation).
* No adapter mapping functions required between runtime settings and domain settings.

### Phase 4: Engine alignment (only if needed)

If engine currently **assumes** a concrete `RunSettings` shape, you have two options:

1. Make engine treat settings as opaque `unknown` and just pass/store it.
2. Make engine generic over settings (more invasive but very clean).

Acceptance criteria:

* Engine does not need to import domain packages.
* Engine compiles and still produces `plan.settings` used by context.

---

## 8) Known limitations / edge cases

1. **Out-of-line strategies still need op contract context**
   This is unavoidable TypeScript reality: without contextual typing, callback parameters won’t infer.

2. **Schema widening kills inference**
   If someone writes `const S: TSchema = ...`, `Static<TSchema>` becomes uselessly wide. Stick to `const` schema values (or provide a `defineSchema` pinning helper, similar to your existing `defineOpSchema` helper).

3. **Settings subset typing is only as good as your declared subset**
   If an op declares `settings: ecologySettings.schema`, strategies will see the whole ecology settings object. If you want narrower typing, use `pick`.

4. **Cross-domain ops**
   If an op truly needs knobs from two domains, you either:

* define a combined settings schema for that op (explicit), or
* treat that as a “pipeline/global” concern and move it to `settings.global`.

---

## 9) Sanity check against your constraints

* Envelope remains `{ strategy, config }` and is derived in `createOp`.
  (No change to U14 semantics.)
* Default strategy is still required.
* Op IO does not vary per strategy.
* `resolveConfig` remains per-strategy and operates on inner config.
* Inline POJO strategy inference stays intact (this design doesn’t touch that path).
* Domains no longer import engine `RunSettings` (settings are contract-defined, recipe-composed).

---

## Bottom line

Your proposal is not only sound—it’s *cleaner* than the adapter approach for your repo:

* It eliminates engine type leakage into domain contracts (which the repo’s own boundary comments say you want).

* It simplifies author experience: strategies see `settings` as the domain knobs they actually care about.
* It keeps the plan-truth config envelope model untouched.

If you re-upload the latest ecology/domain bundles you mentioned, I can tighten this further by matching your real `RunSettings` shape, suggesting the exact best namespacing (`global/domains/recipe` vs flatter), and pointing out the minimal migration path that avoids touching too many steps at once.
