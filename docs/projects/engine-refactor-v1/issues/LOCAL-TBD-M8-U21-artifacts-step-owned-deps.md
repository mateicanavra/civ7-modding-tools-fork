---
id: LOCAL-TBD-M8-U21
title: "[M8] Artifacts DX: stage-owned artifact contracts + single-path deps access"
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
```yaml
tldr:
  - title: "Make artifacts stage-owned (contracts) and contract-first"
    points:
      - "Each stage defines its artifact contracts in `stages/<stage>/artifacts.ts` (canonical `name` + `id` + `schema`)."
      - "Steps reference those contracts in their `defineStep` contracts (`artifacts.requires/provides`)."
      - "Artifact runtime behavior (validation + gating `satisfies`) lives next to the producing step implementation and is bound via `implementArtifacts(...)`."
  - title: "Eliminate ad-hoc artifact imports inside steps"
    points:
      - "Step `run(...)` receives a first-class `deps` parameter."
      - "Steps access artifacts via `deps.artifacts.<artifactName>.read(ctx)` / `.publish(ctx, value)` (treat reads as immutable; no runtime snapshot-on-read in prod)."
  - title: "Remove manual artifact satisfier wiring"
    points:
      - "`createRecipe(...)` composes artifact tag definitions + satisfiers automatically from step modules."
  - title: "Single path per capability"
    points:
      - "No `ctx.deps` path (not even “internal”)."
      - "No `read`/`publish` override hooks; publication/read is canonical via `ctx.artifacts` store + runtime wrapper."
  - title: "Remove fake artifact id version suffixes"
    points:
      - "`@v1`, `@v2`, etc. are not a real versioning system; they are removed via a single mechanical rename sweep (see prework)."
```

Primary reference (source of truth):
```yaml
references:
  - path: docs/projects/engine-refactor-v1/resources/spec/recipe-compile/DX-ARTIFACTS-PROPOSAL.md
    commit: 7870be5e5
```

<!-- Path roots -->
```yaml
path_roots:
  - root: packages/mapgen-core
    notes: authoring SDK + engine runtime
  - root: mods/mod-swooper-maps
    notes: standard recipe migration target
  - root: docs/projects/engine-refactor-v1/resources/spec/recipe-compile
    notes: canonical spec directory
```

## Paper Trail (read-first)
```yaml
paper_trail:
  - title: "Primary design (source of truth)"
    path: docs/projects/engine-refactor-v1/resources/spec/recipe-compile/DX-ARTIFACTS-PROPOSAL.md
  - title: "Terminology intent (“Tag” → “Dependency”)"
    path: docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-027-dependency-terminology-and-registry-naming.md
  - title: "Engine gating reality (source of truth)"
    files:
      - packages/mapgen-core/src/engine/tags.ts
      - packages/mapgen-core/src/engine/PipelineExecutor.ts
  - title: "Current standard recipe drift sources (to be eliminated for artifacts)"
    files:
      - mods/mod-swooper-maps/src/recipes/standard/tags.ts
      - mods/mod-swooper-maps/src/recipes/standard/artifacts.ts
```

## Context / why this exists
Artifacts are currently scattered across:
```yaml
locations:
  - path: mods/mod-swooper-maps/src/recipes/standard/tags.ts
    notes: artifact tag IDs + satisfiers
  - path: mods/mod-swooper-maps/src/recipes/standard/artifacts.ts
    notes: artifact schemas and ad-hoc runtime validators
  - path: "(step implementations)"
    notes: random imports like `featureIntentsArtifact`
```

This creates:
```yaml
problems:
  - noisy and redundant imports
  - drift between tag IDs, schemas, satisfiers, and step logic
  - "manual wiring that contradicts the contract-first DX we’ve been building (`defineStep/createStep`, bound ops surface, etc.)"
```

The engine already has a clean gating primitive (`TagRegistry` + `DependencyTagDefinition.satisfies` + executor `satisfied` set). This issue keeps that execution model and fixes the authoring model.

## Design goals
```yaml
design_goals:
  - title: "Stage-owned artifact contracts (stable boundary)"
    points:
      - "artifact contracts live in the stage module boundary, not inside a specific step folder."
      - "steps can be split/merged/renamed without forcing contract imports to chase step file layout."
  - title: "Step-owned runtime responsibility"
    points:
      - "publishing the artifact and binding its runtime behavior stays with the producer step runtime module."
  - title: "Contract vs runtime separation"
    points:
      - "contract: stable `name` + `id` + schema metadata"
      - "runtime: validate/satisfies, publish enforcement"
  - title: "Single-path DX"
    points:
      - "step code never imports “artifact helpers”"
      - "one official access path: `deps` parameter"
      - "one canonical publication/read path: `ctx.artifacts` store via wrapper"
  - title: "Strong guardrails"
    points:
      - "no nested artifact shapes"
      - "no per-step aliasing (“renaming”) of artifacts"
      - "exactly one provider step per artifact id (duplicates fail fast at recipe-compile time)"
      - "no shims/fallbacks; migrate everything to the new model"
```

## Non-goals
```yaml
non_goals:
  - "Runtime TypeBox validation (`TypeCompiler`, `Value.*`, etc.) in artifact runtime paths (disallowed by lint policy)."
  - "Filesystem-based codegen for registries."
  - "Re-architecting fields/effects storage; fields/effects remain recipe-level dependencies for now."
```

## Mental model (target)
```yaml
mental_model:
  - "Artifacts are published data products keyed by dependency tag ID (e.g. `artifact:ecology.featureIntents`) stored in `ctx.artifacts`."
  - "Artifact contracts are stage-owned (single canonical file per stage)."
  - title: "Steps"
    points:
      - "**publish** artifacts (producer steps)"
      - "**read/consume** artifacts (consumer steps)"
  - title: "Recipe compilation"
    points:
      - "composes step-declared artifact dependencies (contracts are stage-owned) into a recipe-level artifact registry and tag definitions"
      - "enforces gating via `DependencyTagDefinition.satisfies`"
      - "threads a typed `deps` surface into each step’s `run(...)`"
```

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
```yaml
points:
  - "Recipe-level artifact tag ids + satisfiers live in `mods/mod-swooper-maps/src/recipes/standard/tags.ts` (`STANDARD_TAG_DEFINITIONS`)."
  - "Artifact “handlers” live in `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` (e.g. `heightfieldArtifact.get/set`, plus `publish*Artifact` helpers)."
  - text: "Many step implementations import these helpers directly, creating import noise + duplicate ownership."
    examples:
      - mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/index.ts
      - mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts
```

### 2) Canonical gating model (what must remain true)
The engine gating model is already clean and should remain the enforcement mechanism:
```yaml
points:
  - "`TagRegistry` holds `DependencyTagDefinition` (may include `satisfies`)."
  - text: "`PipelineExecutor` adds each `provides` tag to the `satisfied` set *then* checks `isDependencyTagSatisfied(tag, ...)`."
    notes:
      - "`isDependencyTagSatisfied` first checks `state.satisfied.has(tag)` before calling `definition.satisfies`."
```

Key reality checks:
```yaml
reality_checks:
  - "A tag definition can omit `satisfies` and still gate as a pure “provided” marker."
  - "If `satisfies` exists, it is the single place runtime postconditions live."
```

### 3) Standard recipe artifact inventory (current)
This issue must treat the following as artifacts to migrate away from manual recipe wiring:
```yaml
source_of_truth:
  path: mods/mod-swooper-maps/src/recipes/standard/tags.ts
  identifiers:
    - M3_DEPENDENCY_TAGS.artifact.*
```

```yaml
artifacts:
  # NOTE: this list reflects *current reality* on this branch.
  # Direction (locked in): remove all fake `@vN` suffixes via one mechanical rename sweep.

  # foundation artifacts (currently published directly via ctx.artifacts.set in producer)
  - id: artifact:foundation.plates
  - id: artifact:foundation.dynamics
  - id: artifact:foundation.seed
  - id: artifact:foundation.diagnostics
  - id: artifact:foundation.config

  # standard recipe artifacts (current)
  - id: artifact:heightfield
  - id: artifact:climateField
  - id: artifact:storyOverlays
  - id: artifact:riverAdjacency
  - id: artifact:ecology.biomeClassification
  - id: artifact:ecology.soils
  - id: artifact:ecology.resourceBasins
  - id: artifact:ecology.featureIntents
  - id: artifact:narrative.corridors
  - id: artifact:narrative.motifs.margins
  - id: artifact:narrative.motifs.hotspots
  - id: artifact:narrative.motifs.rifts
  - id: artifact:narrative.motifs.orogeny
  - id: artifact:placementInputs
  - id: artifact:placementOutputs
```

### 4) Prework Results (Resolved): remove fake `@vN` suffixes from artifact ids
This sweep removes naming-only `@vN` suffixes from `artifact:*` ids in non-archived code + docs (archives intentionally left unchanged).

**Inventory (before sweep):**
```yaml
inventory_before_sweep:
  non_archived:
    unique_ids: 25
    files: 22
    occurrences: 159
    notes:
      - all matches were "@v1"
    ids:
      - artifact:climateField
      - artifact:ecology.biomeClassification
      - artifact:ecology.featureIntents
      - artifact:ecology.resourceBasins
      - artifact:ecology.soils
      - artifact:ecology.vegetation
      - artifact:foundation.*
      - artifact:foundation.config
      - artifact:foundation.crust
      - artifact:foundation.diagnostics
      - artifact:foundation.dynamics
      - artifact:foundation.mesh
      - artifact:foundation.plateGraph
      - artifact:foundation.plates
      - artifact:foundation.seed
      - artifact:foundation.tectonics
      - artifact:narrative.*
      - artifact:narrative.corridors
      - artifact:narrative.motifs.hotspots.stories.<storyId>
      - artifact:narrative.motifs.hotspots
      - artifact:narrative.motifs.margins
      - artifact:narrative.motifs.orogeny
      - artifact:narrative.motifs.rifts
      - artifact:placementInputs
      - artifact:placementOutputs
  archived:
    unique_ids: 22
    files: 25
    occurrences: 195
    notes:
      - left unchanged
```

**Sweep (executed):**
```yaml
sweep_executed:
  mechanical_rename: "artifact:<name>@vN -> artifact:<name>"
  updated_files:
    - path: packages/mapgen-core/src/core/types.ts
    - path: mods/mod-swooper-maps/src/recipes/standard/tags.ts
    - path: mods/mod-swooper-maps/AGENTS.md
    - root: docs/projects/engine-refactor-v1
      files:
        - issues/LOCAL-TBD-M8-U21-artifacts-step-owned-deps.md
        - deferrals.md
        - issues/LOCAL-TBD-placement-domain-refactor.md
        - resources/CONTRACT-foundation-context.md
        - resources/PRD-plate-generation.md
        - resources/PRD-target-narrative-and-playability.md
        - resources/PRD-target-registry-and-tag-catalog.md
        - resources/repomix/gpt-config-architecture-converged.md
        - resources/spec/SPEC-step-domain-operation-modules.md
        - resources/spec/SPEC-tag-registry.md
        - resources/spec/adr/ADR.md
        - resources/spec/adr/adr-er1-011-placement-consumes-explicit-artifact-placementinputs-v1-implementation-deferred-per-def-006.md
        - resources/spec/adr/adr-er1-020-effect-engine-placementapplied-is-verified-via-a-minimal-ts-owned-artifact-placementoutputs-v1.md
        - resources/spec/adr/adr-er1-024-hotspot-categories-live-in-a-single-narrative-hotspots-artifact-no-split-artifacts-in-v1.md
        - resources/spec/recipe-compile/DX-ARTIFACTS-PROPOSAL.md
        - resources/spike/spike-m7-step-owned-tags-artifacts.md
        - resources/spike/step-domain-modules/proposals/gpt-pro-proposal-v7-alt-1.md
        - triage.md
    - root: docs/system/libs/mapgen
      files:
        - ecology.md
  notes:
    - "No `artifact:*@vN` matches in `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` (no changes needed)."
    - "Stage-owned artifact contract files do not exist yet (no `stages/<stage>/artifacts.ts` to update)."
```

**Verification (post-sweep):**
```yaml
verification_post_sweep:
  commands:
    - "rg -n \"artifact:[^\\\\s'\\\\\\\"]+@v[0-9]+\" packages/mapgen-core mods docs --glob '!**/_archive/**' --glob '!**/_archived/**'"
  expect:
    - zero matches
```

## Decisions (locked — do not re-litigate)

### 1) `defineArtifact` name constraints (camelCase-only)
```yaml
choice: enforce camelCase-only `name` at `defineArtifact` time.
rationale: "`deps.artifacts.<name>` is the primary DX surface; keeping names flat + conservative is required for clean completion and predictable access."
rules:
  - "`name` must match: `^[a-z][a-zA-Z0-9]*$`"
  - "Reject reserved / dangerous property names (minimum): `__proto__`, `prototype`, `constructor`."
```

### 2) Default immutability semantics (production: no snapshot-on-read)
```yaml
choices:
  - "artifacts are **write-once**; publishing the same artifact id twice throws."
  - "do **not** deep-freeze the underlying stored value in `ctx.artifacts`."
  - title: "do **not** implement runtime snapshot-on-read in production"
    notes:
      - "`read(...)` returns the stored value reference (no copying)."
      - "Immutability is enforced by convention + types, not runtime copying."
direction:
  title: "hard rule for authors/consumers"
  points:
    - "Consumers must treat values read from `deps.artifacts.*` as immutable."
    - "Consumers must not mutate values read from `deps.artifacts.*`."
    - "If a consumer needs to mutate, it must first make a caller-owned copy (e.g. `new Uint8Array(value)` for typed arrays; `{ ...obj }` / structured clone for objects as appropriate)."
type_level_enforcement:
  - "`read(...)` is typed as a deep-readonly view to steer author behavior via IntelliSense."
  - "Typed arrays remain effectively mutable in JS; readonly typing does not fully prevent element writes, so this rule is still enforced primarily by convention + code review."
optional:
  title: debug/test-only, same API path
  points:
    - "A debug/test mode may freeze/copy values on publish/read to detect accidental mutation early."
    - "This must not introduce an alternate authoring surface or second API path; it is a runtime mode toggle only."
```

### 3) Error shape for wrapper failures
```yaml
choice: use typed error classes for artifact failures (debuggability is pipeline DX).
initial_set:
  notes:
    - expand only if needed by real call sites/tests
  errors:
    - "`ArtifactMissingError` (required artifact missing at read)"
    - "`ArtifactDoublePublishError` (write-once violation)"
    - "`ArtifactValidationError` (publish rejected; includes issues and optional cause)"
```

### 4) Single producer per artifact id (one writer, many readers)
```yaml
choice: "**exactly one step** may `provides` / publish a given artifact `id`."
enforcement: recipe compilation fails fast if multiple steps provide the same artifact id.
escape_hatch: "“alternate producers” must use a *different artifact id* (discouraged; document rationale where used)."
```

### 5) Remove fake artifact id version suffixes (`@v1`, `@v2`, …)
```yaml
choice: remove `@vN` suffixes across the repository; they are naming-only today and create false architecture.
scope: this is a large mechanical rename and must be executed as an explicit sweep (see prework prompt below).
rule: do not introduce new `@vN`-suffixed ids.
```

### 6) Multi-producer `biomeClassification` is an anti-pattern to eliminate (no “draft/final” ids)
```yaml
current_reality: "`biomes` and `biome-edge-refine` both write `artifact:ecology.biomeClassification` today."
choice: "keep a single conceptual artifact: `artifact:ecology.biomeClassification` (post-sweep) produced once."
direction:
  title: remove the dual-writer setup by restructuring step boundaries
  points:
    - "Refinement is expressed inside the single producer’s runtime, or by producing a *semantically distinct* artifact (not “draft vs final”)."
```

### 7) Overlays cutover: artifacts only (remove `ctx.overlays`)
```yaml
choice_now: "store overlays via `deps.artifacts.storyOverlays` into `ctx.artifacts` and remove `ctx.overlays` from the official context surface."
direction: "overlays may become a first-class context feature again later (with a dedicated API), but **for now there is one canonical access path** (artifacts)."
documentation_requirement:
  - why overlays are artifacts-only for now
  - that the future plan is a first-class overlay API
  - that dual paths are intentionally avoided
```

### 8) Context remains coherent (what lives on `ctx` vs `deps`)
```yaml
choices:
  - "`ctx` remains the runtime execution context (environment/adapter/dimensions/randomness/logging + internal stores)."
  - "`deps` remains the **author-facing** dependency access surface for pipeline data products (artifacts now; fields/effects later)."
rule: "steps do not reach into `ctx.artifacts` directly in normal authoring; they use `deps.artifacts.*` so contracts, gating, and runtime behavior stay aligned."
rationale: "this keeps `ctx` from becoming a dumping ground while still preserving a single canonical dependency API path for step authors."
```

### 9) Validation source of truth: issues[] at the artifact boundary, fail-fast in normal execution
```yaml
choice: "`implementArtifacts(...).validate` returns `issues[]` (`readonly { message: string }[]`)."
compatibility: internal validators may throw; they are wrapped at the artifact boundary and normalized into issues.
fail_fast: "`publish(...)` throws `ArtifactValidationError` when issues exist."
reporting_testing: "tests and reporting tools can catch `ArtifactValidationError` and introspect issues without introducing an alternate publication/read API path."
```

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
  // Invariants:
  // - name must match ^[a-z][a-zA-Z0-9]*$ (camelCase-only)
  // - name must not be a reserved/dangerous property name (e.g. "__proto__")
  name: Name;
  // Invariants:
  // - id must start with "artifact:"
  // - id must NOT contain fake "@vN" suffixes
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
  /**
   * Read an artifact as a readonly view.
   *
   * IMPORTANT:
   * - This does not perform runtime snapshotting/copying in production.
   * - Consumers must treat the returned value as immutable and must not mutate it.
   * - If mutation is needed, callers must copy first (caller-owned copy).
   */
  read: (context: TContext) => ArtifactReadValueOf<C>;
  tryRead: (context: TContext) => ArtifactReadValueOf<C> | null;
}>;

export type ProvidedArtifactRuntime<
  C extends ArtifactContract,
  TContext extends ExtendedMapContext,
> = RequiredArtifactRuntime<C, TContext> &
  Readonly<{
    /**
     * Publish an artifact (write-once).
     *
     * IMPORTANT:
     * - Publishing stores the provided value reference (no deep freeze, no snapshotting in prod).
     * - Producers should treat published values as immutable once stored.
     */
    publish: (context: TContext, value: ArtifactValueOf<C>) => ArtifactReadValueOf<C>;
    satisfies: DependencyTagDefinition<TContext>["satisfies"];
  }>;
```

### Artifact read typing (type-level immutability, no runtime snapshot)
```ts
export type DeepReadonly<T> =
  T extends (...args: any[]) => any ? T :
  T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepReadonly<U>> :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;

export type ArtifactReadValueOf<C extends ArtifactContract<any, any, any>> = DeepReadonly<ArtifactValueOf<C>>;
```

### Artifact failure errors (typed for pipeline DX)
```ts
export class ArtifactMissingError extends Error {
  public readonly artifactId: string;
  public readonly artifactName: string;
  public readonly consumerStepId: string;
  constructor(args: { artifactId: string; artifactName: string; consumerStepId: string }) {
    super(`Missing artifact ${args.artifactId} (${args.artifactName}) required by step ${args.consumerStepId}`);
    this.name = "ArtifactMissingError";
    this.artifactId = args.artifactId;
    this.artifactName = args.artifactName;
    this.consumerStepId = args.consumerStepId;
  }
}

export class ArtifactDoublePublishError extends Error {
  public readonly artifactId: string;
  public readonly artifactName: string;
  public readonly producerStepId: string;
  constructor(args: { artifactId: string; artifactName: string; producerStepId: string }) {
    super(`Artifact ${args.artifactId} (${args.artifactName}) is already published; write-once violated by step ${args.producerStepId}`);
    this.name = "ArtifactDoublePublishError";
    this.artifactId = args.artifactId;
    this.artifactName = args.artifactName;
    this.producerStepId = args.producerStepId;
  }
}

export class ArtifactValidationError extends Error {
  public readonly artifactId: string;
  public readonly artifactName: string;
  public readonly producerStepId: string;
  public readonly issues: readonly { message: string }[];
  public readonly cause?: unknown;
  constructor(args: {
    artifactId: string;
    artifactName: string;
    producerStepId: string;
    issues: readonly { message: string }[];
    cause?: unknown;
  }) {
    super(`Artifact ${args.artifactId} (${args.artifactName}) rejected by validation in step ${args.producerStepId}`);
    this.name = "ArtifactValidationError";
    this.artifactId = args.artifactId;
    this.artifactName = args.artifactName;
    this.producerStepId = args.producerStepId;
    this.issues = args.issues;
    this.cause = args.cause;
  }
}
```

### `implementArtifacts` (bind contracts to runtime behavior)
Single binding surface; no `read`/`publish` overrides.

```ts
type ArtifactsByName<T extends readonly ArtifactContract[]> = {
  [C in T[number] as C["name"]]: C;
};

export type ArtifactRuntimeImpl<C extends ArtifactContract, TContext extends ExtendedMapContext> =
  Readonly<{
    validate?: (value: ArtifactValueOf<C>, context: TContext) => readonly { message: string }[];
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

### Example A: producer step publishes an artifact (no artifact helper imports)
Target file layout (stage-owned contracts + step-owned runtime):
```yaml
target_file_layout:
  files:
    - path: ".../stages/ecology/artifacts.ts"
      notes: stage artifact contracts
    - path: ".../steps/features-plan/contract.ts"
      notes: step contract references stage artifacts
    - path: ".../steps/features-plan/index.ts"
      notes: runtime module binds artifact runtime + publishes
```

`stages/ecology/artifacts.ts`:
```ts
import { Type, defineArtifact } from "@swooper/mapgen-core/authoring";

export const ecologyArtifacts = {
  featureIntents: defineArtifact({
    name: "featureIntents",
    id: "artifact:ecology.featureIntents",
    schema: Type.Object({
      vegetation: Type.Array(Type.Object({ x: Type.Number(), y: Type.Number(), weight: Type.Optional(Type.Number()) })),
      wetlands: Type.Array(Type.Object({ x: Type.Number(), y: Type.Number(), weight: Type.Optional(Type.Number()) })),
      reefs: Type.Array(Type.Object({ x: Type.Number(), y: Type.Number(), weight: Type.Optional(Type.Number()) })),
      ice: Type.Array(Type.Object({ x: Type.Number(), y: Type.Number(), weight: Type.Optional(Type.Number()) })),
    }),
  }),
} as const;
```

`contract.ts`:
```ts
import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";
import { ecologyArtifacts } from "../../artifacts.js";

const FeaturesPlanStepContract = defineStep({
  id: "features-plan",
  phase: "ecology",
  artifacts: {
    requires: [
      /* example: BiomeClassificationArtifact, PedologyArtifact, HeightfieldArtifact */
    ],
    provides: [ecologyArtifacts.featureIntents],
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
```yaml
key_dx_outcomes:
  - "Artifact contracts live in a single, stable stage-owned file (`stages/<stage>/artifacts.ts`)."
  - "Step runtime does not import recipe-level artifact helper modules (artifact access is only via `deps`)."
  - "`deps.artifacts.featureIntents` is fully typed and autocompletes."
```

### Example B: consumer step reads an artifact (no artifact imports)
`contract.ts`:
```ts
import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";

import { ecologyArtifacts } from "../../artifacts.js";

const FeaturesApplyStepContract = defineStep({
  id: "features-apply",
  phase: "ecology",
  artifacts: {
    requires: [ecologyArtifacts.featureIntents],
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
  A[Stage artifact contracts<br/>stages/*/artifacts.ts] --> S[Step contract<br/>defineStep + artifacts.requires/provides]
  S --> B[createStep module<br/>run(ctx, config, ops, deps)]
  B --> C[createRecipe collects step contracts]
  B --> D[implementArtifacts binds provides to runtime<br/>(validate/satisfies + write-once publish)]

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
```yaml
complexity_parallelism: "medium × low (core types + runtime wrapper; touches authoring exports + tests)"
```

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
```yaml
in_scope:
  - Add `defineArtifact` and contract/value helper types.
  - Add `implementArtifacts` binder which returns wrappers exposing canonical `read/tryRead/publish` and `satisfies`.
  - Ensure the wrapper uses `ctx.artifacts` as the sole backing store.
```

**Out of scope:**
```yaml
out_of_scope:
  - Any second artifact access surface (no `ctx.deps`, no “alternate publish hooks”).
  - Runtime schema validation via TypeBox runtime compilers.
```

**Acceptance criteria:**
```yaml
acceptance_criteria:
  - "[ ] `defineArtifact({ name, id, schema })` exists and validates invariants (id prefix, name format, non-empty)."
  - "[ ] `implementArtifacts(provides, impl)` exists and returns typed wrappers keyed by artifact `name`."
  - "[ ] Wrapper `publish(ctx, value)` stores to `ctx.artifacts` under `contract.id` and returns the stored value as a readonly view type."
  - "[ ] Wrapper enforces write-once: `publish(...)` throws `ArtifactDoublePublishError` if `contract.id` already exists in the store."
  - "[ ] Wrapper `read(ctx)` throws `ArtifactMissingError` when missing."
  - "[ ] Wrapper `tryRead(ctx)` returns `null` on missing."
  - "[ ] Wrapper exposes a `satisfies` function usable as `DependencyTagDefinition<TContext>[\"satisfies\"]`."
  - "[ ] Wrapper `read(ctx)` is typed as a deep-readonly view (type-level immutability; no runtime snapshot-on-read guarantee in production)."
  - "[ ] Wrapper `publish(ctx, value)` throws `ArtifactValidationError` (with issues) when `validate(...)` returns issues."
  - item: "[ ] JSDoc at definition sites makes the immutability contract explicit:"
    points:
      - "consumers must not mutate values read from `deps.artifacts.*`,"
      - "mutation requires caller-owned copies."
```

## U21-B) Extend `defineStep`: artifacts block + flat merge enforcement
```yaml
complexity_parallelism: "low × low (type + runtime invariants)"
```

**Files (expected):**
```yaml
files:
  - path: packages/mapgen-core/src/authoring/step/contract.ts
    notes: add contract.artifacts + merge to requires/provides + duplicate protection
```

**In scope:**
```yaml
in_scope:
  - Extend `StepContract` to optionally include `artifacts: { requires?: ArtifactContract[]; provides?: ArtifactContract[] }`.
  - Merge `artifacts.*.id` into `requires`/`provides` (flat arrays only).
  - Enforce “single-source of truth” constraints (no duplicates, no mixing direct tag ids with artifact ids without clarity).
```

**Acceptance criteria:**
```yaml
acceptance_criteria:
  - "[ ] `defineStep({ artifacts: ... })` results in `contract.requires/provides` including the artifact ids."
  - "[ ] Duplicate artifact ids across requires/provides are rejected with an actionable error."
  - "[ ] Any attempt to create nested artifact surfaces (e.g. invalid names like `motifs.rifts`) fails via `defineArtifact` constraints."
```

## U21-C) Thread `deps` into step runtime (`run(ctx, config, ops, deps)`)
```yaml
complexity_parallelism: "high × low (type plumbing affects recipe wiring + mod migration)"
```

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
```yaml
acceptance_criteria:
  - "[ ] All step runs can be authored as `run(ctx, config, ops, deps)`."
  - "[ ] There is no `ctx.deps` surface anywhere in the repo (enforced by grep verification)."
  - "[ ] `deps.artifacts.<name>` is typed based on the step contract’s artifacts.requires/provides."
```

## U21-D) `createRecipe` auto-wires artifact tag definitions + satisfiers
```yaml
complexity_parallelism: "medium × low (recipe compilation must synthesize tag definitions)"
```

**Files (expected):**
```yaml
files:
  - path: packages/mapgen-core/src/authoring/recipe.ts
    notes: discover artifact runtimes from steps + register tag defs with satisfies
  - path: packages/mapgen-core/src/engine/tags.ts
    notes: no behavior change; only consume existing satisfies hook
```

**In scope:**
```yaml
in_scope:
  - "Artifact tags are registered with `satisfies` derived from producer artifact runtime wrappers."
  - "Explicit `input.tagDefinitions` remains the override/extension path for non-artifacts (effects/fields)."
  - "Enforce policy: **exactly one provider step per artifact id** at recipe-compile time (fail fast with an actionable error listing duplicates)."
```

**Acceptance criteria:**
```yaml
acceptance_criteria:
  - "[ ] Artifact tag defs are present in the registry even if not explicitly provided in `input.tagDefinitions`."
  - "[ ] Executor correctly fails with `UnsatisfiedProvidesError` when a producer step does not publish its declared artifact."
```

## U21-E) Step module carries provided artifact runtimes (for compilation + deps typing)
```yaml
complexity_parallelism: "medium × low (step module shape changes thread through recipe compilation)"
```

**Files (expected):**
```yaml
files:
  - path: packages/mapgen-core/src/authoring/types.ts
    notes: extend Step/StepModule shape to optionally include artifacts runtimes
  - path: packages/mapgen-core/src/authoring/step/create.ts
    notes: accept `artifacts` alongside normalize/run
```

**Acceptance criteria:**
```yaml
acceptance_criteria:
  - "[ ] Producer steps can export `artifacts` runtime wrappers via `createStep(contract, { artifacts, run })`."
  - "[ ] `createRecipe` can discover those wrappers and register satisfiers."
```

## U21-F) Migrate standard recipe (`= mods/mod-swooper-maps`) with no shims
```yaml
complexity_parallelism: "high × low (many call sites; must remain green end-to-end)"
```

**Files (expected, partial):**
```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/tags.ts
    notes: remove artifact satisfiers/defs only; keep field/effect defs as needed
  - path: mods/mod-swooper-maps/src/recipes/standard/artifacts.ts
    notes: remove artifact registry role; validations move into producer step runtime impls
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/**/artifacts.ts
    notes: new stage-owned artifact contract modules; single canonical contract per artifact id
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/**/steps/**/contract.ts
    notes: reference stage-owned artifact contracts in artifacts.requires/provides
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/**/steps/**/index.ts
    notes: replace artifact imports with deps.artifacts.* usage; update run signature
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/foundation/producer.ts
    notes: stop writing directly to ctx.artifacts; use deps artifact wrapper publish
```

**Acceptance criteria:**
```yaml
acceptance_criteria:
  - "[ ] No step implementation imports `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` for artifact reads/writes."
  - "[ ] Manual artifact satisfiers in `STANDARD_TAG_DEFINITIONS` are removed (artifacts only)."
  - "[ ] The recipe still executes with gating enforced (producer must publish declared artifacts)."
  - "[ ] `ctx.overlays` is removed; overlays are published/read via `deps.artifacts.storyOverlays.*` only."
  - "[ ] `biomeClassification` has a single producer step (no dual-writer between `biomes` and `biome-edge-refine`)."
```

## U21-G) Tests + verification
```yaml
complexity_parallelism: "medium × low (must guard against regressions of wiring)"
```

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
```yaml
acceptance_criteria:
  - "[ ] Tests cover: defineStep merge, createRecipe artifact tag def synthesis, executor enforcement on missing/invalid artifact publish."
  - "[ ] Tests assert typed error shapes (`ArtifactMissingError`, `ArtifactDoublePublishError`, `ArtifactValidationError`) so failures are debuggable and stable."
  - "[ ] Type-level immutability is enforced for read values (e.g. `read(...)` returns `DeepReadonly<T>`), verified via a typecheck-only test using `// @ts-expect-error` for attempted mutations on object/array graphs."
  - "[ ] Verification commands below pass."
```

## Verification (commands)
Run from repo root unless otherwise specified.
```yaml
verification_commands:
  - pnpm check
  - pnpm -C packages/mapgen-core check
  - pnpm -C packages/mapgen-core test
  - pnpm -C mods/mod-swooper-maps check
  - pnpm -C mods/mod-swooper-maps test
  - "rg -n \"ctx\\\\.deps\" -S . (expect zero)"
  - "rg -n \"ctx\\\\.overlays\" -S . (expect zero)"
  - "rg -n \"artifact:[^\\\\s'\\\\\\\"]+@v[0-9]+\" packages/mapgen-core mods docs --glob '!**/_archive/**' --glob '!**/_archived/**' (expect zero)"
  - "rg -n \"from \\\\\\\"\\.\\./\\.\\./\\.\\./artifacts\\\\.js\\\\\\\"\" -S mods/mod-swooper-maps/src/recipes/standard/stages (expect zero for step impls after migration)"
```

## Ideal file structure (one end-to-end slice)
This is a representative slice of “what good looks like” after the cutover, aligned with the organization principles in:
```yaml
references:
  - docs/projects/engine-refactor-v1/resources/spec/SPEC-appendix-target-trees.md
```

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
            ├─ artifacts.ts         # stage-owned artifact contracts (defineArtifact)
            ├─ index.ts            # createStage(...) from step modules
            └─ steps/
               ├─ features-plan/
               │  ├─ contract.ts   # defineStep + artifacts.provides (imports stage artifacts)
               │  └─ index.ts      # createStep + implementArtifacts + run(ctx, config, ops, deps)
               └─ features-apply/
                  ├─ contract.ts   # defineStep + artifacts.requires (imports stage artifacts)
                  └─ index.ts      # createStep + run(ctx, config, ops, deps)
```

File placement rules (for authoring DX):
```yaml
file_placement_rules:
  - "Artifact contracts live in the stage boundary (`stages/<stage>/artifacts.ts`) and are imported by step contracts."
  - "Artifact runtime behavior (validate/satisfies + write-once publish) lives with the producer step implementation."
  - "Fields/effects remain recipe-level for now (in `deps/`) until a follow-up completes their `deps.*` typing/threading story."
```

## Terminology alignment: rename “Tag” → “Dependency”
The code already uses “dependency” semantics (e.g., `DependencyTagDefinition`, `validateDependencyTag`) but still exposes the registry as `TagRegistry`.

Reference:
```yaml
references:
  - docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-027-dependency-terminology-and-registry-naming.md
```

### Current implementation identifiers (source of truth)
```yaml
current_implementation_identifiers:
  - path: packages/mapgen-core/src/engine/tags.ts
    exports:
      - "`export class TagRegistry`"
      - "`export interface DependencyTagDefinition`"
      - "`export type DependencyTagKind`"
      - "`export function validateDependencyTag`"
  - path: packages/mapgen-core/src/engine/index.ts
    notes:
      - "re-exports `TagRegistry` and the dependency-tag helpers."
```

### Target terminology (spec intent)
```yaml
target_terminology:
  - from: TagRegistry
    to: DependencyRegistry
  - from: DependencyTagDefinition
    to: DependencyKeyDefinition
    notes:
      - optional second step; improves clarity
  - from: DependencyTag
    notes:
      - alias in spec inputs
    to:
      - DependencyKey
      - DependencyId
```

### What it would take (scope)
This is a repo-wide rename touching:
```yaml
scope_touchpoints:
  - "engine runtime exports (`@mapgen/engine/index.ts`)"
  - "step registry constructor options (`StepRegistry` uses `tags?: TagRegistry`)"
  - "tests (`packages/mapgen-core/test/pipeline/tag-registry.test.ts` and others)"
  - "content imports that refer to “tag” terminology (contracts, recipe wiring)"
  - "docs/spec language where it diverges"
```

Recommendation for sequencing:
```yaml
recommendation_for_sequencing:
  - "Land the artifacts DX cutover first (this issue), to avoid mixing large mechanical rename churn with behavioral changes."
  - title: "Follow up with a dedicated rename issue that"
    points:
      - "performs the identifier rename (`TagRegistry` → `DependencyRegistry`) and file rename (`tags.ts` → `dependencies.ts`)."
      - "updates all imports."
      - "updates docs to use dependency terminology consistently."
      - "keeps the same runtime semantics (pure rename)."
```

## Acceptance Criteria
```yaml
acceptance_criteria:
  - "Stages define artifact contracts via `defineArtifact` in `stages/<stage>/artifacts.ts`."
  - "Step artifact declarations are flat arrays (`contract.artifacts.requires/provides`), and runtime access is flat (`deps.artifacts.<name>`): no nested/grouped artifacts."
  - "Step implementations do not import artifact helper modules (e.g. no `featureIntentsArtifact` imports); they use `deps.artifacts.<name>.*` instead."
  - title: "Only one official runtime access path exists"
    points:
      - "step `run(ctx, config, ops, deps)`"
      - "no `ctx.deps` usage exists in the repo."
  - "Recipe compilation enforces **single producer per artifact id** (duplicate providers fail fast at compile-time)."
  - title: "Artifact publication/read behavior is canonical"
    points:
      - "no `read`/`publish` override hooks exist in the authoring API."
      - "publishing uses the wrapper and writes to `ctx.artifacts`."
  - title: "Artifact ids no longer use fake `@vN` suffixes"
    points:
      - "rg -n \"artifact:[^\\\\s'\\\\\\\"]+@v[0-9]+\" packages/mapgen-core mods docs returns zero results."
  - title: "Overlays are artifacts-only (single path)"
    points:
      - "`ctx.overlays` no longer exists as an official context property."
      - "overlay producers publish via `deps.artifacts.storyOverlays.publish(...)`, and consumers read via `deps.artifacts.storyOverlays.read(...)`."
  - title: "Artifact wrappers enforce write-once and provide readonly typing"
    points:
      - "`publish(...)` is write-once (double publish throws)."
      - "`read(...)` returns a deep-readonly type (type-level immutability; no runtime snapshot-on-read in production)."
      - "wrapper errors are typed (`ArtifactMissingError`, `ArtifactDoublePublishError`, `ArtifactValidationError`)."
  - "Manual artifact satisfier/tag wiring in `mods/mod-swooper-maps/src/recipes/standard/tags.ts` is removed (artifacts only)."
  - "`createRecipe` automatically registers artifact tag definitions with satisfiers so executor gating correctly enforces requires/provides."
  - "Tests exist for the new wiring and pass."
  - "The authoring DX shown in “End-to-end authoring examples” is achievable without extra helper files (artifact access is only via `deps`)."
  - "`mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` no longer serves as an artifact contract registry; artifact contracts live in stage-owned `stages/**/artifacts.ts` modules."
```

## Alternatives considered (brief)
```yaml
alternatives_considered:
  - option: "Keep manual artifact satisfiers in recipe tag files."
    rejected:
      - preserves drift and wiring noise
  - option: "Attach deps to `ctx` (`ctx.deps`)."
    rejected:
      - introduces a second access path and “ambient” dependencies
  - option: "Allow overriding `read`/`publish` via `ArtifactRuntimeImpl`."
    rejected:
      - "multiple semantic paths for publication/read creates drift and indirection; keep only validate/satisfies (immutability is by convention + types in production)."
```

## Notes / followups
```yaml
notes_followups:
  - "This issue intentionally does not fully solve “step contract imports for fields/effects tags”; it focuses on artifacts + threading `deps`."
  - "Once artifacts are stable, follow up with a fields/effects `deps.*` typing and a recipe-level dependency contract that reduces tag-import noise in contract files without introducing new access paths."
```
