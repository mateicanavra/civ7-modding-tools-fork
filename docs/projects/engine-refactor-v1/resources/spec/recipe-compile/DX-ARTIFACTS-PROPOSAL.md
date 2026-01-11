# DX Proposal: Artifacts (Steps, Pipelines, Context)

This doc proposes a contract-first, step-centered model for defining, validating, and accessing **artifacts** in the recipe pipeline, with a strong focus on author DX and type safety.

---

## Problem Statement (Current Reality)

Today, artifact authoring and wiring is scattered and noisy:

- **Tags/IDs** live in `mods/mod-swooper-maps/src/recipes/standard/tags.ts` (`M3_DEPENDENCY_TAGS.artifact.*`).
- **Schemas** live elsewhere (`mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` exports TypeBox schemas), but runtime validation generally does **not** use TypeBox.
- **Validation/satisfaction** logic is split:
  - `DependencyTagDefinition.satisfies` is mostly authored in `mods/mod-swooper-maps/src/recipes/standard/tags.ts`.
  - Per-artifact runtime checks are authored via `createArtifactHandler(...)` in `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` and used ad-hoc from steps.
- **Step implementations** import “random” artifact helpers directly (example: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts` imports `featureIntentsArtifact`), instead of getting a coherent artifact API via the step context.

This produces:

- Duplicated wiring and redundant imports.
- Weak discoverability (authors must “know where artifacts live”).
- Drift risk (tag definitions vs runtime handlers vs step dependencies can fall out of sync).
- A mismatch with our established contract-first authoring ergonomics (`defineStep` / `createStep`, domain op binding, etc.).

---

## Design Goals / Constraints

**Primary DX goals**

- Artifacts should be “owned” by the step(s) that **produce** them.
- Artifact definition should be centralized per artifact:
  - ID/tag
  - schema (contract-side)
  - satisfaction/validation (runtime-side)
- Step implementations should not need “named artifact imports” in most cases.
- Artifact access should be **context-based** and discoverable (similar spirit to how ops are provided as a coherent object).

**Architectural constraints**

- Preserve contract vs runtime separation:
  - contract: stable IDs + schemas + declarative dependency shape
  - runtime: validators, satisfaction rules, publication enforcement
- No unnecessary intermediate layers that just restate information.
- Recipe compilation remains the authority for assembling runtime registries (tags, steps, etc.).

---

## Mental Model (Updated)

Think about artifacts as **published data products** in the pipeline:

- **Produced by steps**
- **Consumed by steps**
- **Aggregated at recipe level** by composition, not by manual registry maintenance

The executor has one core job for artifacts:

- enforce `requires` before running a step
- enforce `provides` after running a step

In our current engine, these guarantees are mediated by:

- the `TagRegistry` + `DependencyTagDefinition.satisfies`
- the `satisfied` tag set inside `PipelineExecutor`

This proposal **keeps that execution model**, but fixes authoring by making artifacts:

- defined in one place (near the producer)
- automatically composed into recipe-level tag definitions
- accessed via a consistent typed API (not ad-hoc imports)

---

## Proposal (Chosen Design)

### 1) Define artifacts on step contracts (contract-side)

Extend step contracts so steps can declare artifacts they produce/consume in a structured, author-friendly way.

**Key idea:** a step contract should be able to define artifacts with names that become the “public API surface” for artifact access.

Example (sketch):

```ts
// contract.ts
import { Type, defineStep, defineArtifact } from "@mapgen/authoring";

const featureIntents = defineArtifact({
  id: "artifact:ecology.featureIntents@v1",
  schema: Type.Object({ /* ... */ }, { additionalProperties: false }),
});

export default defineStep({
  id: "feature-intents",
  phase: "ecology",
  artifacts: {
    provides: { featureIntents },
    requires: { /* ... */ },
  },
  schema: Type.Object({ /* config */ }),
});
```

Contract-side consequences:

- IDs and schemas are co-located with the owning producer step.
- Consumers do not need to import tag constants to reference artifact IDs.
- The step contract becomes the single declarative “shape” that downstream compilation can consume.

### 2) Implement artifact runtime handlers next to the step implementation (runtime-side)

Artifact satisfaction/validation lives in runtime handlers, not the contract.

Example (sketch):

```ts
// index.ts
import { createStep, implementArtifacts } from "@mapgen/authoring";
import contract from "./contract.js";

const artifacts = implementArtifacts(contract.artifacts, {
  // per-artifact runtime behavior
  featureIntents: {
    validate: (value, ctx) => { /* ... */ },
    publish: (ctx, value) => { /* set in store + freeze + validate */ },
  },
});

export default createStep(contract, {
  run: (ctx, config, ops) => {
    // discoverable access: no random imports
    const intents = ctx.deps.artifacts.featureIntents.read();
    // ...
  },
  artifacts,
});
```

### 3) Attach a typed dependency surface to context (`ctx.deps`)

Do not overload `ctx.artifacts` (currently a `Map`/`ArtifactStore`) with a new meaning.

Instead, attach a stable, discoverable surface:

- `ctx.deps.artifacts.<name>.read()` / `.publish(value)` / `.tryRead()`
- `ctx.deps.fields.<fieldName>` (and/or helpers like `.require(...)`)
- `ctx.deps.effects.<effectName>.emit()` (optional; see below)

This aligns with:

- the existing “context holds shared runtime surfaces” precedent (e.g. `ctx.env`)
- the tRPC “context typed at initialization, created at runtime” pattern

### 4) Compose step-level artifacts into recipe-level registries automatically

`createRecipe(...)` already has visibility into all `stages -> steps` at recipe construction time.

We extend compilation to:

- collect artifact contracts and runtimes from each step module
- assemble:
  - recipe-level artifact catalog (for tooling/introspection)
  - recipe-level `DependencyTagDefinition[]` entries for artifact tags, with satisfiers derived from artifact runtimes
- attach `ctx.deps` at `recipe.run(...)` time (or at executor start) so steps always see the same API.

This replaces the manual “roll-up tags + manual satisfiers” burden in `mods/mod-swooper-maps/src/recipes/standard/tags.ts` for artifacts.

### 5) Recipe-level artifacts that aren’t owned by a single step

There are legitimate cases where an artifact is:

- conceptually “global” (shared across stages), or
- produced by multiple steps, or
- a derived/debug artifact

We handle this explicitly via recipe-level artifact declarations (still contract-first), rather than as an unstructured dumping ground.

Example (sketch):

```ts
export default createRecipe({
  id: "standard",
  // ...
  artifacts: {
    globals: {
      heightfield: defineArtifact({ id: "artifact:heightfield", schema: Type.Any() }),
    },
  },
});
```

Rules of thumb:

- Default: step owns the artifact it introduces.
- If it truly cannot be step-owned, it must be explicitly declared as recipe-level (or stage-level) with a clear rationale.

---

## TypeScript API Shapes (Explicit Signatures)

These signatures are representative; the final names can be tuned for local style, but the shape should remain contract-first and inference-friendly.

### Artifact contract

```ts
import type { Static, TSchema } from "typebox";

export type ArtifactContract<
  Id extends string = string,
  Schema extends TSchema = TSchema,
> = Readonly<{
  id: Id;
  schema: Schema;
}>;

export type ArtifactValueOf<C extends ArtifactContract<any, any>> = Static<C["schema"]>;

export function defineArtifact<const Id extends string, const Schema extends TSchema>(def: {
  id: Id;
  schema: Schema;
}): ArtifactContract<Id, Schema>;
```

### Step contract: artifacts block

```ts
export type ArtifactContractsByName = Readonly<Record<string, ArtifactContract>>;

export type StepArtifactsDecl = Readonly<{
  requires?: ArtifactContractsByName;
  provides?: ArtifactContractsByName;
}>;
```

### Artifact runtime

```ts
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { DependencyTagDefinition } from "@mapgen/engine/tags.js";

export type ArtifactRuntime<C extends ArtifactContract, TContext extends ExtendedMapContext> =
  Readonly<{
    contract: C;
    read: (context: TContext) => ArtifactValueOf<C>;
    tryRead: (context: TContext) => ArtifactValueOf<C> | null;
    publish: (context: TContext, value: ArtifactValueOf<C>) => ArtifactValueOf<C>;
    satisfies: DependencyTagDefinition<TContext>["satisfies"];
  }>;
```

### Implementer (contract -> runtime binding)

This borrows the “implement(contract)” pattern from oRPC: the contract defines the shape; implementation fills in runtime behavior with full type safety.

```ts
export type ArtifactRuntimeImpl<C extends ArtifactContract, TContext extends ExtendedMapContext> =
  Readonly<{
    validate?: (value: unknown, context: TContext) => readonly { message: string }[];
    freeze?: (value: ArtifactValueOf<C>) => ArtifactValueOf<C>; // default deep-freeze
    publish?: (context: TContext, value: ArtifactValueOf<C>) => void; // default store.set
    read?: (context: TContext) => unknown; // default store.get
  }>;

export function implementArtifacts<
  TContext extends ExtendedMapContext,
  const Provides extends ArtifactContractsByName,
>(decl: { provides: Provides }, impl: {
  [K in keyof Provides]: ArtifactRuntimeImpl<Provides[K], TContext>;
}): { [K in keyof Provides]: ArtifactRuntime<Provides[K], TContext> };
```

### Context surface (`ctx.deps`)

```ts
export type StepDeps<
  TContext extends ExtendedMapContext,
  const Provides extends ArtifactContractsByName,
  const Requires extends ArtifactContractsByName,
> = Readonly<{
  artifacts: {
    [K in keyof Provides | keyof Requires]:
      ArtifactRuntime<
        K extends keyof Provides ? Provides[K] :
        K extends keyof Requires ? Requires[K] :
        never,
        TContext
      >;
  };
  fields: /* see fields plan */;
  effects: /* see effects plan */;
}>;
```

---

## Artifact Lifecycle: Compile-Time vs Runtime

### Compile-time (authoring/compilation)

- Artifact contracts provide:
  - IDs/tags
  - schemas (for tooling/introspection)
- Recipe compilation can validate:
  - tag existence
  - no duplicate tag IDs across recipe-level + step-level artifacts
  - no name collisions in the `ctx.deps.artifacts` surface

### Runtime (execution)

Artifact runtime concerns live in:

- `ArtifactRuntime.publish(...)` (publication)
  - validation
  - immutability (freeze)
  - storage write
- `DependencyTagDefinition.satisfies(...)` (executor gating)
  - the “source of truth” for whether an artifact is truly satisfied
  - may be stricter than “exists in map” if needed

This fits current engine behavior:

- executor adds `tag` to satisfied set when a step provides it
- executor then enforces that `satisfies(...)` passes for each provided tag

---

## Fields & Effects (Context Shape)

Fields and effects can remain recipe-level dependencies (per the constraint), but the **access story** should match artifacts:

- authors should not be importing `M3_DEPENDENCY_TAGS.field.*` everywhere
- authors should not be importing effect tag IDs in most cases

Proposal direction (kept intentionally narrower than artifacts):

- `ctx.deps.fields`:
  - typed “ensure/require” helpers for `ctx.fields.<fieldName>`
  - optional allocation helpers for typed arrays (`ensureInt16(\"featureType\")`, etc.)
- `ctx.deps.effects`:
  - primarily a naming layer for `effect:*` tags that steps “provide”
  - optional helper: `ctx.deps.effects.<name>.verify()` (thin wrapper over `ctx.adapter.verifyEffect`)

Fields/effects should not regress into a second artifact-like system; they should be context ergonomics and dependency naming, not a parallel data model.

---

## Alternatives Considered (Bobbing + Weaving)

### A) Keep the current pattern, just reorganize imports

- Pros: tiny change
- Cons: does not address the root DX problem (contracts, satisfiers, schemas remain split; steps keep importing “random artifacts”)

Rejected.

### B) Define all artifacts in one recipe-level file (a “global artifacts.ts”)

- Pros: one obvious place to look
- Cons: violates “step owns artifacts” and encourages dumping-ground behavior

Rejected as the default; kept only as an explicit escape hatch for true recipe-level artifacts.

### C) Pass `artifacts` as a standalone parameter to `run(...)` (like `ops`)

- Pros: easiest to type and to make step-specific; no need to mutate context
- Cons: artifacts are “data products” and conceptually belong on context; would create a second “parallel” dependency parameter alongside ops

Not chosen, but compatible as an internal implementation tactic (e.g., `ctx.deps` can be derived from a bound artifact object).

### D) Replace `ctx.artifacts` (Map) with a new artifact API object

- Pros: very clean calling sites: `ctx.artifacts.featureIntents.read()`
- Cons: high churn: engine, executor satisfiers, existing code all assume `ctx.artifacts` is a `Map`

Not chosen as the first move; we instead add `ctx.deps` and keep `ctx.artifacts` as the low-level store.

---

## High-Level Implementation Sketch (Not Code Yet)

1. Introduce `defineArtifact` + runtime implementer in `packages/mapgen-core/src/authoring` (contract-first API).
2. Extend `defineStep` contract shape to support an `artifacts` block and expose its contracts for compilation.
3. Extend `createStep` (or step module shape) to accept artifact runtimes (for steps that provide artifacts).
4. Extend `createRecipe` to:
   - collect artifact contracts/runtimes from step modules
   - generate `DependencyTagDefinition[]` entries for those artifact tags (with satisfiers)
   - attach a stable `ctx.deps` surface at runtime
5. Migrate `mods/mod-swooper-maps` standard recipe:
   - delete/flatten `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` into step-owned artifacts
   - remove artifact tag definitions and satisfiers from `mods/mod-swooper-maps/src/recipes/standard/tags.ts`
   - update step contracts to declare artifact dependencies via the new step-centered artifact model
   - update step implementations to use `ctx.deps.artifacts.*` instead of importing artifact handlers
6. Add tests:
   - compile-time “tag catalog completeness” tests for a recipe module (unit test)
   - runtime executor test(s) asserting missing provides fail with actionable errors
   - type-level tests (tsc/vitest) ensuring IntelliSense works (where we already have patterns)

