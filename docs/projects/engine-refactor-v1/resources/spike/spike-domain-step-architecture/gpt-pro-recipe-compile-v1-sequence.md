# Cutover sequence draft — composition-first recipe compiler (v1)

This is a draft “least double-touch” cutover sequence for implementing the proposal in
`gpt-pro-recipe-compile-v1.md`. It is intentionally short and tactical; adjust once the semantic
cut-lines are locked.

## Goals

- Maximize parallelizable/mechanical work for agents.
- Minimize “touch the same domain twice” churn.
- Keep runtime strictly free of config normalization/defaulting.

## Phase A — DX + hygiene on the current baseline (parallel, low risk)

1. **Inventory**
   - List all `resolveConfig` definitions (steps, op strategies, op dispatcher).
   - List any runtime calls to `resolveConfig(...)` / schema defaulting inside `run(...)` bodies.

2. **Purge runtime normalization**
   - Remove any “default inside `run`” patterns (e.g. strategies that call a local `resolveConfig` in `run`).
   - Replace with: “config is already normalized by compile-time hook” (even if that hook is still baseline `step.resolveConfig` for now).

3. **Eliminate step forwarding boilerplate**
   - Where steps are only doing `resolveConfig: (cfg, settings) => ({ opA: opA.resolveConfig(...), ... })`,
     replace with one shared helper (still using baseline hooks/signatures).

4. **Guardrails**
   - Add a hard rule: no calls to schema defaulting / normalize helpers from runtime `run(...)`.
   - Add a hard rule: step `resolveConfig` must be deterministic and must not read artifacts/resources (compile-time only).

Outcome: the baseline stays intact, but config compilation becomes predictable and runtime stays clean.

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

