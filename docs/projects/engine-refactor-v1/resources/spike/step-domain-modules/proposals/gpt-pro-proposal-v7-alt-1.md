Yes — this is the right place to make “what a step consumes and what it guarantees” part of the **step contract**.

What you want (a canonical home for dependency keys + composable declarations + good autocomplete) is already *very close* to what the engine is doing today; it’s just not expressed as a first‑class **contract layer** concept yet.

## 0. Ground truth in the current engine

Today the engine already has an explicit dependency mechanism:

* A dependency identifier is a **string tag** with a **kind**: `"artifact" | "field" | "effect"`.
* Tags are treated as **unsatisfied until explicitly provided** (even if the underlying buffers exist in the context).
* Each step declares `requires: string[]` and `provides: string[]` (currently on the step object).
* The executor:

  * checks `requires` are satisfied before running,
  * marks `provides` as satisfied after running,
  * then verifies every declared provide is *actually* satisfied (postcondition check) and throws if not.
* The runtime context already contains a dedicated “published data products” store keyed by dependency tag: `artifacts: ArtifactStore` (that store name is legacy, but the comment is the important part).

So conceptually, you already have the right abstraction: **dependency tags + requires/provides**. The missing DX is: *make it contract‑first and canonical*, and prevent ad‑hoc strings/import tangles.

---

## 1. Canonical naming: stop overloading words

The system needs one umbrella term and three precise subtypes.

### Umbrella term

**Dependency tag** (or **pipeline dependency tag**).

It’s already what the engine calls them, and it maps cleanly to `DependencyTagDefinition` / `TagRegistry`.

### Three kinds (canonical descriptions)

1. **Published data products** (`kind: "artifact"`)

   * Values intentionally published into the shared cross‑step store (`context.artifacts`) under a tag key.
   * Example: `artifact:ecology.biomeClassification` (published via `ctx.artifacts.set(...)`).

2. **Map fields** (`kind: "field"`)

   * Preallocated map layers (typed arrays) that exist in the context but are considered *invalid/uninitialized* until a step explicitly provides the corresponding tag.
   * Example: `field:biomeId` is provided by the biomes step.

3. **Engine effects** (`kind: "effect"`)

   * Durable side effects on the engine/adapter, potentially verifiable.
   * Example: `effect:engine.biomesApplied` is provided by the biomes step.

This gives you a clean taxonomy that covers everything you listed without conflating them.

---

## 2. Should a step contract declare `requires` / `provides`?

Yes — for a structural reason, not a preference:

* The executor’s correctness model is **step‑scoped**: `provides` is the moment a dependency becomes satisfied, and missing provides is a step failure.
* `isDependencyTagSatisfied` intentionally makes tags false until the tag has been provided (even if the underlying data exists).

That means the “unit of guarantee” is the step. So the most honest, stable contract is:

> A step contract declares: “I require X to already be satisfied; after I run, I guarantee Y is satisfied.”

This belongs on the contract, not hidden inside the implementation module.

---

## 3. Where should dependency tags be *declared*?

This is the part you’re unsure about (“step vs recipe vs stage vs domain”). The clean split is:

### A) Tag *definitions* live with the owner of the runtime truth

A tag definition often encodes how to verify satisfaction (e.g., checking `context.fields.*` buffers or calling `adapter.verifyEffect`). That verification logic must live near the runtime substrate it inspects.

You already do this in the recipe tag catalog today (`STANDARD_TAG_DEFINITIONS`, effect owners, verified tags).

**Canonical rule:**

* If the tag’s verification touches engine adapter behavior → define it in the engine/adapter layer or a recipe-level “engine tags” catalog.
* If the tag’s verification touches a domain’s published data product shape (e.g., biome classification) → define it with that domain (because the domain owns the schema/guard).
* If the tag refers to a core map field buffer → define it in core (because core owns the field storage contract).

### B) Tag *IDs/constants* should be exported from a contract‑layer catalog

Regardless of where definitions live, authors need a canonical place to import the ID constants for autocomplete and consistency.

So: **export tag IDs from a “dependency catalog” module** (domain‑scoped and/or recipe‑scoped) and treat that catalog as contract layer.

### C) Steps reference tag IDs; recipes/stages aggregate for introspection/validation

* Step contracts list requires/provides.
* Stage/recipe contracts can compute “pipeline provides/requires summaries” for documentation and tooling, but they don’t own the semantics.

This resolves the “what level does it belong to?” confusion:

* The **relationship** (requires/provides) is step‑level.
* The **catalog** (what tags exist + what they mean) is owned by whoever can verify them (core/domain/engine/recipe).
* The **composition** (union of catalogs) is recipe‑level.

---

## 4. Do “buffers” belong at recipe level?

The canonical answer: **“buffer” is an implementation detail**. What matters contractually is whether a piece of state is:

* a published data product,
* a map field,
* or an engine effect.

A “buffer” can show up in two contract-meaningful ways:

### Case 1: It’s a published data product

Example: heightfield/climate buffers are stored on `context.buffers.*`, but published into the cross-step store under an `artifact:` tag via helper functions like `publishHeightfieldArtifact` / `publishClimateFieldArtifact`.

That is contractually a **published data product tag**. The buffer backing is irrelevant.

### Case 2: It’s a map field (typed array layer)

Example: biome id / terrain type layers in `context.fields.*` and gated by `field:` tags.

That is contractually a **map field tag**.

### What should *not* be tagged

Scratch or transient buffers that are not meaningful as cross‑step contracts should not appear as dependency tags at all. They’re local implementation details.

---

## 5. Is this the right refactor moment?

Yes — and importantly, you can do it without “scope explosion” if you draw the line correctly.

### What to do now (high payoff, low churn)

1. **Move requires/provides declarations from step implementation → step contract.**
2. **Create a canonical dependency catalog module(s)** to export tag IDs (and optionally definitions).
3. **Have the recipe contract aggregate catalogs** and wire registration into the engine runner.

This is structurally consistent with making step contracts first‑class anyway, and it eliminates the “where do keys live?” ambiguity.

### What to defer (high churn)

Do *not* redesign:

* the internal storage split (`context.fields` vs `context.buffers` vs `context.artifacts`),
* or replace TagRegistry’s runtime validation model.

Those are deeper runtime refactors and not required to get the contract-first DX win you’re after.

---

## 6. Minimal-but-canonical concrete shape

Below is the smallest shape that gives you:

* a canonical place for tag IDs,
* contract-first step dependency declarations,
* recipe-level re-export for easy discovery,
* no import cycles.

### 6.1 Dependency catalog (contract layer)

```ts
// recipes/standard/deps.contract.ts (contract-layer only; no step imports)

export const deps = {
  products: {
    biomeClassificationV1: "artifact:ecology.biomeClassification",
    climateField: "artifact:climateField",
    heightfield: "artifact:heightfield",
  },
  fields: {
    biomeId: "field:biomeId",
    elevation: "field:elevation",
    rainfall: "field:rainfall",
    // add temperature here if you want it gated consistently
    temperature: "field:temperature",
  },
  effects: {
    biomesApplied: "effect:engine.biomesApplied",
    // ...
  },
} as const;

export type DependencyTagId =
  | (typeof deps.products)[keyof typeof deps.products]
  | (typeof deps.fields)[keyof typeof deps.fields]
  | (typeof deps.effects)[keyof typeof deps.effects];
```

This gives authors autocompletion and eliminates raw string tags.

You already have something like this today (e.g., `M3_DEPENDENCY_TAGS`, `M4_EFFECT_TAGS`).

### 6.2 Tag definitions (verification logic)

You can keep the existing pattern: a list of `DependencyTagDefinition<ExtendedMapContext>[]` with `kind` and optional `satisfies`, plus any “owner” metadata you want for tooling/debugging.

The only structural change: this becomes part of the recipe/domain contract wiring rather than a loose runtime registration.

### 6.3 Step contract declares dependencies

```ts
// stages/ecology/steps/biomes.contract.ts

import { Type } from "typebox";
import { deps } from "../../deps.contract";
// import op contracts, etc.

export const biomesStepContract = {
  id: "biomes",
  phase: "ecology",
  config: Type.Object(
    {
      // ...
    },
    { additionalProperties: false, default: {/* ... */} }
  ),

  requires: [
    deps.products.climateField,
    deps.products.heightfield,
    deps.products.narrativeCorridorsV1,
    deps.products.narrativeMotifsRiftsV1,
  ],

  provides: [
    deps.products.biomeClassificationV1,
    deps.fields.biomeId,
    deps.effects.biomesApplied,
  ],
} as const;
```

This mirrors what you already do in the step implementation today: the biomes step currently declares `requires` and `provides` using tag constants.

### 6.4 Step implementation imports the contract

```ts
// stages/ecology/steps/biomes.impl.ts
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { implementStep } from "@swooper/mapgen-core/authoring";
import { biomesStepContract } from "./biomes.contract";
import { publishBiomeClassificationArtifact } from "../../../products/biomeClassification";

// `implementStep` attaches runtime logic to the contract.
export const biomesStep = implementStep(biomesStepContract, {
  run(context: ExtendedMapContext, config) {
    // ...
    publishBiomeClassificationArtifact(context, computed);
  },
});
```

Note: You already have strongly typed “publish/get” helpers in practice (e.g. `publishBiomeClassificationArtifact`, `getPublishedBiomeClassification`).

That’s a good pattern; keeping those in “products” modules also prevents the step from having to know internal storage details.

### 6.5 Recipe contract re-exports for discoverability

```ts
// recipes/standard/contract.ts
export { deps, type DependencyTagId } from "./deps.contract";
export { biomesStepContract } from "./stages/ecology/steps/biomes.contract";
// ... other step contracts
```

External consumers can now import the recipe contract and get autocomplete for `deps.*`.

Internal step implementations should generally import from `deps.contract.ts` (or domain deps), not the assembled recipe router, to avoid cycles.

---

## 7. Answering your three questions directly

### 1) Conceptual design: does step contract declaring provides/requires make sense?

Yes — because the engine’s semantics treat tags as satisfied *only* when a step provides them, and the executor verifies that a step truly satisfied what it claimed to provide.

That is step‑scoped behavior, so step‑scoped contract declarations are the cleanest representation.

### 2) Timing and scope: should this be done in this refactor?

Yes, if you keep it bounded to:

* contract-first placement of `requires/provides`,
* canonical tag catalogs (IDs + definitions),
* recipe-level aggregation and registration.

Do **not** use this as a reason to refactor internal buffer storage; that’s separate.

### 3) Practical shape: what’s minimal and canonical?

Minimal and canonical is:

* A dependency catalog module exporting IDs (`deps.products|fields|effects`) as `as const`.
* Step contracts refer to those IDs in `requires/provides`.
* Recipe contract re-exports the catalog for “single import = discover everything”.
* Tag verification definitions remain centralized (core/domain/recipe) and registered once per recipe.

---

## 8. One “optional upgrade” that pays off later

If you want to go one step further (still without big churn): add a typed “published data product access” helper so step authors don’t write `ctx.artifacts.get(...) as ...` or custom guards everywhere.

You already have per-product helpers like `getPublishedBiomeClassification` and `publishBiomeClassificationArtifact`.

You can formalize that into a generic helper later, but you don’t need it to standardize contracts.

---

## Bottom line recommendation

* **Yes:** put `requires` / `provides` on step contracts.
* **Yes:** define dependency tag IDs in a canonical contract-layer catalog (`deps`) with three explicit namespaces: published data products, map fields, engine effects.
* **Yes:** have recipe contracts aggregate and re-export those catalogs for discovery/autocomplete.
* **No:** don’t treat “buffers” as a first-class contract concept — only expose them via the dependency tag taxonomy when they are meaningful cross-step surfaces.
* **Scope line:** do not refactor runtime storage or validation semantics as part of this pass; you can get the DX and composability win without that churn.

If you want, I can follow up by proposing the exact `implementStep(contract, impl)` signature and the minimal type-level constraints that (a) prevent raw string tags, and (b) make `requires/provides` statically constrained to the recipe’s tag union.

-----------

Understood on the naming constraints. I agree: “tag” is overloaded in most systems and, in your repo, it should be reserved for true game concepts (e.g., plot tags). Everything below rewires the design around **dependency keys** (a.k.a. dependency IDs), while keeping the existing semantics intact.

---

## 1) Naming: adopt “dependency key” end‑to‑end

### What exists today (and why it’s misleading)

The engine already models what you want—**registered dependency identifiers** with:

* an ID string,
* a kind discriminator (`"artifact" | "field" | "effect"`),
* optional satisfaction predicates and demo validation,
* a registry that validates IDs up front.
  But the class is currently named `TagRegistry`, even though the types are already named `DependencyTagDefinition` / `DependencyTagKind`.

`StepRegistry` also validates `requires`/`provides` against that registry at registration time.

### Canonical rename mapping (what I recommend)

This is largely mechanical, but it has outsized DX value because it makes the concept obvious everywhere:

| Current name               | Canonical name                                                |
| -------------------------- | ------------------------------------------------------------- |
| `DependencyTagKind`        | `DependencyKind`                                              |
| `DependencyTagDefinition`  | `DependencyDefinition` (or `DependencyKeyDefinition`)         |
| `TagOwner`                 | `DependencyOwner`                                             |
| `TagRegistry`              | `DependencyRegistry`                                          |
| `validateDependencyTag(s)` | `validateDependencyKey(s)`                                    |
| `isDependencyTagSatisfied` | `isDependencySatisfied`                                       |
| file `engine/tags.ts`      | `engine/dependencies.ts` (or `engine/dependency-registry.ts`) |

This aligns with what the system actually is: a registry of dependency keys, not “tags.” The existing implementation already enforces kind compatibility via key prefixes (`artifact:` / `field:` / `effect:`).

I would stand firm on doing this rename as part of the refactor: it clarifies the contracts layer and reduces conceptual friction.

---

## 2) Taxonomy names: keep `artifacts`, keep `fields`, keep `effects`

### Artifacts vs “products”

I do **not** feel strongly that “products” is better here. Given the current codebase:

* The dependency kind is literally `"artifact"` today.
* Keys are already `artifact:...` (e.g., `artifact:ecology.biomeClassification`).
* The runtime store is already named `context.artifacts` and is used for these values.

Renaming to “products” would be churn without clear semantic gain. So: **keep `artifacts`**.

### Fields vs buffers (my honest take)

I recommend **keeping `fields`** as the canonical contract name for the “terrain layers / per-plot arrays” category.

Why:

* The core types already distinguish **MapFields** (terrain arrays: rainfall/elevation/temperature/biomeId/etc.) from **MapBuffers** (staging/reusable buffers: heightfield, climate staging, scratch masks).
* Dependency definitions for `field:*` keys explicitly validate `context.fields?.elevation`, `context.fields?.rainfall`, etc.
* Separately, “buffer” is already a real, concrete concept for staged intermediate structures (e.g., `HeightfieldBuffer`, `ClimateFieldBuffer`) and those are often published under **artifact** keys (e.g., `artifact:heightfield`, `artifact:climateField`).

So if you rename `fields` → `buffers`, you collide with an existing “buffers” concept that already means something else. That’s the kind of naming drift that becomes expensive over time.

**Decision:** keep `fields` for the dependency kind / keys (`field:*`) and keep `buffers` as an implementation detail for staging/reuse in `MapBuffers`.

---

## 3) Where dependency keys should live

Here’s the key point I will stand firm on:

### Dependency keys should **not** be defined “inside” step contracts as their canonical home

Reason: dependency keys are *shared vocabulary* across steps. If a key is produced by one step and required by another, it cannot live “primarily” in a single step module without creating poor dependency edges (“to reference this key, import that other step’s contract”).

That’s exactly the “import tangles” failure mode you’re trying to avoid.

### Canonical home: a dependency key catalog module (contract layer), per composition scope

The canonical pattern should be:

1. **Core dependency keys** (shared across everything)

   * common `field:*` keys
   * core `effect:*` keys (or re-exports of adapter-defined effects)
2. **Domain dependency keys** (domain-owned artifacts)

   * e.g., ecology’s `artifact:ecology.biomeClassification`
3. **Recipe dependency key catalog** (composition root)

   * re-exports/aggregates keys from core + domains used by the recipe
   * adds any recipe-specific artifacts/effects if they truly are recipe-owned

You already do something close to this in practice: `mods/mod-swooper-maps/src/recipes/standard/tags.ts` defines a centralized constant `M3_DEPENDENCY_TAGS` with `artifact` and `field` keys, plus engine effect keys. That’s the right shape; it just needs renaming and contract-layer positioning.

So the **structure stays** (central catalog), but we rename and standardize it.

---

## 4) Can step implementations import dependency keys from step contracts to reduce imports?

Yes — and this is the best way to get what you want **without** making step contracts the canonical key source.

### The pattern I recommend

* Dependency keys are defined in the catalog module (canonical).
* Step contracts **import keys** from the catalog.
* Step contracts export a small, step-local “dependencies” object that names the keys that step cares about.
* Step implementations import **only the step contract** and refer to `contract.dependencies.*` when reading/publishing/verifying.

This gives you:

* one canonical key source (the catalog),
* no ad-hoc strings,
* one-import DX for step implementers.

### Why this is better than “keys live in the step contract”

Because:

* other steps shouldn’t need to import your step contract just to reference a dependency key,
* and the registry/definitions layer needs stable keys that are not implicitly “owned” by a particular step module.

---

## 5) Minimal canonical API shape with your naming rules

### 5.1 Dependency key catalog (recipe-level contract)

```ts
// recipes/standard/dependencies.contract.ts

export const dependencyKeys = {
  artifacts: {
    heightfield: "artifact:heightfield",
    climateField: "artifact:climateField",
    biomeClassificationV1: "artifact:ecology.biomeClassification",
    // ...
  },
  fields: {
    elevation: "field:elevation",
    rainfall: "field:rainfall",
    biomeId: "field:biomeId",
    // ...
  },
  effects: {
    biomesApplied: "effect:engine.biomesApplied",
    // ...
  },
} as const;

export type DependencyKey =
  | (typeof dependencyKeys.artifacts)[keyof typeof dependencyKeys.artifacts]
  | (typeof dependencyKeys.fields)[keyof typeof dependencyKeys.fields]
  | (typeof dependencyKeys.effects)[keyof typeof dependencyKeys.effects];
```

This is effectively what `M3_DEPENDENCY_TAGS` + `M4_EFFECT_TAGS` already do today; it just drops “tag” terminology and standardizes names. 

### 5.2 Dependency registry (engine)

Rename the existing `TagRegistry` to `DependencyRegistry`. The behavior stays the same:

* register definitions once
* validate `requires`/`provides` at step registration
* enforce kind compatibility based on key prefix (`artifact:` / `field:` / `effect:`).

### 5.3 Step contract exports a step-local dependency handle

```ts
// stages/ecology/steps/biomes/contract.ts
import { dependencyKeys } from "../../../dependencies.contract";

export const biomesDependencies = {
  requires: {
    artifacts: {
      heightfield: dependencyKeys.artifacts.heightfield,
      climateField: dependencyKeys.artifacts.climateField,
    },
    effects: {
      coastlinesApplied: dependencyKeys.effects.coastlinesApplied,
    },
  },
  provides: {
    artifacts: {
      biomeClassificationV1: dependencyKeys.artifacts.biomeClassificationV1,
    },
    fields: {
      biomeId: dependencyKeys.fields.biomeId,
    },
    effects: {
      biomesApplied: dependencyKeys.effects.biomesApplied,
    },
  },
} as const;

export const biomesStepContract = defineStep({
  id: "biomes",
  phase: "ecology",
  dependencies: biomesDependencies, // (see below)
  // config schema composition...
});
```

`defineStep` can flatten this into the required runtime arrays:

* `requires: string[]`
* `provides: string[]`

which the engine already expects and validates.

### 5.4 Step implementation imports only the contract

```ts
// stages/ecology/steps/biomes/index.ts
import { implementStep } from "@mapgen/authoring";
import { biomesStepContract, biomesDependencies } from "./contract";

export const biomes = implementStep(biomesStepContract, {
  run(ctx, cfg) {
    // publish:
    ctx.artifacts.set(
      biomesDependencies.provides.artifacts.biomeClassificationV1,
      /* value */
    );

    // mark effect satisfied (if you have an explicit mechanism), or rely on registry satisfies()
    // ...
  },
});
```

This removes the “import the catalog + import the contract + import helpers” problem for implementations. Implementations import the contract; the contract is the one place that “names what the step cares about.”

---

## 6) So what’s the final answer on “where do keys live?”

### My stance

* **Canonical definitions live in dependency catalogs** (core/domain/recipe) — not in step contracts.
* **Step contracts reference keys** (via the catalog) and should export a step-local `dependencies` handle for their implementation to use.
* **Step implementations should import keys from their step contract**, not directly from the catalog.

This gives you:

* a single canonical source of truth for shared keys,
* no ad-hoc strings,
* minimal imports at implementation sites,
* and no “import another step’s contract to reference its key” tangles.

---

## 7) Minimal set of changes to apply your naming constraints

1. **Rename engine “tag” identifiers**

   * `TagRegistry` → `DependencyRegistry` etc. (mechanical rename).
2. **Rename the recipe key catalog**

   * `tags.ts` → `dependencies.contract.ts` (or similar)
   * `M3_DEPENDENCY_TAGS` → `dependencyKeys` / `standardDependencyKeys` / `dependencyKeysV1` (your call; avoid “tag”).
   * `STANDARD_TAG_DEFINITIONS` → `STANDARD_DEPENDENCY_DEFINITIONS` (definitions; same semantics).
3. **Keep the dependency kinds exactly as-is**

   * `artifact | field | effect` are already the canonical discriminators and match runtime storage checks. Don’t rename them; just rename the surrounding concept from tag→key. 

---

## Summary decisions

* **Use** `DependencyKey` / `DependencyId` + `DependencyRegistry`.
  (Rename “TagRegistry” and related APIs.)
* **Keep** `artifacts` as the category name. It matches current keys and storage (`artifact:*`, `context.artifacts`).
* **Keep** `fields` (do not rename to buffers). “Buffers” already means something different in core (`MapBuffers` vs `MapFields`).
* **Keys live in catalogs**, not in step contracts; **step contracts re-export a step-local dependency handle** so implementations import only the contract.

If you want, I can next sketch the exact `defineStep({ dependencies })` typing so that:

* the flattened `requires/provides` arrays are guaranteed to match the structured `dependencies` object, and
* step contracts can only reference dependency keys from the recipe catalog (no arbitrary strings), while still supporting reuse across domains/recipes.
