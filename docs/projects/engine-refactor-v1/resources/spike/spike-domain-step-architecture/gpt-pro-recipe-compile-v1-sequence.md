# Cutover sequence draft — composition-first recipe compiler (v1)

This is a draft “least double-touch” cutover sequence for implementing the proposal in
`gpt-pro-recipe-compile-v1.md`. It is intentionally short and tactical; adjust once the semantic
cut-lines are locked.

## Goals

- Maximize parallelizable/mechanical work for agents.
- Minimize “touch the same domain twice” churn.
- Keep runtime strictly free of config normalization/defaulting.

## Phase A — DX + hygiene on the current baseline (parallel, low risk)

### Key constraint (prevents “vertical rebuild” spillover)

If you remove runtime defaulting/normalization from strategy `run(...)` bodies, you must ensure **every call path**
into that strategy receives **already-normalized config**.

In the current baseline, normalization is guaranteed only when configs flow through:

- `compileExecutionPlan(...)` calling `step.resolveConfig(...)` in `packages/mapgen-core/src/engine/execution-plan.ts`, and
- step `resolveConfig(...)` forwarding into `op.resolveConfig(...)`, which dispatches to strategy `resolveConfig(...)` in `packages/mapgen-core/src/authoring/op/create.ts`.

Failure mode (spillover): any direct call site that bypasses plan compilation (tests, scripts, ad-hoc runs) may have been
relying on “default inside `run`” patterns and will need a **mechanical** update to normalize config before calling `run` / `runValidated`.
This is expected horizontal churn; it should not require rethinking domain behavior.

1. **Inventory**
   - List all `resolveConfig` definitions (steps, op strategies, op dispatcher).
   - List any runtime calls to `resolveConfig(...)` / schema defaulting inside `run(...)` bodies.

2. **Purge runtime normalization**
   - Remove any “default inside `run`” patterns (e.g. strategies that call a local `resolveConfig` in `run`).
   - Replace with: “config is already normalized by compile-time hook” (even if that hook is still baseline `step.resolveConfig` for now).
   - If a strategy needs derived runtime values, derive from inputs/env, but do not reshape/default config at runtime.

3. **Eliminate step forwarding boilerplate**
   - Where steps are only doing `resolveConfig: (cfg, settings) => ({ opA: opA.resolveConfig(...), ... })`,
     replace with one shared helper (still using baseline hooks/signatures).
   - This is safe to apply selectively (e.g. ecology + placement) without touching domains that don’t use ops yet.

4. **Guardrails**
   - Add a hard rule: no calls to schema defaulting / normalize helpers from runtime `run(...)`.
   - Add a hard rule: step `resolveConfig` must be deterministic and must not read artifacts/resources (compile-time only).
   - Defer repo-wide “no schema-default helper export” enforcement until you’re ready to fix all remaining imports/tests.

Outcome: the baseline stays intact, but config compilation becomes predictable and runtime stays clean.

## Optional pilot — Ecology-first (intentionally scoped)

After Phase A, it’s reasonable to refactor **ecology only** to the “clean runtime” standard (no defaulting in `run`, no forwarding boilerplate),
while leaving other domains untouched. This works because most other domains are not using ops yet, so signature/flow changes won’t force vertical rewrites.

Expected horizontal follow-up (mechanical):

- Update any direct op call sites (tests/scripts) that bypass plan compilation to normalize config pre-run (or route through existing `resolveConfig`).

## Phase B — Lock the semantic cut-lines (sequential, high leverage)

Before mass-migrating remaining domains, lock (in writing) the “don’t change again” decisions:

- Does the engine ever call `step.resolveConfig`? (proposal says **no**)
- Does the op/strategy normalization signature take `settings/env` or `knobs`? (proposal says **knobs**)
- Is the runtime channel renamed to `env`? (proposal says **yes**, mostly mechanical)
- Are facade transforms allowed? if yes, where do they live and what is allowed to read? (proposal: compile-time only)

Outcome: a stable target surface that agents can refactor toward without later rework.

## Phase C — Introduce the new compiler surfaces (moderate risk, centralized)

1. Add the recipe-level compilation entrypoint that produces:
   - normalized `env` (or `settings` alias temporarily)
   - normalized `knobs`
   - compiled per-step internal configs

2. Keep the engine’s `compileExecutionPlan(...)` for graph validation only:
   - validate known step ids
   - validate internal config schema (optional but recommended)
   - **no** config transforms

Outcome: “composition-first compiler” exists and the engine no longer performs config resolution.

## Phase D — Bulk migrate remaining domains/steps (highly parallel)

For each domain/step:

- Move any remaining compile-time normalization into the new compiler path.
- Delete step-level `resolveConfig` entirely (or make it a no-op shim only during migration, if you accept a temporary shim).
- Update strategies to `normalizeConfig(cfg, knobsSlice)` where applicable.

Outcome: one coordinated push lands the new semantics without a second sweep.

## Phase E — Remove shims / tighten exports (cleanup)

- Remove any temporary aliases (e.g. `settings` ⇄ `env`).
- Remove any legacy config hooks still present on engine step types.
- Ensure schema-defaulting helper is compiler-internal (not importable from runtime modules).
