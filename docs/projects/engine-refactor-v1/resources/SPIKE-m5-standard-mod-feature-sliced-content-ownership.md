# SPIKE: Standard Mod as a Feature-Sliced “App” (Everything Content is Mod-Owned)

Primary references:
- Canonical target: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`
- Boundary skeleton decision record: `docs/projects/engine-refactor-v1/issues/M5-U02-standard-mod-boundary-skeleton.md`

This SPIKE is structural only: it defines ownership boundaries, directory layout, and contracts. It does not include migration steps or implementation tasks.

---

## 0) Locked high-level architecture (engine runtime + authoring SDK + mods)

### Engine SDK (`packages/mapgen-core/src/engine/**`) is runtime-only

The engine is content-agnostic and owns only the generic pipeline runtime:

- **One registry concept (engine-owned):** step registry + tag registry.
- **One compile/execute model (engine-owned):** `RunRequest -> ExecutionPlan -> execution`.
- **RunRequest is engine-owned only** and is the sole boundary input shape: `RunRequest = { recipe, settings }` (SPEC §1.2, §2.1).
- **No stage/authoring concepts exist in the engine** (they live in authoring only).

### Authoring SDK (`packages/mapgen-core/src/authoring/**`) is ergonomic-only

The authoring SDK is the sole surface for mod authors. It is a thin wrapper around engine types:

- **Defines authoring helpers and contracts** (e.g., `StageModule`, `defineStage`, recipe composition helpers).
- **Re-exports engine contracts** needed by mods (e.g., `MapGenStep`, `Recipe`, `Registry`).
- **Does not contain runtime logic** and is not used by the executor.

### Standard mod (`packages/mapgen-core/src/mods/standard/**`) is pure content

The standard mod is a “feature-sliced app” composed of stage mini-packages:

- **Stages are mini-packages** and own:
  - step definitions
  - stage-local model (schema + types)
  - stage-local artifacts + helpers
  - stage-local domain logic (`lib/**`)
- **Stage modules are the primary authoring unit** for content authors:
  - a stage owns its **local default ordering** via its `entries` list (see §3).
  - a stage does not define global pipeline semantics; it is a packaging boundary + local defaults.
- **Recipes are the only cross-stage sequencing and toggle surface**:
  - recipes are authored by composing stage `entries` (concatenate) plus a small number of explicit edits (insert/remove/replace).
  - narrative ordering/interleaving remains recipe-driven and is explicitly de-scoped from this refactor (see §1, §3.4).
- **`mod.ts` is a thin manifest**: it ties stage registration + recipes into an engine `PipelineMod`.

### Layering invariants (non-negotiable)

- `engine/**` never imports from `authoring/**` or `mods/**`.
- `authoring/**` may import from `engine/index.ts` only.
- `mods/**` import from `authoring/index.ts` only; mods do not import `engine/**` directly.
- “Stage” is a mod-authoring concept; the engine has no first-class stage runtime concept.

---

## 1) Conceptual model (registry vs stage vs recipe vs mod)

This proposal intentionally separates **catalog**, **local bundles**, and **global orchestration**:

- **Registry (engine):** “what exists”.
  - step definitions and tag definitions are registered here.
  - registry defines validity (no collisions; unknown IDs are errors) but has no ordering.
- **Stage (mod mini-package):** “local cluster + content ownership (+ local defaults)”.
  - a stage exports its step modules (a mini-package boundary for reuse).
  - a stage registers its own steps/tags into the engine registry.
  - a stage provides its **local default ordering** as `entries` (mod-owned; used as recipe fragments).
- **Recipe (mod):** “global plan”.
  - the recipe is the only place that defines cross-stage sequencing, selection, and toggles.
  - the default recipe is authored by composing stage `entries` plus a small set of explicit edits (SPEC §2.1 V1 still compiles from a linear `steps[]` list).
  - recipes may interleave steps from different stages; stage boundaries are packaging, not execution segments.
- **Mod (engine contract object):** “the deliverable package”.
  - the mod provides a `register(registry)` function and a `recipes` map.
  - the engine compiles and executes using `RunRequest` that references one of those recipes.

This matches SPEC intent:
- “Recipe is the single source of truth for step ordering and enablement” (SPEC §1.1, §1.2).
- “Vanilla ships as a standard mod package (registry + default recipe), not a privileged internal order” (SPEC §2.1).

### Narrative is explicitly de-scoped (structure is conservative; semantics stay recipe-driven)

Narrative/playability is not a privileged pipeline phase; it is an **optional bundle of normal steps**
selected and ordered by the recipe (SPEC §1.6; `PRD-target-narrative-and-playability.md`).

For this refactor SPIKE:
- **Structurally:** narrative remains a single `stages/narrative/` slice with the same on-disk template as other stages.
- **Semantically:** narrative remains cross-cutting via typed artifacts consumed by other steps.
- **Ordering:** narrative placement/interleaving remains recipe-driven (as it is today) and is **out of scope** to redesign here.

This SPIKE’s stage/recipe authoring model must not depend on having narrative “solved”.

---

## 2) Target directory layout (required, no optional files)

### 2.1 Engine layout (generic runtime SDK)

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

**`engine/index.ts` (public engine surface; runtime only)**
- Re-exports the public engine API:
  - registry creation (`createRegistry`, registry public types)
  - compile (`compileExecutionPlan`) and runtime (`PipelineExecutor`)
  - shared types (`RunRequest`, `Recipe`, `ExecutionPlan`, `MapGenStep`, tag types)
  - error types and observability types (stable contracts)
  - mod contract types (`PipelineMod`)
- Does not re-export engine-internal implementation classes (`StepRegistry`, `TagRegistry`).

**`engine/types.ts` (public runtime contracts)**
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

**`engine/mod.ts` (mod contract types)**
- Defines the engine contract a mod must satisfy (`PipelineMod`).
- Does not contain standard-mod content or helpers.

**`engine/registry/index.ts` (public registry API; engine-owned)**
- Exposes the supported registry construction surface:
  - `createRegistry()` (constructs an empty registry)
  - `Registry` public interface for registration and lookup
- Guarantees fail-fast collision checks (SPEC §3).

**`engine/registry/StepRegistry.ts` and `engine/registry/TagRegistry.ts` (engine-internal implementation)**
- Concrete backing stores used by the registry runtime.
- Imported by `engine/registry/index.ts` only.

**`engine/runtime/ExecutionPlan.ts` (compile types + compile function)**
- Defines `ExecutionPlan` and the compile function that derives it:
  - `compileExecutionPlan(registry, runRequest, options?)`

**`engine/runtime/PipelineExecutor.ts` (execution runtime)**
- Implements execution of a compiled plan:
  - `execute(plan, context, options?)`

**`engine/observability/index.ts` (public observability surface)**
- Re-exports only stable observability contracts:
  - trace event model and sinks
  - fingerprint utilities (runId + plan fingerprint)

**`engine/observability/fingerprint.ts` (required outputs)**
- Implements deterministic `runId` and plan fingerprint derivation from:
  - `settings + recipe + step IDs + per-occurrence config`

**`engine/observability/trace.ts` (trace event model)**
- Defines the event model for compile-time and runtime events.

**`engine/lib/**` (neutral utilities)**
- Contains only content-agnostic utilities plausibly shared across mods (math, RNG, noise, geometry, grid helpers).
- Never imports from `mods/**`.

### 2.2 Authoring SDK layout (mod-authoring ergonomics)

```text
packages/mapgen-core/src/authoring/
├─ index.ts
├─ stage.ts
└─ recipe.ts
```

**`authoring/index.ts` (public authoring surface; only supported mod import path)**
- Re-exports authoring helpers and contracts:
  - `StageModule`, `StageEntry`, `defineStage`
  - recipe composition helpers (`composeStages`, `toRecipeSteps`, `insertAfter`, `removeStep`, `replaceStep`, `disableStep`)
- Re-exports required engine types for mod authors:
  - `MapGenStep`, `Recipe`, `Registry`, tag types, `PipelineMod`
- Does not embed runtime logic; it is a thin authoring layer.

**`authoring/stage.ts` (stage authoring contract + helpers)**
- Defines `StageEntry` and `StageModule`.
- Provides `defineStage` to produce a `StageModule` with a generated `register`.

**`authoring/recipe.ts` (recipe composition helpers)**
- Provides pure list helpers for composing stage defaults and applying small edits.
- Produces engine `Recipe.steps[]` occurrences without re-spelling every step ID.

### 2.3 Standard mod layout (feature-sliced content mod)

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
- Is authored by composing stage-local canonical `entries` (concatenate) plus a small set of explicit edits (insert/remove/replace).
- May interleave steps from different stages (especially narrative); stage boundaries do not imply contiguous execution.
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
  - `stage: StageModule` (from the authoring SDK)
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

## 3) Authoring SDK contracts (stage + recipe) and minimal ergonomics

Stage modules are an authoring abstraction that supports “little packages” without introducing an engine-level stage runtime concept.

### 3.1 `StageModule` (authoring contract; engine-agnostic)

Each `mods/standard/stages/<stage>/index.ts` exports exactly one `StageModule` value:

```ts
import type { MapGenStep, Recipe, Registry } from "@swooper/mapgen-core/authoring";

export interface StageEntry {
  step: MapGenStep;
  enabled?: boolean;
  config?: Recipe["steps"][number]["config"];
}

export interface StageModule {
  id: string; // stable stage id (package boundary); no engine semantics
  entries: readonly StageEntry[]; // canonical stage-local default ordering (authoring-time)
  register(registry: Registry): void; // registers steps + tags referenced by this stage
}
```

### 3.2 Builder pattern evaluation (is a `StageBuilder` worth it?)

We evaluated a fluent/builder-style stage API (e.g. `stage.step(...).step(...).build()`) against a plain `StageModule` object + minimal helper.

Relevant references reviewed:
- Builder pattern overview: https://refactoring.guru/design-patterns/typescript
- Builder in TypeScript examples: https://refactoring.guru/design-patterns/builder/typescript/example
- Fluent interface tradeoffs: https://martinfowler.com/bliki/FluentInterface.html

**What a builder could buy us**
- A readable, DSL-like stage definition (`defineStage("morphology").step(...).step(...).build()`) that makes author intent (ordered list) obvious.
- A place to centralize “construction rules” (automatic registration, deduping, consistent naming).

**What it would cost**
- Another abstraction surface area to learn and maintain.
- More subtle debugging (method chaining + stateful builder) and potential over-design, especially if the “product” is just `{ id, entries, register }`.

**Decision (for this SPIKE)**
- Do **not** introduce a fluent `StageBuilder` as a required concept.
- Standardize on a minimal helper that constructs a `StageModule` from an ordered `entries[]` list and generates `register()` automatically.

Concretely, `authoring/stage.ts` should provide something like:

```ts
export function defineStage(input: {
  id: string;
  entries: readonly StageEntry[];
  registerTags: (registry: Registry) => void;
}): StageModule {
  // …implementation would:
  // - registerTags(registry)
  // - registry.register(entry.step) for each entry.step (deduped)
  // - return { id, entries, register }
  throw new Error("SPIKE: structure only");
}
```

If a fluent DSL is ever added, it must be additive sugar over `defineStage` and must not change the `StageModule` contract.

### 3.3 Recipe composition helpers (authoring-only)

The authoring SDK provides pure list helpers to reduce duplication while keeping the recipe canonical:

```ts
export function composeStages(stages: readonly StageModule[]): readonly StageEntry[];
export function toRecipeSteps(entries: readonly StageEntry[]): Recipe["steps"];

export function insertAfter(
  steps: Recipe["steps"],
  afterStepId: string,
  insertStepId: string,
  config?: Recipe["steps"][number]["config"],
): Recipe["steps"];

export function removeStep(steps: Recipe["steps"], stepId: string): Recipe["steps"];
export function replaceStep(
  steps: Recipe["steps"],
  fromStepId: string,
  toStepId: string,
): Recipe["steps"];
```

These helpers do not change runtime semantics: the compiler still consumes `Recipe.steps[]` and `Registry` only.

### 3.4 How ordering works (stage defaults + recipe glue)

This keeps a low-rule authoring model while preserving SPEC runtime semantics:

- **Stage** is canonical for its *local default ordering* (via `entries[]`).
- **Recipe** remains canonical for the *final compiled linear order* (`Recipe.steps[]`), but it is authored by:
  1) concatenating stage `entries[]`, then
  2) applying a small number of explicit edits (insert/remove/replace).

`StageModule.entries` is authoring-time code that produces the recipe’s `steps[]`.

### 3.5 Where `requires` / `provides` live (no semantic regression)

This structure does not change dependency semantics:

- `requires` / `provides` remain properties on the **step definitions** (registered in the engine registry).
- The recipe contributes only **an ordered list of step occurrences** (plus enablement/config).
- The engine compiler validates dependency tags and step presence against the registry and authored order, producing an `ExecutionPlan`.

In other words: stages/recipes decide ordering; steps decide contracts; the engine enforces them.

---

## 4) Standard-mod authoring example (stage + recipe)

### 4.1 Stage example

```ts
import { defineStage } from "@swooper/mapgen-core/authoring";
import { registerNarrativeTags } from "./artifacts";
import { storySeedStep } from "./steps/storySeed";
import { storyOrogenyStep } from "./steps/storyOrogeny";

export const stage = defineStage({
  id: "standard.narrative",
  entries: [
    { step: storySeedStep },
    { step: storyOrogenyStep },
  ],
  registerTags: registerNarrativeTags,
});

export { storySeedStep, storyOrogenyStep };
```

### 4.2 Step example (requires/provides remain on the step)

```ts
import type { MapGenStep } from "@swooper/mapgen-core/authoring";
import { NarrativeTags } from "../artifacts";

export const storyOrogenyStep: MapGenStep = {
  id: "narrative.story-orogeny",
  phase: "narrative",
  requires: [NarrativeTags.storySeeded],
  provides: [NarrativeTags.storyOrogeny],
  async run(context) {
    // ...
  },
};
```

### 4.3 Recipe example (canonical global order)

```ts
import type { Recipe } from "@swooper/mapgen-core/authoring";
import { composeStages, toRecipeSteps, insertAfter } from "@swooper/mapgen-core/authoring";

import { stage as foundation } from "../stages/foundation";
import { stage as morphology } from "../stages/morphology";
import { stage as hydrology } from "../stages/hydrology";
import { stage as ecology } from "../stages/ecology";
import { stage as narrative } from "../stages/narrative";

import { coastlinesStep } from "../stages/morphology/steps/coastlines";
import { storySeedStep } from "../stages/narrative/steps/storySeed";

export const defaultRecipe: Recipe = {
  schemaVersion: 1,
  steps: (() => {
    const base = composeStages([foundation, morphology, hydrology, ecology, narrative]);
    const ordered = toRecipeSteps(base);

    // Narrative remains recipe-driven and may be interleaved explicitly.
    return insertAfter(ordered, coastlinesStep.id, storySeedStep.id);
  })(),
};
```

---

## 5) Barrels and import ergonomics (fixed rules)

### Allowed barrels

- **Engine barrel:** `engine/index.ts` is the only supported runtime import path.
- **Authoring barrel:** `authoring/index.ts` is the only supported mod import path.
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
- Authoring helpers for mods:
  - `import { defineStage, composeStages } from "@swooper/mapgen-core/authoring"`

### Packaging note (subpath exports)

This structure assumes the existing “standard mod as subpath export” packaging remains:
- `@swooper/mapgen-core/base` resolves to `packages/mapgen-core/src/mods/standard/mod.ts`
- `@swooper/mapgen-core/base/stages/<stage>` resolves to `packages/mapgen-core/src/mods/standard/stages/<stage>/index.ts`
- `@swooper/mapgen-core/engine` resolves to `packages/mapgen-core/src/engine/index.ts`
- `@swooper/mapgen-core/authoring` resolves to `packages/mapgen-core/src/authoring/index.ts`

---

## 6) SPEC alignment and deltas (explicit)

### Direct alignment with SPEC intent

- **Mods are content; engine is content-agnostic** (SPEC §1.1, §1.2).
- **Standard pipeline ships as a standard mod package** (SPEC §2.1).
- **Recipe is the single source of truth for global ordering and enablement** (SPEC §1.2).
- **Registry is explicit and fail-fast** (SPEC §3).
- **Observability baseline includes runId/fingerprint and structured failures** (SPEC §1.2 observability baseline).

### Sharpened/clarified points this SPIKE makes concrete

- **Three-layer split is explicit:**
  - engine = runtime
  - authoring = ergonomics
  - mods = content
- **Fixed on-disk template for stages** (file-based routing readiness):
  - every stage has the same required shape and exports a `StageModule`.
  - empty directories/files are allowed, but the shape is invariant across stages and mods.
- **Stage is a mod-authoring unit**:
  - a stage is a packaging boundary (registration + exports), not an engine runtime concept.
- **Stage-local ordering defaults are stage-owned; recipe is glue**:
  - the default recipe is authored by composing stage-owned `entries` plus small list edits (aligns with SPEC’s “recipe ordering” because the compiled `Recipe.steps[]` remains the canonical runtime input).
- **Narrative stays conservative and deferred**:
  - narrative remains an optional bundle of steps (SPEC §1.6) published/consumed via typed narrative artifacts, and narrative ordering/interleaving remains recipe-driven and is explicitly deferred to a dedicated narrative design SPIKE.
- **RunRequest is strictly engine-owned**:
  - mods never ship RunRequest translators; “presets” are expressed as named recipes or app/CLI helpers.

### SPEC text likely to update (if we adopt this as canonical)

If the SPEC currently implies “stage manifests” as a runtime concept or suggests multiple possible on-disk shapes, it should be sharpened to:
- treat stage only as mod-internal packaging and recipe fragments
- standardize the stage slice template as the canonical mod authoring layout
- introduce `authoring/**` as the only supported mod authoring surface

---

## 7) Why this reduces friction (without new runtime abstractions)

- A mod author adds a stage by creating one directory and exporting one `StageModule`; step ownership is co-located with domain logic.
- Cross-stage order and toggles live in exactly one place: the recipe.
- `mod.ts` stays stable and boring; it becomes the least-touched file in normal development.
- Stage importability is explicit and ergonomic: other mods can import a stage as a unit (mini-package boundary) without depending on a central “planner” map of every step.
- Authoring ergonomics are centralized in `authoring/**` so mods do not recreate scaffolding.
