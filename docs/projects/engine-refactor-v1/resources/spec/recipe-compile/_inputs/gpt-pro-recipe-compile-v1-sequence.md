# Cutover sequence draft — composition-first recipe compiler (v1)

This is a draft “least double-touch” execution strategy for landing a composition-first recipe compiler in slices,
with an explicit goal of minimizing churn before a parallel all-domain refactor push.

Working target proposal reference (canonical):

- `proposal-recipe-compile-architecture.md`

This sequence doc is intentionally a draft. It should be updated as the proposal is reviewed, grounded, and
translated into an implementation plan/stack.

## Goals

- Maximize parallelizable/mechanical work for agents.
- Minimize “touch the same domain twice” churn.
- Keep runtime strictly free of config normalization/defaulting.

## Current assessment of the canonical proposal (what is resolved vs what is still pending)

### What is now resolved (clear semantic wins)

- Collapses “public vs internal vs step schema” ambiguity: stage optionally provides a public view + `compile` (shape-changing), steps are internal-only (schema + optional `normalize`), ops normalize in the compiler pipeline.
- Collapses variant ambiguity into a **single mode**:
  - per-stage optional public view (stage-level “public → internal”), otherwise internal-as-public
  - no recipe-wide variant flags and no runtime mode detection/branching
- Locks the knobs model (single author-facing surface: `stageConfig.knobs`, compiler threads via ctx `{ env, knobs }`; step configs do not embed knobs).
- Locks op envelope discovery to top-level `step.contract.ops` keys only (no nested scanning / path-aware envelopes).
- Locks “no runtime schema defaulting/cleaning/resolution” (compiler-only normalization; runtime is canonical-only).

### What is still “implementation-risky” (even if architecturally decided)

- **TypeScript feasibility / inference**: validate the proposed generics preserve literal keys (stage ids, step ids, op keys) without forcing heavy annotations or collapsing to `any`.
- **Compiler/engine cut-line**: pick the exact integration point(s) so the engine never owns config normalization again (and we don’t accidentally keep two normalization paths alive).
- **Enforcement timing**: lint boundaries are specified; decide whether to land them early (to prevent drift) or after the ecology pilot.

## Stage shapes (replaces “A/B/C as modes”)

This is the stance to use for slicing. These are **per-stage** shapes, not recipe-wide “modes”.

- **Internal-as-public (default):** stage has no explicit public view; author supplies a step-id keyed map (plus optional `knobs` field).
- **Stage-public (optional):** stage defines a public view + `compile` (shape-changing) to produce the internal step-id keyed map (plus knobs extracted from the stage config surface).
- **Recipe-level global facade (deferred):** explicitly out of scope for the cutover; treat as later ergonomics if needed.

## Prerequisites to treat the proposal as implementation-ready (minimal lock list)

Before doing high-parallel “migrate everything” work, lock these items in writing:

1. **Type surfaces are TS-verified**
   - The review must confirm that `RecipeConfigInputOf<T>` and `CompiledRecipeConfigOf<T>` are coherent end-to-end, and that key preservation + inference remains strong for authoring.

2. **Compiler/engine cut-line is explicit**
   - Confirm where compilation happens (new compiler module) and where engine plan compilation stops doing any config defaulting/cleaning/resolution.
   - Confirm all non-engine entrypoints (tests/scripts/ad-hoc) go through compilation (or an explicit “compile-only” helper) before runtime execution.

3. **Naming + hook semantics lock**
   - Confirm `settings → env` rename scope and where the runtime `Env` schema/type lives (so domains don’t import engine internals).
   - Confirm `resolveConfig` is removed (or renamed and constrained to compiler-only `normalize` semantics).

4. **Reserved key `"knobs"` enforcement**
   - Confirm it is enforced in one place (factory or stage creation) and covered by lint/checks.

## Why slicing (vs “all at once”)

The key risk is double-touching domain code while semantics are still moving. Slicing reduces churn by:

- Locking compiler cut-lines and invariants before parallel migrations.
- Allowing an ecology-first pilot to validate the DX and normalization guarantees without forcing vertical rewrites of other domains.
- Keeping bulk work largely mechanical once the new compile pipeline is authoritative.

The “all at once” approach increases risk because domain steps/ops would be rewritten while the compiler boundary, invariants, and enforcement rules are still being refined.

## Main risk boundary (prevents “vertical rebuild” spillover): canonicalization guarantee

If you remove runtime defaulting/normalization from strategy `run(...)` bodies, you must ensure **every call path**
into that strategy receives **already-canonical config** produced by the recipe compiler pipeline.

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

## Phase 1 — Core semantics: stage optional public view + recipe-owned compilation pipeline (medium/high, centralized)

Goal: establish the new canonicalization boundary without yet migrating every domain.

- Add stage-level optional public view + `compile` (shape-changing) with a computed stage surface schema that always includes `knobs`.
- Add recipe-level compilation entrypoint producing internal per-step configs via the canonical chain:
  - stage surface schema normalize → optional stage compile (public→internal)
  - step schema normalize → step `normalize` (value-only)
  - contract-driven op envelope prefill + mechanical op normalization (top-level keys only)
- Keep internal-as-public stages running while stage-public is added where desired (no recipe-wide modes).

Risk notes:

- This is the primary semantic change: where canonicalization happens.
- This is not highly parallelizable until the invariants and public surfaces are locked.

## Phase 2 — Ecology-first pilot (stage-public where useful) + DX validation (scoped, but real end-to-end)

Goal: validate that Phase 1 semantics are “enough” and that invariants hold before mass migration.

- Migrate ecology stage to stage-public where it improves authoring (public view + compile), while leaving other stages internal-as-public.
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
  - adopt stage-public `public/compile` where desired (per-stage)
  - remove any remaining runtime defaulting patterns
- Remove any remaining bridge affordances once everything is migrated (or keep internal-as-public explicitly for tests/internal programmatic recipes if desired).
