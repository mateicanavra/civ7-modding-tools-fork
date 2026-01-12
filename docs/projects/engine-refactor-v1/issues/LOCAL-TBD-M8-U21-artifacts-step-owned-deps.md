---
id: LOCAL-TBD-M8-U21
title: "[M8] Artifacts DX: step-owned artifact contracts + single-path deps access"
state: planned
priority: 1
estimate: 8
project: engine-refactor-v1
milestone: M8
assignees: []
labels: [architecture, dx]
parent: null
children: []
blocked_by: []
blocked: []
related_to:
  - LOCAL-TBD-M8-U18
  - LOCAL-TBD-M7-D1
  - LOCAL-TBD-M7-C1
---

## TL;DR
- Make artifacts **step-owned** and **contract-first**:
  - Each produced artifact is defined in the producing step’s `contract.ts` (canonical `name` + `id` + `schema`).
  - Artifact runtime behavior (validation, freezing, satisfies) lives next to the producing step implementation.
- Eliminate ad-hoc artifact imports inside steps:
  - Step `run(...)` receives a first-class `deps` parameter.
  - Steps access artifacts via `deps.artifacts.<artifactName>.read(ctx)` / `.publish(ctx, value)`.
- Remove manual artifact satisfier wiring:
  - `createRecipe(...)` composes artifact tag definitions + satisfiers automatically from step modules.
- Single path per capability:
  - No `ctx.deps` path (not even “internal”).
  - No `read`/`publish` override hooks; publication/read is canonical via `ctx.artifacts` store + runtime wrapper.

Primary reference (source of truth):
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/DX-ARTIFACTS-PROPOSAL.md` (commit `7870be5e5`)

## Context / why this exists
Artifacts are currently scattered across:
- `mods/mod-swooper-maps/src/recipes/standard/tags.ts` (artifact tag IDs + satisfiers)
- `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` (artifact schemas and ad-hoc runtime validators)
- step implementations (random imports like `featureIntentsArtifact`)

This creates:
- noisy and redundant imports,
- drift between tag IDs, schemas, satisfiers, and step logic,
- manual wiring that contradicts the contract-first DX we’ve been building (`defineStep/createStep`, bound ops surface, etc.).

The engine already has a clean gating primitive (`TagRegistry` + `DependencyTagDefinition.satisfies` + executor `satisfied` set). This issue keeps that execution model and fixes the authoring model.

## Design goals
- Step-owned artifacts:
  - the artifact is defined where it is produced.
- Contract vs runtime separation:
  - contract: stable `name` + `id` + schema metadata
  - runtime: validate/freeze/satisfies, publish enforcement
- Single-path DX:
  - step code never imports “artifact helpers”
  - one official access path: `deps` parameter
  - one canonical publication/read path: `ctx.artifacts` store via wrapper
- Strong guardrails:
  - no nested artifact shapes
  - no per-step aliasing (“renaming”) of artifacts
  - no shims/fallbacks; migrate everything to the new model

## Non-goals
- Runtime TypeBox validation (`TypeCompiler`, `Value.*`, etc.) in artifact runtime paths (disallowed by lint policy).
- Filesystem-based codegen for registries.
- Re-architecting fields/effects storage; fields/effects remain recipe-level dependencies for now.

## Mental model (target)
- Artifacts are published data products keyed by dependency tag ID (e.g. `artifact:ecology.featureIntents@v1`) stored in `ctx.artifacts`.
- Steps:
  - **publish** artifacts (producer steps)
  - **read/consume** artifacts (consumer steps)
- Recipe compilation:
  - composes step-owned artifact contracts into a recipe-level artifact registry and tag definitions,
  - enforces gating via `DependencyTagDefinition.satisfies`,
  - threads a typed `deps` surface into each step’s `run(...)`.

## Proposed API (mapgen-core) — explicit signatures
These signatures are the contract for author DX, inference, and completion.

### `defineArtifact`
```ts
import type { Static, TSchema } from "typebox";

export type ArtifactContract<
  Name extends string = string,
  Id extends string = string,
  Schema extends TSchema = TSchema,
> = Readonly<{
  name: Name; // canonical, flat, globally meaningful
  id: Id; // dependency tag id (must start with "artifact:")
  schema: Schema; // metadata only (not used for runtime validation)
}>;

export type ArtifactValueOf<C extends ArtifactContract<any, any, any>> = Static<C["schema"]>;

export function defineArtifact<
  const Name extends string,
  const Id extends string,
  const Schema extends TSchema,
>(def: {
  name: Name;
  id: Id;
  schema: Schema;
}): ArtifactContract<Name, Id, Schema>;
```

### Step contract artifacts block
```ts
export type StepArtifactsDecl = Readonly<{
  requires?: readonly ArtifactContract[];
  provides?: readonly ArtifactContract[];
}>;
```

### Artifact runtime wrapper (canonical read/publish path)
```ts
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { DependencyTagDefinition } from "@mapgen/engine/tags.js";

export type RequiredArtifactRuntime<
  C extends ArtifactContract,
  TContext extends ExtendedMapContext,
> = Readonly<{
  contract: C;
  read: (context: TContext) => ArtifactValueOf<C>;
  tryRead: (context: TContext) => ArtifactValueOf<C> | null;
}>;

export type ProvidedArtifactRuntime<
  C extends ArtifactContract,
  TContext extends ExtendedMapContext,
> = RequiredArtifactRuntime<C, TContext> &
  Readonly<{
    publish: (context: TContext, value: ArtifactValueOf<C>) => ArtifactValueOf<C>;
    satisfies: DependencyTagDefinition<TContext>["satisfies"];
  }>;
```

### `implementArtifacts` (bind contracts to runtime behavior)
Single binding surface; no `read`/`publish` overrides.

```ts
type ArtifactsByName<T extends readonly ArtifactContract[]> = {
  [C in T[number] as C["name"]]: C;
};

export type ArtifactRuntimeImpl<C extends ArtifactContract, TContext extends ExtendedMapContext> =
  Readonly<{
    validate?: (value: unknown, context: TContext) => readonly { message: string }[];
    freeze?: (value: ArtifactValueOf<C>) => ArtifactValueOf<C>; // default deep-freeze
    satisfies?: DependencyTagDefinition<TContext>["satisfies"]; // default uses store.has + validate (if provided)
  }>;

export function implementArtifacts<
  TContext extends ExtendedMapContext,
  const Provides extends readonly ArtifactContract[],
>(
  provides: Provides,
  impl: {
    [K in keyof ArtifactsByName<Provides>]: ArtifactRuntimeImpl<ArtifactsByName<Provides>[K], TContext>;
  }
): {
  [K in keyof ArtifactsByName<Provides>]: ProvidedArtifactRuntime<ArtifactsByName<Provides>[K], TContext>;
};
```

### Step deps surface (single official access path)
```ts
export type StepDeps<
  TContext extends ExtendedMapContext,
  const Requires extends readonly ArtifactContract[],
  const Provides extends readonly ArtifactContract[],
> = Readonly<{
  artifacts: {
    [K in keyof ArtifactsByName<Requires>]: RequiredArtifactRuntime<ArtifactsByName<Requires>[K], TContext>;
  } & {
    [K in keyof ArtifactsByName<Provides>]: ProvidedArtifactRuntime<ArtifactsByName<Provides>[K], TContext>;
  };
  fields: unknown; // out of scope for this issue to fully type/thread
  effects: unknown; // out of scope for this issue to fully type/thread
}>;
```

## End-to-end authoring examples (target DX)
These are “what it should feel like” examples for step authors after this issue lands.

### Example A: producer step publishes an artifact (no artifact imports)
Target file layout (two-file split, consistent with standard steps):
- `.../steps/features-plan/contract.ts` (contract)
- `.../steps/features-plan/index.ts` (runtime module)

`contract.ts`:
```ts
import { Type, defineArtifact, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";

export const FeatureIntentsArtifact = defineArtifact({
  name: "featureIntents",
  id: "artifact:ecology.featureIntents@v1",
  schema: Type.Object({
    vegetation: Type.Array(Type.Object({ x: Type.Number(), y: Type.Number(), weight: Type.Optional(Type.Number()) })),
    wetlands: Type.Array(Type.Object({ x: Type.Number(), y: Type.Number(), weight: Type.Optional(Type.Number()) })),
    reefs: Type.Array(Type.Object({ x: Type.Number(), y: Type.Number(), weight: Type.Optional(Type.Number()) })),
    ice: Type.Array(Type.Object({ x: Type.Number(), y: Type.Number(), weight: Type.Optional(Type.Number()) })),
  }),
});

const FeaturesPlanStepContract = defineStep({
  id: "features-plan",
  phase: "ecology",
  artifacts: {
    requires: [
      /* example: BiomeClassificationArtifact, PedologyArtifact, HeightfieldArtifact */
    ],
    provides: [FeatureIntentsArtifact],
  },
  ops: {
    vegetation: ecology.ops.planVegetation,
    wetlands: ecology.ops.planWetlands,
    reefs: ecology.ops.planReefs,
    ice: ecology.ops.planIce,
  },
  schema: Type.Object({}),
});

export default FeaturesPlanStepContract;
```

`index.ts`:
```ts
import { createStep, implementArtifacts, type Static } from "@swooper/mapgen-core/authoring";
import type { ExtendedMapContext } from "@swooper/mapgen-core";

import FeaturesPlanStepContract from "./contract.js";

type FeaturesPlanConfig = Static<typeof FeaturesPlanStepContract.schema>;

const artifacts = implementArtifacts<ExtendedMapContext>(FeaturesPlanStepContract.artifacts!.provides!, {
  featureIntents: {
    freeze: (value) => value,
    validate: (value) => {
      if (typeof value !== "object" || !value) return [{ message: "featureIntents must be an object" }];
      return [];
    },
  },
});

export default createStep(FeaturesPlanStepContract, {
  artifacts,
  run: (ctx, config: FeaturesPlanConfig, ops, deps) => {
    const { width, height } = ctx.dimensions;

    // Reads are also via deps (no helper imports).
    // const classification = deps.artifacts.biomeClassification.read(ctx);
    // const pedology = deps.artifacts.pedology.read(ctx);
    // const heightfield = deps.artifacts.heightfield.read(ctx);

    const vegetationPlan = ops.vegetation.run({ width, height }, config.vegetation);
    const wetlandsPlan = ops.wetlands.run({ width, height }, config.wetlands);
    const reefsPlan = ops.reefs.run({ width, height }, config.reefs);
    const icePlan = ops.ice.run({ width, height }, config.ice);

    deps.artifacts.featureIntents.publish(ctx, {
      vegetation: vegetationPlan.placements,
      wetlands: wetlandsPlan.placements,
      reefs: reefsPlan.placements,
      ice: icePlan.placements,
    });
  },
});
```

Key DX outcomes:
- The only artifact identifier is the artifact contract in the step contract.
- Step runtime never imports `.../artifacts.ts` helper modules.
- `deps.artifacts.featureIntents` is fully typed and autocompletes.

### Example B: consumer step reads an artifact (no artifact imports)
`contract.ts`:
```ts
import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";

import { FeatureIntentsArtifact } from "../features-plan/contract.js";

const FeaturesApplyStepContract = defineStep({
  id: "features-apply",
  phase: "ecology",
  artifacts: {
    requires: [FeatureIntentsArtifact],
    provides: [],
  },
  ops: {
    apply: ecology.ops.applyFeatures,
  },
  schema: Type.Object({}),
});

export default FeaturesApplyStepContract;
```

`index.ts`:
```ts
import { createStep, type Static } from "@swooper/mapgen-core/authoring";
import FeaturesApplyStepContract from "./contract.js";

type FeaturesApplyConfig = Static<typeof FeaturesApplyStepContract.schema>;

export default createStep(FeaturesApplyStepContract, {
  run: (ctx, config: FeaturesApplyConfig, ops, deps) => {
    const intents = deps.artifacts.featureIntents.read(ctx);

    const merged = ops.apply.run(
      { vegetation: intents.vegetation, wetlands: intents.wetlands, reefs: intents.reefs, ice: intents.ice },
      config.apply
    );

    // If the step writes fields/effects, that stays on ctx for now:
    // ctx.fields.featureType = ...
    // deps.fields/... remains a future enhancement (follow-up issue).
    void merged;
  },
});
```

## Architecture diagram (artifact ownership + gating)
```mermaid
flowchart LR
  A[Step contract<br/>defineStep + artifacts.requires/provides] --> B[createStep module<br/>run(ctx, config, ops, deps)]
  B --> C[createRecipe collects step contracts]
  B --> D[implementArtifacts binds provides to runtime<br/>(validate/freeze/satisfies)]

  C --> E[Recipe compilation]
  E --> F[StepRegistry]
  E --> G[TagRegistry (dependency registry)]
  D --> G

  B --> H[PipelineExecutor executes plan]
  H --> I[ctx.artifacts store]
  B --> I

  G --> H
  I --> G
```

## Implementation plan (concrete)

### A) Add authoring primitives for artifacts (`packages/mapgen-core`)
1. Add artifact contract helper:
   - New: `packages/mapgen-core/src/authoring/artifact/contract.ts`
     - `defineArtifact`
     - `ArtifactContract`, `ArtifactValueOf`
     - validate invariants:
       - `id` starts with `artifact:`
       - `name` is non-empty and matches a conservative identifier regex (e.g. `^[a-zA-Z][a-zA-Z0-9_]*$`)
2. Add artifact runtime wrapper + binder:
   - New: `packages/mapgen-core/src/authoring/artifact/runtime.ts`
     - `implementArtifacts(provides, impl)`
     - canonical wrapper behavior:
       - `read(ctx)`:
         - `ctx.artifacts.get(contract.id)` must exist
         - throws an actionable error if missing
       - `tryRead(ctx)` returns typed value or `null`
       - `publish(ctx, value)`:
         - runs `freeze` (default deep-freeze)
         - runs `validate` (if provided) and throws if errors
         - writes to `ctx.artifacts.set(contract.id, value)`
       - `satisfies(ctx, state)`:
         - default: `ctx.artifacts.has(contract.id)` AND `validate(...)` passes (if provided)
         - uses `impl.satisfies` if provided for domain-specific rules
3. Export from the canonical authoring entrypoint:
   - Update `packages/mapgen-core/src/authoring/index.ts`
     - export `defineArtifact`, `implementArtifacts`, and the relevant types.

### B) Extend `defineStep` to support `contract.artifacts` and auto-gating
Files:
- `packages/mapgen-core/src/authoring/step/contract.ts`

Changes:
1. Extend `StepContract` to include optional `artifacts?: StepArtifactsDecl`.
2. Enforce “no nested artifacts” structurally by using arrays (not objects) in `StepArtifactsDecl`.
3. Auto-merge artifact tag IDs into gating:
   - `requires = uniq([...def.requires, ...def.artifacts?.requires?.map(a => a.id) ?? []])`
   - `provides = uniq([...def.provides, ...def.artifacts?.provides?.map(a => a.id) ?? []])`
4. Guardrails (hard errors):
   - Throw if any artifact `id` already appears in `def.requires`/`def.provides` (no double-entry bookkeeping).
   - Throw if a provided artifact `name` is duplicated within the same step contract.
   - Throw if a required artifact `name` collides with a provided artifact `name` within the same step (names must remain unambiguous in `deps.artifacts`).

### C) Thread `deps` as a first-class runtime parameter
Files:
- `packages/mapgen-core/src/authoring/types.ts`
- `packages/mapgen-core/src/authoring/step/create.ts`
- `packages/mapgen-core/src/authoring/recipe.ts`

Changes:
1. Update step runtime signature everywhere:
   - from: `run(context, config, ops)`
   - to: `run(context, config, ops, deps)`
2. Update `createStep` types accordingly (`StepImpl`).
3. Update `createRecipe` to:
   - build a recipe-level artifact registry at construction time by collecting:
     - all `contract.artifacts.provides` + `contract.artifacts.requires` across all steps
     - per-step provided artifact runtimes from `stepModule.artifacts` (new optional property on step modules; see next section)
   - create a per-step `deps` object that contains:
     - `deps.artifacts.<name>` wrappers for that step’s required + provided artifacts
     - (placeholder `fields`/`effects` objects; do not expand scope here beyond enabling future work)
   - pass `deps` to the authored `run(...)` handler inside the wrapper `MapGenStep.run(...)`.

### D) Compose artifact tag definitions automatically in `createRecipe`
Files:
- `packages/mapgen-core/src/authoring/recipe.ts`

Changes:
1. Extend tag definition collection:
   - For every artifact contract discovered in the recipe, register a `DependencyTagDefinition` with:
     - `id = artifact.id`
     - `kind = "artifact"`
     - `owner` populated where possible (`pkg`, `phase`, `stepId` for producer ownership)
     - `satisfies` sourced from:
       - the provided artifact runtime wrapper if available, else
       - a default satisfier derived from the contract + `validate` (if provided)
2. Keep explicit `input.tagDefinitions` as-is for non-artifacts (effects/fields) and merge them last (explicit overrides still win).

### E) Update step module shape to carry provided artifact runtimes
We need a place for producer steps to attach artifact runtime wrappers so recipe compilation can:
- wire `deps.artifacts.<name>.publish(...)`, and
- generate satisfiers for those artifact tag IDs.

Implementation:
1. Extend the step module type (authoring) to optionally include:
   - `artifacts?: Record<string, ProvidedArtifactRuntime<...>>` (exact typing can be inferred from the contract’s provides list).
2. `createStep(contract, { run, normalize, artifacts })` should forward this property.

### F) Migrate `mods/mod-swooper-maps` standard recipe (no shims)
Goals:
- remove manual artifact satisfiers from `STANDARD_TAG_DEFINITIONS`
- eliminate step implementation imports from `recipes/standard/artifacts.ts`
- ensure producers publish via `deps.artifacts.*.publish(...)`

Concrete steps:
1. Inventory and assign each artifact tag to its producer step:
   - from `mods/mod-swooper-maps/src/recipes/standard/tags.ts` (artifact list + satisfiers)
   - from `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` (artifact schemas + validators)
2. For each produced artifact:
   - define it in the producer step contract via `defineArtifact({ name, id, schema })`
   - add it to `contract.artifacts.provides`
   - implement runtime wrapper via `implementArtifacts(contract.artifacts.provides, { ... })`
   - update the producer step implementation to publish via `deps.artifacts.<name>.publish(ctx, value)`
3. For each consumed artifact:
   - add it to the consumer step contract via `contract.artifacts.requires: [thatArtifactContract]`
   - update the consumer step implementation to read via `deps.artifacts.<name>.read(ctx)`
4. Remove/trim the old registries:
   - delete all artifact entries from `STANDARD_TAG_DEFINITIONS` once satisfiers are provided automatically by `createRecipe`
   - delete or radically shrink `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` by moving validations into producer step runtime `validate` hooks
5. Update all affected step `run(...)` handlers to the new signature (`(ctx, config, ops, deps)`), including the foundation step which currently uses `context.artifacts.set(...)`.

Artifacts to migrate (non-exhaustive list; must be completed):
- Foundation artifacts:
  - `artifact:foundation.plates@v1`, `artifact:foundation.dynamics@v1`, `artifact:foundation.seed@v1`, `artifact:foundation.diagnostics@v1`, `artifact:foundation.config@v1`
- Standard recipe artifacts:
  - `artifact:heightfield`, `artifact:climateField`, `artifact:storyOverlays`, `artifact:riverAdjacency`
  - `artifact:ecology.biomeClassification@v1`, `artifact:ecology.soils@v1`, `artifact:ecology.resourceBasins@v1`, `artifact:ecology.featureIntents@v1`
  - narrative motifs/corridors artifacts currently listed in `STANDARD_TAG_DEFINITIONS`
  - placement inputs/outputs artifacts (`artifact:placementInputs@v1`, `artifact:placementOutputs@v1`)

### G) Tests / verification
Add tests at the mapgen-core layer (this is architecture wiring; tests are required):
1. Unit: step contract gating merge
   - `defineStep` merges artifact tag IDs into `requires`/`provides`.
   - throws on duplicates (“artifact tag listed both in artifacts.* and requires/provides”).
2. Unit: recipe compilation tag definitions
   - `createRecipe` registers artifact tags with satisfiers derived from artifact runtimes.
   - `TagRegistry.get(id).satisfies` exists for artifact tags discovered from steps.
3. Runtime: executor enforcement
   - If a step lists an artifact in `provides` but does not publish it via wrapper, executor throws `UnsatisfiedProvidesError`.
   - If artifact `validate` fails, executor throws `UnsatisfiedProvidesError`.

Repo verification commands (expected):
- `pnpm check`
- `pnpm -C mods/mod-swooper-maps check`
- `pnpm -C mods/mod-swooper-maps test`

## Ideal file structure (one end-to-end slice)
This is a representative slice of “what good looks like” after the cutover, aligned with the organization principles in:
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-appendix-target-trees.md`

```text
mods/mod-swooper-maps/src/
├─ domain/
│  └─ ecology/
│     └─ index.ts                  # defineDomain/createDomain + ops router (existing domain DX)
└─ recipes/
   └─ standard/
      ├─ recipe.ts                 # defineRecipe(...) contract composition
      ├─ runtime.ts                # runtime entrypoint (create+execute)
      ├─ deps/
      │  ├─ fields.ts              # recipe-level field tag defs (allowed standalone)
      │  └─ effects.ts             # recipe-level effect tag defs (allowed standalone)
      └─ stages/
         └─ ecology/
            ├─ index.ts            # createStage(...) from step modules
            └─ steps/
               ├─ features-plan/
               │  ├─ contract.ts   # defineStep + defineArtifact (produced artifacts)
               │  └─ index.ts      # createStep + implementArtifacts + run(ctx, config, ops, deps)
               └─ features-apply/
                  ├─ contract.ts   # defineStep + artifacts.requires (imports artifact contracts only)
                  └─ index.ts      # createStep + run(ctx, config, ops, deps)
```

File placement rules (for authoring DX):
- Artifact contracts live with their producer step contract (step-owned).
- Artifact runtime behavior (validate/freeze/satisfies) lives with the producer step implementation.
- Fields/effects remain recipe-level for now (in `deps/`) until a follow-up completes their `deps.*` typing/threading story.

## Terminology alignment: rename “Tag” → “Dependency”
The code already uses “dependency” semantics (e.g., `DependencyTagDefinition`, `validateDependencyTag`) but still exposes the registry as `TagRegistry`.

Reference:
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-027-dependency-terminology-and-registry-naming.md`

### Current implementation identifiers (source of truth)
- `packages/mapgen-core/src/engine/tags.ts`:
  - `export class TagRegistry`
  - `export interface DependencyTagDefinition`
  - `export type DependencyTagKind`
  - `export function validateDependencyTag`
- `packages/mapgen-core/src/engine/index.ts` re-exports `TagRegistry` and the dependency-tag helpers.

### Target terminology (spec intent)
- `TagRegistry` → `DependencyRegistry`
- `DependencyTagDefinition` → `DependencyKeyDefinition` (optional second step; improves clarity)
- `DependencyTag` (alias in spec inputs) → `DependencyKey` / `DependencyId`

### What it would take (scope)
This is a repo-wide rename touching:
- engine runtime exports (`@mapgen/engine/index.ts`)
- step registry constructor options (`StepRegistry` uses `tags?: TagRegistry`)
- tests (`packages/mapgen-core/test/pipeline/tag-registry.test.ts` and others)
- content imports that refer to “tag” terminology (contracts, recipe wiring)
- docs/spec language where it diverges

Recommendation for sequencing:
1. Land the artifacts DX cutover first (this issue), to avoid mixing large mechanical rename churn with behavioral changes.
2. Follow up with a dedicated rename issue that:
   - performs the identifier rename (`TagRegistry` → `DependencyRegistry`) and file rename (`tags.ts` → `dependencies.ts`),
   - updates all imports,
   - updates docs to use dependency terminology consistently,
   - keeps the same runtime semantics (pure rename).

## Acceptance Criteria
- Steps define produced artifacts via `defineArtifact` in the producing step’s `contract.ts`.
- Step artifact declarations are flat arrays (`contract.artifacts.requires/provides`), and runtime access is flat (`deps.artifacts.<name>`): no nested/grouped artifacts.
- Step implementations do not import artifact helper modules (e.g. no `featureIntentsArtifact` imports); they use `deps.artifacts.<name>.*` instead.
- Only one official runtime access path exists:
  - step `run(ctx, config, ops, deps)`
  - no `ctx.deps` usage exists in the repo.
- Artifact publication/read behavior is canonical:
  - no `read`/`publish` override hooks exist in the authoring API.
  - publishing uses the wrapper and writes to `ctx.artifacts`.
- Manual artifact satisfier/tag wiring in `mods/mod-swooper-maps/src/recipes/standard/tags.ts` is removed (artifacts only).
- `createRecipe` automatically registers artifact tag definitions with satisfiers so executor gating correctly enforces requires/provides.
- Tests exist for the new wiring and pass.
- The authoring DX shown in “End-to-end authoring examples” is achievable without extra helper files (artifact access is only via `deps`).
- `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` no longer serves as an artifact contract registry; artifact contracts live on producer steps.

## Alternatives considered (brief)
- Keep manual artifact satisfiers in recipe tag files:
  - Rejected: preserves drift and wiring noise.
- Attach deps to `ctx` (`ctx.deps`):
  - Rejected: introduces a second access path and “ambient” dependencies.
- Allow overriding `read`/`publish` via `ArtifactRuntimeImpl`:
  - Rejected: multiple semantic paths for publication/read creates drift and indirection; keep only validate/freeze/satisfies.

## Notes / followups
- This issue intentionally does not fully solve “step contract imports for fields/effects tags”; it focuses on artifacts + threading `deps`.
- Once artifacts are stable, follow up with a fields/effects `deps.*` typing and a recipe-level dependency contract that reduces tag-import noise in contract files without introducing new access paths.
