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

<!-- Path roots -->
`= packages/mapgen-core` (authoring SDK + engine runtime)
`= mods/mod-swooper-maps` (standard recipe migration target)
`= docs/projects/engine-refactor-v1/resources/spec/recipe-compile` (canonical spec directory)

## Paper Trail (read-first)
- Primary design (source of truth): `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/DX-ARTIFACTS-PROPOSAL.md`
- Terminology intent (“Tag” → “Dependency”): `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-027-dependency-terminology-and-registry-naming.md`
- Engine gating reality (source of truth):
  - `packages/mapgen-core/src/engine/tags.ts`
  - `packages/mapgen-core/src/engine/PipelineExecutor.ts`
- Current standard recipe drift sources (to be eliminated for artifacts):
  - `mods/mod-swooper-maps/src/recipes/standard/tags.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts`

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

## Work breakdown (this parent issue)
This issue is intentionally a “parent issue” and should be implemented as a cohesive slice, but it contains sub-units that should be independently reviewable.

```yaml
issues:
  - id: U21-A
    title: "Add artifact authoring primitives (defineArtifact, implementArtifacts)"
  - id: U21-B
    title: "Extend defineStep: artifacts.requires/provides (flat) + single-path enforcement"
  - id: U21-C
    title: "Thread deps into step runtime: run(ctx, config, ops, deps)"
  - id: U21-D
    title: "createRecipe auto-wires artifact tag definitions + satisfiers"
  - id: U21-E
    title: "StepModule carries provided artifact runtimes"
  - id: U21-F
    title: "Migrate mod-swooper-maps standard recipe (no shims)"
  - id: U21-G
    title: "Add tests + verification harness for new wiring"
```

## Prework Findings (Complete)

### 1) Current artifact wiring (where drift comes from)
- Recipe-level artifact tag ids + satisfiers live in `mods/mod-swooper-maps/src/recipes/standard/tags.ts` (`STANDARD_TAG_DEFINITIONS`).
- Artifact “handlers” live in `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` (e.g. `heightfieldArtifact.get/set`, plus `publish*Artifact` helpers).
- Many step implementations import these helpers directly, creating import noise + duplicate ownership:
  - Example imports in steps: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/index.ts`
  - Example consumer: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts`

### 2) Canonical gating model (what must remain true)
The engine gating model is already clean and should remain the enforcement mechanism:
- `TagRegistry` holds `DependencyTagDefinition` (may include `satisfies`).
- `PipelineExecutor` adds each `provides` tag to the `satisfied` set *then* checks `isDependencyTagSatisfied(tag, ...)`.
  - `isDependencyTagSatisfied` first checks `state.satisfied.has(tag)` before calling `definition.satisfies`.

Key reality checks:
- A tag definition can omit `satisfies` and still gate as a pure “provided” marker.
- If `satisfies` exists, it is the single place runtime postconditions live.

### 3) Standard recipe artifact inventory (current)
This issue must treat the following as artifacts to migrate away from manual recipe wiring:
- Source of truth list: `mods/mod-swooper-maps/src/recipes/standard/tags.ts` (`M3_DEPENDENCY_TAGS.artifact.*`)

```yaml
artifacts:
  # foundation artifacts (currently published directly via ctx.artifacts.set in producer)
  - id: artifact:foundation.plates@v1
  - id: artifact:foundation.dynamics@v1
  - id: artifact:foundation.seed@v1
  - id: artifact:foundation.diagnostics@v1
  - id: artifact:foundation.config@v1

  # standard recipe artifacts (current)
  - id: artifact:heightfield
  - id: artifact:climateField
  - id: artifact:storyOverlays
  - id: artifact:riverAdjacency
  - id: artifact:ecology.biomeClassification@v1
  - id: artifact:ecology.soils@v1
  - id: artifact:ecology.resourceBasins@v1
  - id: artifact:ecology.featureIntents@v1
  - id: artifact:narrative.corridors@v1
  - id: artifact:narrative.motifs.margins@v1
  - id: artifact:narrative.motifs.hotspots@v1
  - id: artifact:narrative.motifs.rifts@v1
  - id: artifact:narrative.motifs.orogeny@v1
  - id: artifact:placementInputs@v1
  - id: artifact:placementOutputs@v1
```

## Open Questions (explicit unknowns)
These must be resolved explicitly during implementation. Default stance: add a targeted prework prompt rather than guessing.

### Trivial / mechanical (expected to resolve quickly)
1) **Artifact name constraints** (enforced by `defineArtifact`)
   - Proposed: `name` must be a conservative identifier (`^[a-zA-Z][a-zA-Z0-9_]*$`) to make `deps.artifacts.<name>` flat + stable.
   - Confirm whether camelCase is required, or if `_` should be allowed.
2) **Default freeze behavior**
   - Typed arrays cannot be made immutable by `Object.freeze` (element mutation still possible).
   - Decide what “freeze” means for typed arrays (likely “return as-is” + rely on discipline) vs deep-freeze only for plain objects/arrays.
3) **Error shape**
   - `validate` returns `readonly { message: string }[]`.
   - Decide whether wrapper errors should always throw `Error` with a standardized prefix, or introduce a typed error class (prefer keeping it simple unless tests need structured error fields).

### Larger design / architectural (requires a deliberate decision)
1) **Multi-producer artifacts (single canonical contract)**
   - Example: `artifact:ecology.biomeClassification@v1` is currently written by multiple steps (`biomes` and `biome-edge-refine`).
   - Under “step-owned” contracts, decide the canonical home for the `defineArtifact(...)` contract when multiple producers exist:
     - Option A: treat it as owned by the *first producer* step contract; other producer steps import the contract and list it in `artifacts.provides`.
     - Option B: promote it to a domain-level artifact contract module (still a single canonical file), while preserving producer runtime validation ownership.
   - This decision affects DX and file layout; cannot be silently assumed.
2) **`artifact:storyOverlays` cutover**
   - Today the satisfier checks `ctx.overlays` instead of `ctx.artifacts`.
   - Under this issue’s “single canonical publication/read path” rule, decide whether:
     - Option A: start publishing overlays through the artifact store (and keep `ctx.overlays` as an internal implementation detail), or
     - Option B: treat `overlays` as non-artifact recipe state and remove `artifact:storyOverlays` entirely (likely out of scope if it breaks consumers).
3) **Validation source of truth**
   - Some artifacts have “assert-style” validators in mapgen-core (`validateFoundation*Artifact(...)` throws).
   - The proposed `validate` surface is “collect errors” style.
   - Decide the canonical adapter layer: wrap assert-validators into “issues array” and standardize, or allow `validate` to throw and normalize to issues in the wrapper.

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
import { createStep } from "@mapgen/authoring/steps";
import { implementArtifacts, type Static } from "@swooper/mapgen-core/authoring";
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
import { createStep } from "@mapgen/authoring/steps";
import { type Static } from "@swooper/mapgen-core/authoring";
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
This section is intended to be executable without back-and-forth.
If a requirement below is ambiguous, add a prework prompt and stop before silently deciding.

## U21-A) Add artifact authoring primitives (`= packages/mapgen-core`)
- **Complexity × parallelism:** medium × low (core types + runtime wrapper; touches authoring exports + tests)

**Files (expected):**
```yaml
files:
  - path: packages/mapgen-core/src/authoring/artifact/contract.ts
    notes: defineArtifact + contract/value types + invariants
  - path: packages/mapgen-core/src/authoring/artifact/runtime.ts
    notes: implementArtifacts + wrapper read/tryRead/publish + default satisfies
  - path: packages/mapgen-core/src/authoring/index.ts
    notes: export defineArtifact/implementArtifacts + related types
```

**In scope:**
- Add `defineArtifact` and contract/value helper types.
- Add `implementArtifacts` binder which returns wrappers exposing canonical `read/tryRead/publish` and `satisfies`.
- Ensure the wrapper uses `ctx.artifacts` as the sole backing store.

**Out of scope:**
- Any second artifact access surface (no `ctx.deps`, no “alternate publish hooks”).
- Runtime schema validation via TypeBox runtime compilers.

**Acceptance criteria:**
- [ ] `defineArtifact({ name, id, schema })` exists and validates invariants (id prefix, name format, non-empty).
- [ ] `implementArtifacts(provides, impl)` exists and returns typed wrappers keyed by artifact `name`.
- [ ] Wrapper `publish(ctx, value)` stores to `ctx.artifacts` under `contract.id` and returns the stored value.
- [ ] Wrapper `read(ctx)` throws a clear error when missing.
- [ ] Wrapper `tryRead(ctx)` returns `null` on missing.
- [ ] Wrapper exposes a `satisfies` function usable as `DependencyTagDefinition<TContext>["satisfies"]`.

## U21-B) Extend `defineStep`: artifacts block + flat merge enforcement
- **Complexity × parallelism:** low × low (type + runtime invariants)

**Files (expected):**
```yaml
files:
  - path: packages/mapgen-core/src/authoring/step/contract.ts
    notes: add contract.artifacts + merge to requires/provides + duplicate protection
```

**In scope:**
- Extend `StepContract` to optionally include `artifacts: { requires?: ArtifactContract[]; provides?: ArtifactContract[] }`.
- Merge `artifacts.*.id` into `requires`/`provides` (flat arrays only).
- Enforce “single-source of truth” constraints (no duplicates, no mixing direct tag ids with artifact ids without clarity).

**Acceptance criteria:**
- [ ] `defineStep({ artifacts: ... })` results in `contract.requires/provides` including the artifact ids.
- [ ] Duplicate artifact ids across requires/provides are rejected with an actionable error.
- [ ] Any attempt to create nested artifact surfaces (e.g. invalid names like `motifs.rifts`) fails via `defineArtifact` constraints.

## U21-C) Thread `deps` into step runtime (`run(ctx, config, ops, deps)`)
- **Complexity × parallelism:** high × low (type plumbing affects recipe wiring + mod migration)

**Files (expected):**
```yaml
files:
  - path: packages/mapgen-core/src/authoring/step/create.ts
    notes: extend StepImpl signature + StepModule typing
  - path: packages/mapgen-core/src/authoring/types.ts
    notes: extend Step type run signature
  - path: packages/mapgen-core/src/authoring/recipe.ts
    notes: authored.run invocation includes deps (4th param)
```

**Acceptance criteria:**
- [ ] All step runs can be authored as `run(ctx, config, ops, deps)`.
- [ ] There is no `ctx.deps` surface anywhere in the repo (enforced by grep verification).
- [ ] `deps.artifacts.<name>` is typed based on the step contract’s artifacts.requires/provides.

## U21-D) `createRecipe` auto-wires artifact tag definitions + satisfiers
- **Complexity × parallelism:** medium × low (recipe compilation must synthesize tag definitions)

**Files (expected):**
```yaml
files:
  - path: packages/mapgen-core/src/authoring/recipe.ts
    notes: discover artifact runtimes from steps + register tag defs with satisfies
  - path: packages/mapgen-core/src/engine/tags.ts
    notes: no behavior change; only consume existing satisfies hook
```

**In scope:**
- Artifact tags are registered with `satisfies` derived from producer artifact runtime wrappers.
- Explicit `input.tagDefinitions` remains the override/extension path for non-artifacts (effects/fields).

**Acceptance criteria:**
- [ ] Artifact tag defs are present in the registry even if not explicitly provided in `input.tagDefinitions`.
- [ ] Executor correctly fails with `UnsatisfiedProvidesError` when a producer step does not publish its declared artifact.

## U21-E) Step module carries provided artifact runtimes (for compilation + deps typing)
- **Complexity × parallelism:** medium × low (step module shape changes thread through recipe compilation)

**Files (expected):**
```yaml
files:
  - path: packages/mapgen-core/src/authoring/types.ts
    notes: extend Step/StepModule shape to optionally include artifacts runtimes
  - path: packages/mapgen-core/src/authoring/step/create.ts
    notes: accept `artifacts` alongside normalize/run
```

**Acceptance criteria:**
- [ ] Producer steps can export `artifacts` runtime wrappers via `createStep(contract, { artifacts, run })`.
- [ ] `createRecipe` can discover those wrappers and register satisfiers.

## U21-F) Migrate standard recipe (`= mods/mod-swooper-maps`) with no shims
- **Complexity × parallelism:** high × low (many call sites; must remain green end-to-end)

**Files (expected, partial):**
```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/tags.ts
    notes: remove artifact satisfiers/defs only; keep field/effect defs as needed
  - path: mods/mod-swooper-maps/src/recipes/standard/artifacts.ts
    notes: remove artifact registry role; validations move into producer step runtime impls
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/**/steps/**/contract.ts
    notes: move produced artifact contracts into producer step contracts
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/**/steps/**/index.ts
    notes: replace artifact imports with deps.artifacts.* usage; update run signature
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/foundation/producer.ts
    notes: stop writing directly to ctx.artifacts; use deps artifact wrapper publish
```

**Acceptance criteria:**
- [ ] No step implementation imports `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` for artifact reads/writes.
- [ ] Manual artifact satisfiers in `STANDARD_TAG_DEFINITIONS` are removed (artifacts only).
- [ ] The recipe still executes with gating enforced (producer must publish declared artifacts).

## U21-G) Tests + verification
- **Complexity × parallelism:** medium × low (must guard against regressions of wiring)

**Files (expected):**
```yaml
files:
  - path: packages/mapgen-core/test/authoring/authoring.test.ts
    notes: step contract merge invariants and typing smoke
  - path: packages/mapgen-core/test/pipeline/tag-registry.test.ts
    notes: artifact satisfier enforcement (UnsatisfiedProvidesError behavior)
  - path: packages/mapgen-core/test/pipeline/hello-mod.smoke.test.ts
    notes: optional integration coverage if needed
```

**Acceptance criteria:**
- [ ] Tests cover: defineStep merge, createRecipe artifact tag def synthesis, executor enforcement on missing/invalid artifact publish.
- [ ] Verification commands below pass.

## Verification (commands)
Run from repo root unless otherwise specified.
- `pnpm check`
- `pnpm -C packages/mapgen-core check`
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps check`
- `pnpm -C mods/mod-swooper-maps test`
- `rg -n \"ctx\\.deps\" -S .` (expect zero)
- `rg -n \"from \\\"\\.\\./\\.\\./\\.\\./artifacts\\.js\\\"\" -S mods/mod-swooper-maps/src/recipes/standard/stages` (expect zero for step impls after migration)

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
