Below is a **high-level implementation plan** sliced by **risk/complexity** and by what you can land **early** (before refactoring the remaining domains), with **ecology as the canonical proving ground**. Each slice ends in a stable, test-passing repo state. Where a temporary bridge is unavoidable, it’s explicitly scoped and has a scheduled removal slice.

---

# Overview

### Core idea

Land the **compiler + execution boundary** first (so the codebase is operating under the new “compiled configs only” rule), then refactor **ecology** to the canonical best-practice pattern, then roll that pattern across other domains.

### Key constraint reality check

Removing engine-time canonicalization (`step.resolveConfig`, `Value.Default/Clean` during plan compilation) *before* all steps are migrated is not possible without a **compile-time equivalent**. The cleanest “no parallel modes” bridge is:

* Keep the old hooks callable **only inside the new compiler** (never at runtime, never in the engine).
* Treat them as legacy normalization hooks in the compiler pipeline.
* Remove them once ecology + remaining domains are migrated.

This is not “dual mode” at runtime. It is a short-lived *compatibility adapter* in the compiler only.

---

# Slice plan

## Slice 0 — Repo preflight + guardrails scaffolding

**Risk:** Low
**Goal:** Make later changes safe and observable.

### Changes

* Add CI/test gates that you will rely on later:

  * A “no runtime defaulting” grep check (temporary) that fails if `typebox/value` is imported in runtime modules (steps/op runs/engine executor). Don’t enforce for authoring factories yet.
  * A quick runtime smoke test that runs StandardRecipe end-to-end (or your smallest recipe).

### Stable end state

* No functional behavior change.
* All tests/builds pass.

### Why now

You want immediate visibility when a later slice accidentally reintroduces runtime defaulting or silent branching.

---

## Slice 1 — Core compiler primitives + Env rename landing

**Risk:** Low–Medium (large rename surface, but mechanical)
**Goal:** Land the foundational “vocabulary + plumbing” without changing behavior.

### Changes

1. Introduce compiler-only modules (not yet used by runtime flow):

* `compiler/errors.ts`
* `compiler/normalize.ts` (strict normalization, unknown-key detection, etc.)
* `core/env.ts` (`Env`, `EnvSchema`, reserved `"knobs"` key)

2. Mechanical rename:

* `RunSettings` → `Env`
* `settings` field/property → `env` (RunRequest, context, etc.)

3. Ensure `Env` is used everywhere runtime params are referenced:

* steps that read `context.settings.*` become `context.env.*`
* runtime entrypoints construct `env`

### Stable end state

* Existing recipe/engine pipeline still works.
* All tests/builds pass.

### Why now

* This is the least risky “wide churn” change and reduces confusion before deeper refactors.

---

## Slice 2 — Runtime execution hardened: executor runs plans only

**Risk:** Medium
**Goal:** Enforce invariant #1 early: runtime execution must not default/clean configs.

### Changes

* Remove runtime config defaulting from `PipelineExecutor`:

  * Delete/disable any code that calls `Value.Default/Clean/Convert` during execution.
  * Make `PipelineExecutor` execute **only** `ExecutionPlan` nodes with explicit node configs.

* Ensure all runtime entry flows go through:

  1. compile (whatever it currently is)
  2. produce a plan with explicit configs
  3. executor runs plan

### Bridge needed?

None, as long as you keep engine plan compilation producing configs (even if it still defaults/cleans). That is pre-runtime.

### Stable end state

* Runtime execution no longer canonicalizes anything.
* Tests pass.

### Why now

This removes one of the biggest silent footguns early, before you touch compilation semantics.

---

## Slice 3 — Introduce the recipe compiler pipeline *without* removing engine canonicalization yet

**Risk:** Medium–High
**Goal:** Land the **composition-first recipe compiler** as the true canonicalizer, but keep engine compile canonicalization temporarily as redundant safety until ecology proves out.

### Changes

1. Land authoring layer structures:

* `Stage` now has a single **surface schema** (includes `knobs` field) and a deterministic `toInternal(...)`.
* Stage `public` is optional; if present, `compile` is required.
* “Internal-as-public” stages accept `{ knobs?, <stepId>?: unknown }`.

2. Add recipe-owned compile pipeline:

* `createRecipe.compileConfig(env, config)` calls `compileRecipeConfig(...)`

  * Stage surface normalization → knobs extraction → stage compile (or identity) → raw per-step configs
  * Step canonicalization: prefill op envelopes → strict schema normalization → step.normalize → op.normalize pass → final strict schema normalization
* `createRecipe.run()` uses the compiled configs to instantiate `RecipeV2`, then calls engine plan compiler, then executes plan.

3. **Compiler-only legacy adapters** (minimal bridge)
   To avoid refactoring all steps immediately, the compiler pipeline supports legacy hooks by adapting them **internally**:

* If a step still has `resolveConfig`, the compiler treats it as `normalizeLegacyStep(cfg, { env, knobs })` and runs it pre-runtime.
* If an op still has `resolveConfig`, the compiler treats it as `normalizeLegacyOp(envelope, { env, knobs })`.

**Important:** these adapters are:

* not exported
* not available at runtime
* not called by the engine
* removed later

### Stable end state

* The recipe compiler produces canonical configs.
* Engine still canonicalizes redundantly (temporary), but the system is stable.
* Tests pass.

### Why this slice matters

This is the earliest point where you can refactor ecology safely without committing to removing engine canonicalization yet.

---

## Slice 4 — Cut engine canonicalization: engine becomes validation-only

**Risk:** High (the “real cut line”)
**Goal:** Remove engine-time defaulting/cleaning and `step.resolveConfig` calls. After this slice, **compiler is the only canonicalizer**.

### Changes

* `engine/compileExecutionPlan` becomes:

  * validate-only (unknown key errors + schema validation)
  * no defaulting/cleaning
  * no calling `step.resolveConfig`
* Engine’s plan nodes just carry the config provided by recipe instantiation.

### Preconditions for safety

* Slice 3 compiler pipeline must fully canonicalize all step configs in the recipe.
* Legacy adapters must cover any remaining legacy hooks so no steps rely on engine resolution.

### Stable end state

* Only compiler canonicalizes.
* Engine validates and schedules.
* Executor runs plan configs without defaulting.
* Tests pass.

### Why now (before ecology refactor?)

You can do this either before or after ecology. In practice:

* If Slice 3 + legacy adapters are solid, doing Slice 4 *before* ecology refactor is feasible and accelerates feedback.
* If you’re cautious, refactor ecology first (Slice 5), then cut engine canonicalization. I recommend cutting engine canonicalization **after** ecology passes once, unless you have high confidence in the adapter coverage.

---

## Slice 5 — Ecology domain: canonical best-practice refactor (proving ground)

**Risk:** Medium–High (contained to one domain, but deep)
**Goal:** Implement ecology as the “gold standard” of the new architecture: ops contracts + envelope derivation + stage public compile + step ops injection + no legacy hooks.

### Changes

* Convert ecology ops to:

  * contracts + strategies
  * `normalize` hooks (compile-time only) where needed
  * runtime op surface excludes normalize (`runtimeOp(...)` / bindOps returns runtime surface)
* Convert ecology steps to:

  * step contracts using `OpRef` and `ops` mapping
  * ops injection into runtime `run(ctx, cfg, opsRuntime)`
  * explicit `schema` (or ops-derived schema where allowed) per O3
* Convert ecology stage to:

  * stage surface schema includes `knobs`
  * optional `public` schema and `compile` mapping public→internal
* Remove ecology’s usage of:

  * `resolveConfig` at step/op level
  * runtime schema defaulting in run handlers

### Validation gates (must pass before proceeding)

* Targeted ecology compile tests:

  * given stage config input with knobs, `compileConfig` produces total canonical per-step configs
  * configs contain no knobs field
* Runtime smoke test:

  * run ecology stage end-to-end without any engine-time canonicalization

### Stable end state

* Ecology is canonical.
* Other domains still work via legacy adapters (temporary).
* Tests pass.

---

## Slice 6 — Rollout across remaining domains (parallelizable)

**Risk:** Medium (mostly mechanical once ecology pattern is proven)
**Goal:** Apply ecology pattern across remaining domains, removing legacy hooks step-by-step without introducing new modes.

### Strategy

* Prioritize domains in order of:

  * highest reliance on legacy `resolveConfig` and runtime defaulting first
  * most frequently used steps next
* Use AI agents to:

  * migrate op contracts + strategy normalize
  * migrate step contracts to OpRefs
  * update stage config surfaces to include knobs and optional public compile
  * remove runtime defaulting inside runs

### Stable end state after each sub-domain migration

* Each migrated domain uses new patterns end-to-end.
* Legacy adapters remain for unmigrated domains only.
* Tests pass.

---

## Slice 7 — Cleanup pass: delete bridges and legacy surfaces

**Risk:** Low–Medium (surgical deletions)
**Goal:** Remove the temporary compatibility adapter and any lingering “legacy names” so the architecture is fully locked.

### Changes

* Delete compiler legacy adapters:

  * stop supporting `step.resolveConfig` and `op.resolveConfig`
* Remove legacy exports/types:

  * remove `resolveConfig` from any type surfaces
  * ensure `DomainOpRuntime` cannot expose normalize
* Tighten lint/CI gates:

  * enforce “no typebox/value imports” outside compiler + authoring factories
  * forbid `resolveConfig` identifier usage entirely (optional)

### Stable end state

* No bridges.
* No dual semantics.
* Tests pass.

---

# What must land before refactoring remaining non-op domains?

You can land **Slices 0–4** without refactoring “non-op domains” at all, as long as:

* their steps have schemas (they do today),
* the compiler pipeline can canonicalize their configs without relying on op normalization,
* and any legacy `resolveConfig` usage is covered by the compiler adapters until migrated.

Ecology (Slice 5) is your proving ground for:

* DX of OpRef + bindOps
* stage public compile shape
* knobs threading correctness
* removal of legacy hooks

After ecology, remaining domains become mostly mechanical migration (Slice 6).

---

# Risk distribution summary

* **Low risk:** Slice 0, Slice 1 (mechanical rename), Slice 7 (cleanup if staged carefully)
* **Medium risk:** Slice 2 (executor hardening), Slice 3 (compiler pipeline introduction), Slice 6 (bulk migration)
* **High risk:** Slice 4 (engine canonicalization cut line), Slice 5 (deep ecology refactor, but isolated)

---

# Minimal bridging policy (explicit)

The only acceptable temporary bridge is:

* A compiler-internal adapter that can call existing legacy `resolveConfig` hooks during compilation **only**.

No runtime branching. No engine fallback canonicalization after Slice 4. No parallel recipe “modes.”

And it has a guaranteed deletion point (Slice 7).