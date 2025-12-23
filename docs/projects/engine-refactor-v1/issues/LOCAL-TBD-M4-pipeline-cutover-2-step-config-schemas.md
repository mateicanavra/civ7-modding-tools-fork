---
id: LOCAL-TBD-M4-PIPELINE-2
title: "[M4] Pipeline cutover: per-step config schemas + executor plumbing"
state: planned
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Architecture, Cleanup]
parent: LOCAL-TBD-M4-PIPELINE-CUTOVER
children: []
blocked_by: [LOCAL-TBD-M4-PIPELINE-1]
blocked: [LOCAL-TBD-M4-PIPELINE-4]
related_to: [CIV-46]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make per-step config real: steps own TypeBox config schemas, the compiler validates/normalizes recipe-supplied config into the `ExecutionPlan`, and the executor passes the resolved config into `step.run(ctx, config)`. No step algorithm changes.

## Why This Exists

We already accepted recipe-driven composition and `ExecutionPlan` as the sole compiled “effective run” artifact. Without per-step config plumbing, recipes can’t express real variation and the codebase will keep pulling knobs from legacy `stageConfig`/globals.

## Recommended Target Scope

### In scope

- Extend the step definition contract to include:
  - a TypeBox config schema (step-owned)
- Apply defaults via TypeBox defaults using `Value.Default(stepConfigSchema, userConfig)` so recipe config can be omitted safely.
- Ensure `compileExecutionPlan(...)` validates and normalizes per-occurrence config using the step’s schema.
- Ensure `ExecutionPlan` plan nodes carry the resolved per-occurrence config.
- Update the executor to call `step.run(ctx, config)` with the resolved config (no silent fallbacks to legacy config).
- Keep the repo runnable with the standard recipe (defaults preserve current behavior).

### Out of scope

- Changing step algorithms or tuning behavior.
- Converting recipe authoring from linear → DAG.
- Removing `stageManifest`/`STAGE_ORDER`/`stageConfig` call sites (handled by PIPELINE‑5).

## Acceptance Criteria

- Step definitions expose a config schema in the registry (TypeBox; no new validation deps).
- `compileExecutionPlan` rejects invalid per-step config and unknown keys with clear errors.
- `ExecutionPlan` nodes include resolved per-step config and the executor passes it into step execution.
- The standard recipe can be executed end-to-end with no dependence on `stageConfig` for step-local knobs.
- `pnpm -C packages/mapgen-core check` passes.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Add/extend a focused unit test that proves:
  - recipe config is validated against a step schema
  - a resolved config reaches `step.run(ctx, config)`

## Dependencies / Notes

- **Parent:** [LOCAL-TBD-M4-PIPELINE-CUTOVER](LOCAL-TBD-M4-PIPELINE-CUTOVER.md)
- **Blocked by:** LOCAL-TBD-M4-PIPELINE-1 (boundary + compiler skeleton exists)
- **Blocks:** LOCAL-TBD-M4-PIPELINE-4 (runtime cutover should not land with “config ignored” semantics)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Prefer minimal surface area:
  - add config schema to the step definition type
  - thread resolved config through compiler → plan → executor
- Do not introduce a second config mega-object; per-step config comes from the recipe occurrence only.
- Current gap: `MapGenStep` in `packages/mapgen-core/src/pipeline/types.ts` has no config argument; `PipelineExecutor` runs steps without config.
- Reference the existing config wiring status:
  - `packages/mapgen-core/src/config/schema.ts`
  - `docs/projects/engine-refactor-v1/resources/config-wiring-status.md`

## Prework Prompt (Agent Brief)

Goal: build a per-step config inventory so schema work is mechanical and consistent.

Deliverables:
- A matrix: step ID -> current config inputs (stageConfig/global constants/implicit defaults) -> proposed per-step schema + default values.
- A list of steps with no config usage or unclear config ownership, with notes on open questions.
- A short note on validation rules to enforce (unknown keys fail; defaults via schema or explicit step defaults).

Where to look:
- Status doc: `docs/projects/engine-refactor-v1/resources/config-wiring-status.md`.
- Config schema: `packages/mapgen-core/src/config/schema.ts`.
- Step definitions and config reads: `packages/mapgen-core/src/pipeline/**` (search for `stageConfig`, config lookups, or step-local config usage).

Constraints/notes:
- Keep this as inventory only; do not change code.
- Per-step config must come from the recipe occurrence only (no new mega-config).
- Use TypeBox conventions when sketching schemas.
