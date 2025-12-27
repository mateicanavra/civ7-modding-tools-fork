# SPIKE: Standard Mod as a Feature‑Sliced “App” (Everything Content is Mod‑Owned)

Primary references:
- Canonical target: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`
- Boundary skeleton decision record: `docs/projects/engine-refactor-v1/issues/M5-U02-standard-mod-boundary-skeleton.md`

This SPIKE is structural only: it defines ownership boundaries, directory layout, and contracts. It does not include migration steps or implementation tasks.

---

## 0) Locked high-level architecture (engine as SDK; mods as content)

### Engine (`packages/mapgen-core/src/engine/**`) is the only generic SDK surface

The engine is content-agnostic and owns only the generic pipeline runtime:

- **One registry concept (engine-owned):** step registry + tag registry.
- **One compile/execute model (engine-owned):** `RunRequest -> ExecutionPlan -> execution`.
- **RunRequest is engine-owned only** and is the sole boundary input shape: `RunRequest = { recipe, settings }` (SPEC §1.2, §2.1).
- **Mods do not ship RunRequest translators.** A mod ships content (steps/tags) and one or more recipes.

### Standard mod (`packages/mapgen-core/src/mods/standard/**`) is pure content

The standard mod is a “feature-sliced app” composed of stage mini-packages:

- **Stages are mini-packages** and own:
  - step definitions
  - intra-stage ordering (a stage-local `ENTRY_LIST`)
  - stage-local model (schema + types)
  - stage-local artifacts + helpers
  - stage-local domain logic (`lib/**`)
- **Recipes are the only cross-stage ordering and toggle surface.**
- **`mod.ts` is a thin manifest**: it ties stage registration + recipes into an engine `PipelineMod`.

### Boundary invariants (non-negotiable)

- `engine/**` never imports from `mods/**`.
- `mods/**` may import from `engine/index.ts` only; imports from deep `engine/**` paths are not part of the supported authoring contract.
- “Stage” is a mod-internal packaging concept; the engine has no first-class stage runtime concept.

---

## 1) Conceptual model (registry vs stage vs recipe vs mod)

This proposal intentionally separates **catalog**, **local bundles**, and **global orchestration**:

- **Registry (engine):** “what exists”.
  - step definitions and tag definitions are registered here.
  - registry defines validity (no collisions; unknown IDs are errors) but has no ordering.
- **Stage (mod mini-package):** “local cluster + default local order”.
  - a stage exports its step modules and an ordered `ENTRY_LIST` (a recipe fragment).
  - a stage registers its own steps/tags into the engine registry.
- **Recipe (mod):** “global plan”.
  - the recipe is the only place that defines cross-stage order, selection, and toggles.
  - the default recipe composes stage fragments into the canonical linear sequence (SPEC §1.2, §2.1).
- **Mod (engine contract object):** “the deliverable package”.
  - the mod provides a `register(registry)` function and a `recipes` map.
  - the engine compiles and executes using `RunRequest` that references one of those recipes.

This matches SPEC intent:
- “Recipe is the single source of truth for step ordering and enablement” (SPEC §1.1, §1.2).
- “Vanilla ships as a standard mod package (registry + default recipe), not a privileged internal order” (SPEC §2.1).

---

## 2) Target directory layout (required, no optional files)

### 2.1 Engine layout (generic SDK)

```text
packages/mapgen-core/src/engine/
├─ index.ts
├─ types.ts
├─ errors.ts
├─ mod.ts
├─ registry/
│  ├─ index.ts
│  ├─ StepRegistry.ts
│  └─ TagRegistry.ts
├─ runtime/
│  ├─ ExecutionPlan.ts
│  └─ PipelineExecutor.ts
├─ observability/
│  ├─ index.ts
│  ├─ fingerprint.ts
│  └─ trace.ts
└─ lib/
   └─ **/**
```

**`engine/index.ts` (public SDK surface; only supported import path for mod authors)**
- Re-exports the public engine API:
  - registry creation (`createRegistry`, `createRegistryEntry`, registry public types)
  - compile (`compileExecutionPlan`) and runtime (`PipelineExecutor`)
  - shared types (`RunRequest`, `Recipe`, `ExecutionPlan`, `MapGenStep`, tag types)
  - error types and observability types (stable contracts)
  - mod contract types (`PipelineMod`)
- Does not re-export engine-internal implementation classes (`StepRegistry`, `TagRegistry`).

**`engine/types.ts` (public contracts and core types)**
- Defines engine-owned boundary shapes and contracts:
  - `RunRequest = { recipe, settings }` (SPEC §1.2)
  - `Recipe` (linear in V1; supports future non-breaking extension containers)
  - `MapGenStep` contract (`id`, `phase: string`, `requires`, `provides`, `run`)
  - `ExecutionPlan` data model shape (may be re-exported from `runtime/ExecutionPlan.ts`)
- Declares only generic engine concepts; no standard-mod tags or artifacts appear here.

**`engine/errors.ts` (public error contracts)**
- Defines stable, structured error types for:
  - compile-time failures (unknown IDs, invalid schema/config, unknown tags, collisions)
  - runtime failures (missing deps, effect verification failures, precondition failures)
- Error surface is stable and engine-owned (SPEC §1.2 observability baseline).

**`engine/mod.ts` (mod contract types)**
- Defines the engine contract a mod must satisfy (`PipelineMod`).
- Does not contain standard-mod content or helpers.

**`engine/registry/index.ts` (public registry API; engine-owned)**
- Exposes the supported registry construction surface:
  - `createRegistry()` (constructs an empty registry)
  - `createRegistryEntry(step)` (wraps a step for registration, if needed)
  - `Registry` public interface for registration and lookup
- Guarantees fail-fast collision checks (SPEC §3).

**`engine/registry/StepRegistry.ts` and `engine/registry/TagRegistry.ts` (engine-internal implementation)**
- Concrete backing stores used by the registry runtime.
- Imported by `engine/registry/index.ts` only.

**`engine/runtime/ExecutionPlan.ts` (compile types + compile function)**
- Defines `ExecutionPlan` and the compile function that derives it:
  - `compileExecutionPlan(registry, runRequest, options?)`
- Compilation includes validation, schema checks, normalized node IDs, resolved configs, and derived scheduling metadata (SPEC §1.2).

**`engine/runtime/PipelineExecutor.ts` (execution runtime)**
- Implements execution of a compiled plan:
  - `execute(plan, context, options?)`
- Executor does not embed ordering rules beyond what the plan already encodes (SPEC §1.2).

**`engine/observability/index.ts` (public observability surface)**
- Re-exports only stable observability contracts:
  - trace event model and sinks
  - fingerprint utilities (runId + plan fingerprint)
- The engine always produces required observability outputs; tracing sinks remain toggleable (SPEC §1.2).

**`engine/observability/fingerprint.ts` (required outputs)**
- Implements deterministic `runId` and plan fingerprint derivation from:
  - `settings + recipe + step IDs + per-occurrence config`

**`engine/observability/trace.ts` (trace event model)**
- Defines the event model for compile-time and runtime events.
- Supports toggleable sinks without changing execution semantics (SPEC §1.2).

**`engine/lib/**` (neutral utilities)**
- Contains only content-agnostic utilities plausibly shared across mods (math, RNG, noise, geometry, grid helpers).
- Never imports from `mods/**`.

### 2.2 Standard mod layout (feature-sliced content mod)

```text
packages/mapgen-core/src/mods/standard/
├─ mod.ts
├─ index.ts
├─ recipes/
│  └─ default.ts
├─ shared/
│  ├─ runtime.ts
│  ├─ tags.ts
│  └─ artifacts.ts
└─ stages/
   ├─ index.ts
   ├─ foundation/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  └─ *.ts
   │  └─ lib/
   │     └─ **/**
   ├─ morphology/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  └─ *.ts
   │  └─ lib/
   │     └─ **/**
   ├─ hydrology/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  └─ *.ts
   │  └─ lib/
   │     └─ **/**
   ├─ ecology/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  └─ *.ts
   │  └─ lib/
   │     └─ **/**
   ├─ narrative/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  └─ *.ts
   │  └─ lib/
   │     └─ **/**
   └─ placement/
      ├─ index.ts
      ├─ model.ts
      ├─ artifacts.ts
      ├─ steps/
      │  └─ *.ts
      └─ lib/
         └─ **/**
```

**`mods/standard/mod.ts` (thin mod manifest; canonical mod contract export)**
- Exports `standardMod: PipelineMod` (engine contract object).
- Delegates registration to `mods/standard/stages/index.ts`.
- Exposes recipes from `mods/standard/recipes/*`.
- Contains no step implementations, no tag definitions, and no ordering logic.

**`mods/standard/index.ts` (consumer barrel; stable export surface)**
- Re-exports:
  - `standardMod`
  - stage modules for selective import/reuse (`stages/*`)
  - recipes (as authoring/reuse inputs)
- Does not re-export deep internal stage helpers; those remain addressable via direct file paths.

**`mods/standard/recipes/default.ts` (the canonical cross-stage order and toggles)**
- Defines the standard mod’s default recipe.
- Composes stage fragments (`StageModule.entries`) into a single ordered linear recipe.
- Implements all enablement, toggles, and reroutes in the recipe layer (SPEC §1.2).

**`mods/standard/shared/runtime.ts` (standard-mod runtime contract)**
- Declares the runtime adapter surface that standard steps expect to exist.
- Content-only: `engine/**` does not import this.

**`mods/standard/shared/tags.ts` (standard-mod canonical tag inventory)**
- Defines and exports the tag IDs + tag definitions for the standard mod.
- Imports and re-exports stage tag definitions from `stages/<stage>/artifacts.ts`.

**`mods/standard/shared/artifacts.ts` (standard-mod cross-stage artifact catalog + helpers)**
- Aggregates and re-exports stage artifact helpers (stage-owned source of truth remains `stages/<stage>/artifacts.ts`).
- Defines any mod-global artifact helpers that are not stage-local.

**`mods/standard/stages/index.ts` (registry entrypoint; explicit import list)**
- Defines `STAGE_LIST`: every stage module shipped by this mod (auditable import list; SPEC §3).
- Exports `registerStandardStages(registry)` that loops `STAGE_LIST` and calls `stage.register(registry)`.
- Contains no recipe/order logic; list order here is not pipeline execution order.

**`mods/standard/stages/<stage>/index.ts` (stage mini-package boundary)**
- Required exports:
  - `stage: StageModule` (see §3)
  - `ENTRY_LIST` (stage-local step order / recipe fragment)
- Re-exports:
  - stage `model`
  - stage step exports for consumers

**`mods/standard/stages/<stage>/model.ts` (stage-local model)**
- Defines stage-local schema + types shared by the stage’s steps.

**`mods/standard/stages/<stage>/artifacts.ts` (stage-local artifacts and tag definitions)**
- Defines stage-owned tag definitions and artifact helpers.
- Exported for stage-local usage and mod-level aggregation via `shared/*`.

**`mods/standard/stages/<stage>/steps/*.ts` (step modules)**
- Each file defines one step (or one step factory) and its config schema.

**`mods/standard/stages/<stage>/lib/**` (stage-local domain logic)**
- Stage-local algorithms and helpers used by stage steps.

---

## 3) Stage module contract (mod-layer) and recipe composition

Stage modules are a mod-layer authoring abstraction that supports “little packages” without introducing an engine-level stage runtime concept.

### 3.1 `StageModule` (required export contract)

Each `mods/standard/stages/<stage>/index.ts` exports exactly one `StageModule` value:

```ts
export interface StageModule {
  id: string; // stable stage id (package boundary); no engine semantics
  register(registry: Registry): void; // registers steps + tags
  entries: readonly RecipeEntry[]; // stage-local order as a recipe fragment
}
```

Where `RecipeEntry` is the recipe-level unit (engine-owned type) used by V1 linear recipes:

```ts
export type RecipeEntry = {
  stepId: string;
  config?: unknown; // per-occurrence config (schema-validated at compile time)
};
```

Invariants:
- `StageModule.entries` expresses only stage-local ordering; it has no scheduling semantics beyond “this list is in order”.
- Recipes are always canonical. Stages exporting `entries` is an authoring convenience used by recipes; it does not replace the recipe as the source of truth (SPEC §1.2).

Canonical stage file pattern (required):
- `stages/<stage>/index.ts` defines `ENTRY_LIST` as the single source of truth for stage-local step order.
- `stages/<stage>/index.ts` exports `stage.entries = ENTRY_LIST`.

### 3.2 How ordering works (explicit story)

- **Registry**: register all steps/tags (no ordering).
- **Stage**: export `entries` (stage-local ordered fragment).
- **Recipe**: composes fragments into the single global ordered list.

Example (conceptual) default recipe composition:

```ts
import { stage as foundation } from "../stages/foundation";
import { stage as morphology } from "../stages/morphology";
import { stage as hydrology } from "../stages/hydrology";
import { stage as ecology } from "../stages/ecology";
import { stage as narrative } from "../stages/narrative";
import { stage as placement } from "../stages/placement";

export const defaultRecipe: Recipe = {
  schemaVersion: 1,
  steps: [
    ...foundation.entries,
    ...morphology.entries,
    ...hydrology.entries,
    ...ecology.entries,
    ...narrative.entries,
    ...placement.entries,
  ],
};
```

If a recipe needs toggles/reroutes, the recipe transforms the composed list:
- remove entries
- replace an entry (stepId swap)
- insert additional entries between stage fragments

All of that remains in the recipe layer; the engine compiles/executes whatever recipe and registry describe.

---

## 4) Barrels and import ergonomics (fixed rules)

### Allowed barrels

- **Engine barrel:** `engine/index.ts` is the only supported authoring import path.
- **Mod barrel:** `mods/standard/index.ts` is the consumer barrel for the standard mod.
- **Stage barrel:** `mods/standard/stages/<stage>/index.ts` is the only stage barrel.

### Disallowed barrels

- No `lib/index.ts` barrels at any depth (avoid circular imports and opaque re-export ladders).
- No “deep engine” subpath imports for mod authors (`engine/registry/StepRegistry`, etc.).

### Example imports (what this enables)

- Load the whole standard mod (engine consumes a mod contract):
  - `import { standardMod } from "@swooper/mapgen-core/base"`
- Import a whole stage (reuse/test as a mini-package):
  - `import { stage as morphologyStage } from "@swooper/mapgen-core/base/stages/morphology"`
- Import a single step directly (no extra barrels):
  - `import { landmassPlatesStep } from "@swooper/mapgen-core/base/stages/morphology/steps/landmassPlates"`

### Packaging note (subpath exports)

This structure assumes the existing “standard mod as subpath export” packaging remains:
- `@swooper/mapgen-core/base` resolves to `packages/mapgen-core/src/mods/standard/mod.ts`
- `@swooper/mapgen-core/base/stages/<stage>` resolves to `packages/mapgen-core/src/mods/standard/stages/<stage>/index.ts`

Engine is exposed as a single supported authoring surface via `engine/index.ts`.

---

## 5) SPEC alignment and deltas (explicit)

### Direct alignment with SPEC intent

- **Mods are content; engine is content-agnostic** (SPEC §1.1, §1.2).
- **Standard pipeline ships as a standard mod package** (SPEC §2.1).
- **Recipe is the single source of truth for ordering and enablement** (SPEC §1.2).
- **Registry is explicit and fail-fast** (SPEC §3).
- **Observability baseline includes runId/fingerprint and structured failures** (SPEC §1.2 observability baseline).

### Sharpened/clarified points this SPIKE makes concrete

- **Fixed on-disk template for stages** (file-based routing readiness):
  - every stage has the same required shape and exports a `StageModule`.
  - empty directories/files are allowed, but the shape is invariant across stages and mods.
- **Stage is a mod-layer authoring unit**:
  - a stage is a recipe fragment + registration function, not an engine runtime concept.
- **RunRequest is strictly engine-owned**:
  - mods never ship RunRequest translators; “presets” are expressed as named recipes or app/CLI helpers.

### SPEC text likely to update (if we adopt this as canonical)

If the SPEC currently implies “stage manifests” as a runtime concept or suggests multiple possible on-disk shapes, it should be sharpened to:
- treat stage only as mod-internal packaging and recipe fragments
- standardize the stage slice template as the canonical mod authoring layout

---

## 6) Why this reduces friction (without adding new engine abstractions)

- A mod author adds a stage by creating one directory and implementing one `StageModule` export; stage-local order lives with the stage.
- Cross-stage order and toggles live in exactly one place: the recipe.
- `mod.ts` stays stable and boring; it becomes the least-touched file in normal development.
- Stage importability is explicit and ergonomic: other mods can import a stage as a unit (mini-package boundary) without depending on a central “planner” map of every step.
