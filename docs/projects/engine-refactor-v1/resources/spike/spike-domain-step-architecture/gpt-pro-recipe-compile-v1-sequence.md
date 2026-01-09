# Cutover sequence draft — composition-first recipe compiler (v1)

This is a draft “least double-touch” execution strategy for landing a composition-first recipe compiler
in slices, with an explicit goal of minimizing churn before a parallel all-domain refactor push.

Working target proposal reference (currently under review/lock-in):

- `gpt-pro-recipe-compile-v3.md`

This document is intentionally a draft and should be updated once the canonical architecture is fully locked.

## Goals

- Maximize parallelizable/mechanical work for agents.
- Minimize “touch the same domain twice” churn.
- Keep runtime strictly free of config normalization/defaulting.

## Current assessment of v3 (what it resolves vs what is still pending)

### What v3 resolves (clear semantic wins)

- Collapses the “public schema vs step schema vs internal schema” ambiguity by moving **public schema + compilation to Stage**; Steps become internal-only (`schema` + optional `normalize`), and Ops normalize at compile-time.
- Clarifies why step `schema` is required while `ops` remains optional (not all steps are op-driven; schema is the runtime contract boundary).
- Adopts ops injection into step `run` implementations (so steps don’t import ops implementations directly).
- Adopts inline schema strictness defaults (`additionalProperties:false`) via definition factories (no free-floating shortcut type).
- Provides an explicit, inspectable compilation chain (stage compile → step normalize → op normalize mechanical pass).

### What is still ambiguous / “almost but not quite locked”

- Variant surface area is still >1 (Variant A/B/C). This is fine for migration, but needs an explicit “canonical vs bridge vs deferred” stance to avoid mode creep.
- The op-normalization “mechanical pass” requires a declared invariant:
  - How does it locate op envelopes in step configs (top-level keys only vs path-aware; how are paths declared; are arrays supported)?
- “Ops-derived step schema/defaults” is described as a shortcut, but needs a clear decision on whether it is required for Phase 1–2 or deferred DX sugar.
- Mixed-mode incremental adoption needs to be stated explicitly:
  - Can a recipe contain some stages authored with Variant A while others remain internal-only?
  - If yes, what is the runtime-facing surface of `recipe.run(...)` during the bridge period?
- “No runtime schema defaults” needs an enforcement story (not just guidance):
  - e.g. schema-defaulting utilities become compiler-internal / not exported from runtime-facing entrypoints.

## Variant stance (A/B/C) — working position

This is the stance to use for slicing unless/until the canonical architecture document says otherwise.

- **Variant A (long-term canonical):** Stage owns public schema + knobs + compile; recipe composes stage publics; recipe compilation produces internal step configs; engine validates/executes only.
- **Variant B (bridge / migration-only):** No stage public schema; author supplies internal config tree directly. This is useful for tests/internal recipes and as a temporary bridge while migrating stages, but should not become the “default UX”.
- **Variant C (deferred unless explicitly needed):** Recipe-level global public facade that routes into stages. Treat as a later-phase ergonomics layer; do not require it for the compiler cutover.

## Prerequisites to treat v3 as implementation-ready (minimal lock list)

Before doing high-parallel “migrate everything” work, lock these items in writing:

1. **Op normalization pass invariant**
   - Declare whether op envelopes are discovered only at top-level keys matching `contract.ops` names, or via explicit paths.
   - If paths are supported, declare their syntax and the supported container shapes (records only vs arrays/tuples).

2. **Ops-derived step schema/defaults**
   - Decide whether it is required for the first end-to-end pilot (recommended: not required; treat as optional DX sugar).

3. **Mixed-mode adoption story**
   - State whether a recipe can mix Variant A and Variant B stages during the bridge period.
   - If yes, specify how `recipe.run(env, publicConfig, knobs)` behaves for “internal-only” stages (e.g. they have empty public schemas or are not addressable via public config yet).

4. **Enforcement: no runtime schema defaults**
   - Decide how to prevent ad-hoc runtime defaulting (ideally: compiler-internal helper; no export from runtime-facing surfaces).

5. **Naming + hook semantics lock**
   - Confirm `settings → env` rename scope and where `Env` lives.
   - Confirm `resolveConfig → normalize` semantics: value-only, no config shape changes (shape change only allowed in Stage compile public→internal).

## Why slicing (vs “all at once”)

The key risk is double-touching domain code while semantics are still moving. Slicing reduces churn by:

- Locking compiler cut-lines and invariants before parallel migrations.
- Allowing an ecology-first pilot to validate the DX and normalization guarantees without forcing vertical rewrites of other domains.
- Keeping bulk work largely mechanical once the new compile pipeline is authoritative.

The “all at once” approach increases risk because domain steps/ops would be rewritten while the compiler boundary, invariants, and enforcement rules are still being refined.

## Main risk boundary (prevents “vertical rebuild” spillover): normalization guarantee

If you remove runtime defaulting/normalization from strategy `run(...)` bodies, you must ensure **every call path**
into that strategy receives **already-normalized config**.

In the current baseline, normalization is guaranteed only when configs flow through:

- `compileExecutionPlan(...)` calling `step.resolveConfig(...)` in `packages/mapgen-core/src/engine/execution-plan.ts`, and
- step `resolveConfig(...)` forwarding into `op.resolveConfig(...)`, which dispatches to strategy `resolveConfig(...)` in `packages/mapgen-core/src/authoring/op/create.ts`.

Failure mode (spillover): any direct call site that bypasses plan compilation (tests, scripts, ad-hoc runs) may have been
relying on “default inside `run`” patterns and will need a **mechanical** update to normalize config before calling `run` / `runValidated`.
This is expected horizontal churn; it should not require rethinking domain behavior.

## Phase 0 — Mechanical: `settings` → `env` + move `Env` type (low risk, parallelizable)

- Rename runtime `settings` to `env` across request/plan/context surfaces.
- Move the `Env` type/schema so authoring + domain code can refer to it without importing engine internals.

Risk notes:

- This is largely mechanical and compiler-guided.
- It should not force vertical domain rewrites (just signature/callsite updates).

## Phase 1 — Core semantics: stage `public/knobs/compile` + recipe-owned compilation pipeline (medium/high, centralized)

Goal: establish the new canonicalization boundary without yet migrating every domain.

- Add stage-level `public` schema + optional `knobs` schema + `compile` hook (Variant A surface area).
- Add recipe-level compilation entrypoint producing internal per-step configs via the canonical chain:
  - stage public normalize → stage compile (public→internal)
  - step schema normalize → step `normalize` (value-only)
  - op normalization mechanical pass (based on declared invariant)
- Keep Variant B as a bridge so internal-only stages/recipes can continue to run while the migration proceeds.

Risk notes:

- This is the primary semantic change: where canonicalization happens.
- This is not highly parallelizable until the invariants and public surfaces are locked.

## Phase 2 — Ecology-first pilot (Variant A) + DX validation (scoped, but real end-to-end)

Goal: validate that Phase 1 semantics are “enough” and that invariants hold before mass migration.

- Migrate ecology stage to Variant A (author-facing stage public + compile) while leaving other stages as-is (Variant B bridge).
- Eliminate runtime normalization/defaulting:
  - no strategy `run(...)` applying schema defaults or calling resolve/normalize helpers
  - no step `run(...)` calling op resolve/normalize helpers
- Remove step-level forwarding boilerplate in ecology by relying on the op normalization pass and/or one shared helper (until full cutover).

Expected horizontal follow-up (mechanical, acceptable):

- Update any direct op call sites (tests/scripts) that bypass recipe compilation to ensure config normalization occurs before `runValidated`.

## Phase 3 — Cutover: remove engine-owned resolution once compilation is authoritative (high leverage)

Goal: make “no runtime resolution” real by deleting the old resolution path.

- Remove `step.resolveConfig(...)` invocation during engine plan compilation.
- Remove/disable engine-side schema defaulting/cleaning if recipe compilation already guarantees canonical internal configs (engine may still validate).
- Tighten enforcement: schema-defaulting utilities become compiler-internal / non-exported from runtime-facing surfaces.

Risk notes:

- This is where bypass call sites become very obvious; fix is usually mechanical (route through compiler or normalize before calling).

## Phase 4 — Parallel mass migration (post-lock, mostly mechanical)

Once Phase 1–3 semantics are stable and the ecology pilot is validated:

- Migrate remaining stages/steps/ops in parallel:
  - `resolveConfig → normalize` (value-only) or delete (when redundant)
  - adopt Variant A stage `public/compile` where desired
  - remove any remaining runtime defaulting patterns
- Remove bridge affordances (Variant B defaults) once everything is migrated (or keep Variant B explicitly only for tests/internal programmatic recipes if desired).
