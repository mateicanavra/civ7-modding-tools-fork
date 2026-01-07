# Prep: Recipe Composition + Composition‑First Compiler (Baseline vs Proposals)

## 0) What this is (and is not)

This document is a **framing / orientation artifact** for a future (more capable) AI model that will help design the next iteration of the MapGen SDK/package target architecture **specifically for the recipe composition problem**.

It is **not** a new architecture design and does **not** make decisions. It:

- Anchors on the **implemented baseline** in the current codebase (ground truth).
- Separates **baseline reality** vs **historical proposals** (some now outdated).
- Extracts **still‑useful fragments** from proposals, with the **trade‑offs as already discussed** in those sources.
- Points you to the right **source documents and code entrypoints** to verify.

**Instruction to the advanced AI:** treat this as a map, not as truth. Re‑read the baseline code and the cited docs directly; validate every claim against the repo you have.

---

## 1) Baseline reality (implemented in code today)

### 1.1 The baseline recipe pipeline in one sentence

Today, **recipes are explicit authored stage/step lists**; map entrypoints provide `{ settings, config }`; the engine compiles this into an `ExecutionPlan` (validates + defaults + optional `step.resolveConfig`), then the executor runs steps using the **plan‑stored configs** (no further meaning‑level config resolution at runtime).

### 1.2 Baseline: key code entrypoints (start here)

**Core authoring wrapper (recipe assembly + registry build):**
- `packages/mapgen-core/src/authoring/recipe.ts`
  - `createRecipe({ id, namespace?, tagDefinitions, stages })`
  - derives full step ids: `namespace.recipeId.stageId.stepId`
  - builds a `StepRegistry` + `TagRegistry` (auto‑infers missing tag definitions by scanning requires/provides, then overlays explicit definitions)
  - exposes `instantiate()`, `runRequest()`, `compile()`, `run()`

**Engine plan compiler (validation + compile‑time normalization):**
- `packages/mapgen-core/src/engine/execution-plan.ts`
  - `RunSettingsSchema` + `RunRequestSchema`
  - `compileExecutionPlan(runRequest, registry)`
  - per node:
    - schema default/clean/unknown-key detection
    - optional `step.resolveConfig(config, settings)` (compile‑time hook), then re‑validate

**Executor (runtime behavior; no config resolution beyond using plan configs):**
- `packages/mapgen-core/src/engine/PipelineExecutor.ts`
  - `executePlan(context, plan)` runs steps sequentially
  - checks `requires` satisfaction and post‑checks `provides` satisfaction via `TagRegistry` + `DependencyTagDefinition.satisfies`

**Dependency registry semantics (baseline uses `field:`):**
- `packages/mapgen-core/src/engine/tags.ts`
  - `DependencyTagKind = "artifact" | "field" | "effect"`
  - satisfaction model: tags become satisfied only when explicitly provided; optional `satisfies(context, state)` gates truth

### 1.3 Baseline: how “recipe composition” actually happens today

**Recipe composition (structure + ordering):**
- Stages are explicit lists: `createStage({ id, steps })` in `packages/mapgen-core/src/authoring/stage.ts`.
- Recipe composes stages explicitly; there is **no** compile‑time scheduling/toposort in the baseline compiler (ordering is the authored sequence; missing deps fail at runtime).

**Config composition (values):**
- Map entrypoints provide a `RecipeConfigOf<typeof stages>` object (stageId → stepId → config object).
- Engine compilation:
  - applies step schema defaults/cleaning,
  - then optionally calls `step.resolveConfig(...)`.
- In practice, “composition” of multiple op configs inside a step is done manually inside `step.resolveConfig`, typically delegating to op‑local `op.resolveConfig(...)` (see below).

**Config composition (schemas/defaults):**
- Step contract schemas commonly **compose op config schemas** and **op defaultConfig** values explicitly, by importing ops in the step contract module.
  - Example: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/contract.ts`

**Op/strategy compile‑time resolution (current baseline):**
- `packages/mapgen-core/src/authoring/op/create.ts` derives:
  - `op.config` (envelope schema union)
  - `op.defaultConfig` (`{ strategy: "default", config: <defaulted inner> }`)
  - `op.resolveConfig(envelope, settings)` which delegates to the selected strategy’s `resolveConfig` if present.

### 1.4 Baseline: where standard content wires this

**Standard recipe module:**
- `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`
  - composes stages
  - passes `STANDARD_TAG_DEFINITIONS`

**Standard runner glue:**
- `mods/mod-swooper-maps/src/maps/_runtime/standard-entry.ts`
- `mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts`

**Important baseline reality vs older docs:**
- There is **no** `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` in the current baseline.
- Any older references to `StandardRecipeOverrides` or “overrides translation” are historical (see “Obsolete sections” below).

### 1.5 Baseline “runtime config resolution” that still exists (relevant to the goal)

For the “no runtime resolution of config” direction, the baseline already does most of the work:

- Plan compilation produces explicit `ExecutionPlan.nodes[].config`, and `PipelineExecutor.executePlan(...)` uses that config directly.

But there are still **runtime‑adjacent normalization smells** worth noting for later design work:

- Some strategy implementations still call their own local `resolveConfig(...)` inside `run(...)` (runtime), even if compile‑time resolution exists. The advanced AI should audit this pattern and decide whether it’s acceptable (pure deterministic normalization) or should be eliminated in favor of compile‑time only.

---

## 2) Target direction for this pass (problem framing)

Focus: **recipe composition / recipe compiler**.

Desired direction: **composition‑first recipe compiler**, meaning:

- **No runtime resolution of config** (plan truth is fully resolved at composition/compile time).
- Recipe compilation is the place where config defaults/normalization/composition are applied, not during execution.

This direction implies architectural changes; old proposals explored pieces of this but were not implemented before the baseline shipped.

---

## 3) “Where we are now” vs prior proposals (high-level diff)

### 3.1 What’s already true in the baseline (aligned with composition-first)

- There is an explicit **compile phase** (`compileExecutionPlan`) that validates + defaults configs and can run a compile‑time resolver hook (`step.resolveConfig`).
- Execution uses plan configs directly (`PipelineExecutor.executePlan`).
- Op strategy config has a stable envelope (`{ strategy, config }`) with a mandatory `default` strategy and an op‑level `resolveConfig` dispatcher.

### 3.2 What’s *not* in the baseline (common proposal goals that remain open)

These are recurring proposal themes that are **not implemented** in the baseline:

- **Recipe-owned compilation pipeline** (a “recipe builder” that is the compiler, rather than the engine being the primary compiler).
- **Mechanical op-level config resolution** without per-step “forwarding” boilerplate (compiler applies `op.resolveConfig` automatically by scanning step metadata / op bindings).
- **Stage-level knobs** (distinct from runtime parameters) that are derived/composed and sliced into ops during compilation.
- **Public vs internal config planes** (public authoring view transformed into internal plan config).
- **Compile-time dependency scheduling** (toposort / gating during compilation rather than fail-fast only at runtime).
- A decision between **TagRegistry dependency keys** vs **ResourceStore / typed refs** as the primary dependency primitive.

---

## 4) Source inventory (spec + proposals relevant to this problem)

### 4.1 Target spec / ADRs (authoritative project intent, not necessarily implemented)

- `docs/projects/engine-refactor-v1/resources/spec/SPEC-architecture-overview.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-standard-content-package.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-032-recipe-config-authoring-surface.md` (proposed)
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-033-step-schema-composition.md` (proposed)
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md` (accepted)

### 4.2 Proposal iterations that directly discuss composition-first compilation

Most relevant for this pass:

- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-pro-proposal-v6-alt-2.md`
  - argues for mechanical compilation + optional facade expansion; step.resolveConfig not default
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-pro-proposal-v7-alt-2.md`
  - recipe builder owns compile; stage views + stage knobs derivation; introduces ResourceStore fork
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-think-converge-diagrams.md`
  - diagrams of a recipe-builder compilation pipeline (internal config focus)
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/review-v7-divergence.md`
  - explicit “binary design decisions” list (axes A–G) and a handoff direction doc
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-pro-converge-architecture.md`
  - consolidation attempt; explicitly calls out “recipe builder owns compile” and warns about dual-compiler drift

Historically relevant but partially incompatible with the current spec/baseline:

- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-pro-proposal-v5-alt-2.md`
  - pushes “inverted settings” (engine generic over settings; recipes own settings schema) which differs from the baseline’s engine-owned `RunSettingsSchema`

Also useful as historical context:

- `docs/projects/engine-refactor-v1/resources/repomix/gpt-config-architecture-converged.md`
  - contains a pre-implementation snapshot; some statements are now obsolete (see below)

---

## 5) Viable proposal fragments for a composition-first recipe compiler (with cited trade-offs)

This section isolates **fragments** that remain relevant *even if the enclosing proposal is outdated*. For each fragment:

- **What it is** (idea/pattern)
- **Why it matters** to composition-first compilation
- **Trade-offs** (only as discussed in source docs)
- **Sources** (where to read)

### Fragment A — Compile-time-only normalization boundaries (step & op resolvers)

**What:** A consistent rule that normalization/defaulting happens at compile time, and runtime treats `node.config` as “the config”.

**Why it matters:** It’s the core invariant behind “no runtime resolution of config”.

**Trade-offs already discussed:**
- Schema defaults only are insufficient for derived defaults; without a normalization hook, fixups drift into runtime and become hard to observe.
- Adding a normalization phase requires defining a safe/pure resolver surface.

**Sources:**
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md`
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-pro-proposal-v5-alt-2.md` (resolveConfig compile-time framing)

**Baseline alignment:** largely implemented via `compileExecutionPlan(...)` calling optional `step.resolveConfig(...)` and storing the result in plan nodes.

### Fragment B — “Fractal only at step boundaries” (manual step composition of multiple ops)

**What:** The compiler knows about steps; composite steps may call multiple ops and remain the composition point for op-level normalization.

**Why it matters:** It’s the **minimal** composition-first approach that works with today’s baseline structure.

**Trade-offs already discussed:**
- Pros: keeps compilation model simple (compiler doesn’t need to understand ops).
- Cons: step authors write forwarding boilerplate and can duplicate defaults/normalization logic.

**Sources:**
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md` (step boundary + fractal language)
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-033-step-schema-composition.md` (manual wiring chosen; proposed)

### Fragment C — Mechanical op-level resolveConfig application (reduce boilerplate)

**What:** Steps declare which ops they contain/bind, and compilation applies `op.resolveConfig(...)` mechanically (so steps do not write “forwarding resolveConfig” code by default).

**Why it matters:** This directly targets the recipe composition pain where config resolution/normalization is hand-coded and duplicated in step modules.

**Trade-offs already discussed:**
- Pros: eliminates duplicated defaults and forwarding logic; simplifies step authoring DX.
- Cons: introduces more “framework” semantics / inference; can make contract changes less explicit and harder to audit.

**Sources:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-pro-proposal-v6-alt-2.md` (core position + mechanical compileConfig)
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-pro-proposal-v7-alt-2.md` (mechanical op.resolve in recipe builder)
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-033-step-schema-composition.md` (option 2 trade-offs; proposed)
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-think-converge-diagrams.md` (ordering/flow diagrams)

### Fragment D — Compiler ownership: engine-centered vs recipe-builder-centered

**What:** A binary axis: engine owns plan compilation vs recipe builder owns compilation pipeline.

**Why it matters:** A composition-first compiler can be implemented in either place, but ownership impacts extensibility and avoiding “two sources of truth”.

**Trade-offs already discussed:**
- The sources frame this primarily as an ownership fork (“engine is the main compiler” vs “recipe builder is the compiler”).
- Multiple documents call out the risk of **dual compiler drift** if compilation logic is split between engine and recipe builder.

**Sources:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/review-v7-divergence.md` (axis A)
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-pro-converge-architecture.md` (central compilation + dual compiler warning)

### Fragment E — Public vs internal config planes + stage-level “views”

**What:** Keep internal plan-truth config distinct from public authoring config; use stage-level view transforms (`publicSchema` + `toInternal`) as the main UX boundary.

**Why it matters:** It’s a common path to keep plan truth strict while presenting simpler public authoring surfaces, without letting internal envelopes/ids leak.

**Trade-offs already discussed:**
- Pros: better public DX; internal invariants stay strict and explicit.
- Cons: introduces a second schema plane and transform code that must remain deterministic and testable.

**Sources:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/review-v7-divergence.md` (axes B/C; D2/D3)
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-pro-proposal-v7-alt-2.md` (section “Public config lives on stages…”)

### Fragment F — Knobs vs runtime parameters separation

**What:** Treat “knobs/settings” (author-tuned compilation inputs) as distinct from runtime/game parameters; potentially derive knob surfaces from domains/ops.

**Why it matters:** A composition-first compiler often needs compile-time inputs that shape defaults/normalization without turning runtime parameters into “settings leaks”.

**Trade-offs already discussed:**
- The sources treat this as a distinct model to define (knobs vs runtime parameters vs op config), with the mechanics of derivation/composition remaining a key decision surface.

**Sources:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/review-v7-divergence.md` (axis F; D4)
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-pro-proposal-v6-alt-2.md` (compile-time knobs vs runtime params)
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-pro-proposal-v7-alt-2.md` (domain knobs + stage knob derivation)

### Fragment G — Dependency primitive fork: TagRegistry keys vs ResourceStore refs (deferable)

**What:** Whether dependencies are expressed as string keys validated by a registry, or as typed resource refs + presence in a resource store.

**Why it matters:** It affects scheduling/compilation semantics and how “satisfaction” is modeled.

**Trade-offs already discussed:**
- It’s a real fork impacting type surface, runtime model, and migration strategy.
- Multiple documents recommend deferring this until compilation + knobs model are settled.

**Sources:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/review-v7-divergence.md` (axis D; deferral guidance)
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-pro-proposal-v7-alt-2.md` (ResourceStore direction)

---

## 6) Clearly obsolete / low-viability sections (relative to the current baseline)

These are worth calling out explicitly so the advanced AI doesn’t inherit stale assumptions.

### 6.1 “StandardRecipeOverrides” / overrides translation

Multiple historical docs reference an overrides-shaped authoring surface and a translation layer:

- `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` (referenced in ADR-ER1-035 inventory)
- `StandardRecipeOverrides` / deep partial merges

**Baseline reality:** this file and flow do not exist in the current baseline; map entrypoints provide `settings` + `StandardRecipeConfig | null` directly, and the recipe compiler is the canonical normalization boundary.

Sources that contain now-stale references:
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md` (inventory sections A/B/C reference `standard-config.ts` as legacy)
- `docs/system/mods/swooper-maps/architecture.md` (mentions `standard-config.ts`)

### 6.2 “Inverted settings” as a hard requirement (engine generic over settings)

Some proposals push for removing an engine-owned settings schema and making the engine generic over an opaque settings type composed by recipes/domains.

**Baseline reality:** the engine defines `RunSettingsSchema` and uses it during plan compilation (`packages/mapgen-core/src/engine/execution-plan.ts`).

This does not automatically make the idea “wrong”, but it is **incompatible** with the current baseline/spec unless the project deliberately revisits that decision.

Primary source:
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/gpt-pro-proposal-v5-alt-2.md`

---

## 7) Suggested starting checklist for the advanced AI

1. Read the baseline code entrypoints:
   - `packages/mapgen-core/src/authoring/recipe.ts`
   - `packages/mapgen-core/src/engine/execution-plan.ts`
   - `packages/mapgen-core/src/engine/PipelineExecutor.ts`
   - `packages/mapgen-core/src/authoring/op/create.ts`
2. Read the target-spec anchors:
   - `docs/projects/engine-refactor-v1/resources/spec/SPEC-architecture-overview.md`
   - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md`
3. Then mine the proposal fragments (do not treat them as current truth):
   - v6 Alt2 (`gpt-pro-proposal-v6-alt-2.md`) for mechanical op-level compilation ideas
   - v7 Alt2 + `review-v7-divergence.md` for the “recipe builder owns compile” axis and view/knob framing
   - `gpt-think-converge-diagrams.md` for compilation ordering/flow diagrams
