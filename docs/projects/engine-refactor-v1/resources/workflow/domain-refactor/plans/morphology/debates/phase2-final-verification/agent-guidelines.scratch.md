# Agent scratch — Modeling guidelines updates (SPEC)

## Final summary (done)
- Updated `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md` with a locked posture section defining Physics truth artifacts vs Gameplay `artifact:map.*` projection artifacts, plus `effect:map.*Plotted` as step-emitted stamping guarantees.
- Added explicit modeling invariants for topology: `wrapX=true`, `wrapY=false`, with guidance that wrap flags are not contract parameters and must not be knobbed.
- Reinforced “steps are effect boundaries” and “no shims / no dual paths / no logic outside steps” as anti-patterns and composition guidance.

## Scope
- Update `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md` to reflect the locked Phase 2 modeling posture:
  - `artifact:map.*` projection ownership
  - `effect:map.*Plotted` execution guarantees
  - Physics truth-only vs Gameplay projection/stamping boundaries
  - Wrap topology lock: wrapX=true, wrapY=false (no knobs)

## Notes
- Orchestrator check: some existing docs/spec inputs still model wrap flags as environment fields (e.g. `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/ts/env.ts`); locked posture says wrap is not configurable. If we want enforcement, this likely needs a follow-up change outside this guidelines edit.
- Orchestrator check: locked posture says “Physics artifacts must not embed projection indices”; confirm whether any existing “derived tile view” Physics artifacts are intentional exceptions (and if so, where that exception should live canonically).
