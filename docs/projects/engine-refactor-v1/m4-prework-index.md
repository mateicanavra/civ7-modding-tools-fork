# M4 Prework Index

This index links all embedded "Prework Prompt (Agent Brief)" sections for M4 parents and child issues. Use it to pick prework tasks, decide ordering, and assign agents.

## Pipeline Cutover

| Issue | File | Prework | Complexity / Parallelism |
| --- | --- | --- | --- |
| M4-PIPELINE-CUTOVER — [M4] Pipeline cutover: RunRequest + Recipe -> ExecutionPlan (remove stageManifest/STAGE_ORDER inputs) | `docs/projects/engine-refactor-v1/issues/M4-PIPELINE-CUTOVER.md` | Readiness checklist that points to child prework artifacts and flags gaps. | Low complexity; coordination only. |
| LOCAL-TBD-M4-PIPELINE-1 — [M4] Pipeline cutover (1/3): introduce RunRequest + RecipeV1 + ExecutionPlan compiler | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-pipeline-cutover-1-runrequest.md` | Schema sketches for RunRequest/RecipeV1/ExecutionPlan plus compile rules and parity map from STAGE_ORDER/resolveStageManifest. | High complexity; low parallelism (contract design). |
| LOCAL-TBD-M4-PIPELINE-4 — [M4] Pipeline cutover (2/4): per-step config schemas + executor plumbing | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-pipeline-cutover-4-step-config-schemas.md` | Per-step config inventory matrix with proposed schemas/defaults and a list of unclear ownership cases. | Medium complexity; high parallelism (inventory). |
| LOCAL-TBD-M4-PIPELINE-2 — [M4] Pipeline cutover (2/3): standard mod recipe + TaskGraph consumes ExecutionPlan | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-pipeline-cutover-2-default-recipe.md` | Default RecipeV1 list mapped to current STAGE_ORDER behavior, including any special-case ordering or enablement. | Medium complexity; medium parallelism. |
| LOCAL-TBD-M4-PIPELINE-3 — [M4] Pipeline cutover (3/3): remove stageManifest/STAGE_ORDER + legacy enablement | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-pipeline-cutover-3-remove-legacy-ordering.md` | Exhaustive deletion checklist for stageManifest/STAGE_ORDER/stageConfig/stageFlags/shouldRun/presets with replacements noted. | Low complexity; high parallelism (mechanical inventory). |

## Effects Verification

| Issue | File | Prework | Complexity / Parallelism |
| --- | --- | --- | --- |
| M4-EFFECTS-VERIFICATION — [M4] Effects verification: replace state:engine.* with verified effect:* + reification | `docs/projects/engine-refactor-v1/issues/M4-EFFECTS-VERIFICATION.md` | Readiness checklist that points to child prework artifacts and flags gaps. | Low complexity; coordination only. |
| LOCAL-TBD-M4-EFFECTS-1 — [M4] Effects verification (1/3): define effect:* tags + adapter postcondition surfaces | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-effects-verification-1-effect-tags.md` | Effect tag catalog for biomes/features/placement plus minimal adapter postcondition API sketch. | Medium-high complexity; low parallelism (contract design). |
| LOCAL-TBD-M4-EFFECTS-2 — [M4] Effects verification (2/3): biomes + features reify fields and verify effects | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-effects-verification-2-biomes-features.md` | Reification plan for biomes/features outputs and downstream consumer map with minimal postcondition checklist. | Medium complexity; medium parallelism. |
| LOCAL-TBD-M4-EFFECTS-3 — [M4] Effects verification (3/3): remove state:engine surface + close DEF-008 | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-effects-verification-3-remove-state-engine.md` | Inventory of all state:engine.* uses with replacements and a cleanup checklist for registry/standard pipeline/tests. | Low complexity; high parallelism (mechanical inventory). |

## Placement Inputs

| Issue | File | Prework | Complexity / Parallelism |
| --- | --- | --- | --- |
| M4-PLACEMENT-INPUTS — [M4] Placement inputs: publish artifact:placementInputs@v1 and cut placement to consume it | `docs/projects/engine-refactor-v1/issues/M4-PLACEMENT-INPUTS.md` | Readiness checklist that points to child prework artifacts and flags gaps. | Low complexity; coordination only. |
| LOCAL-TBD-M4-PLACEMENT-1 — [M4] Placement inputs (1/2): define artifact:placementInputs@v1 + derive step | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-placement-inputs-1-define-artifact.md` | PlacementInputs@v1 schema sketch, input source mapping, and required reification list. | Medium-high complexity; low parallelism (contract design). |
| LOCAL-TBD-M4-PLACEMENT-2 — [M4] Placement inputs (2/2): cut placement over to artifact + verified effect | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-placement-inputs-2-cutover.md` | Cutover checklist mapping old input assembly to artifact fields plus effect verification hook plan. | Low-medium complexity; high parallelism. |

## Narrative Cleanup

| Issue | File | Prework | Complexity / Parallelism |
| --- | --- | --- | --- |
| M4-NARRATIVE-CLEANUP — [M4] Narrative/playability cleanup: canonical artifact:narrative.*; remove StoryTags and caches | `docs/projects/engine-refactor-v1/issues/M4-NARRATIVE-CLEANUP.md` | Readiness checklist that points to child prework artifacts and flags gaps. | Low complexity; coordination only. |
| LOCAL-TBD-M4-NARRATIVE-1 — [M4] Narrative cleanup (1/2): canonical artifact:narrative.* producers | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-narrative-cleanup-1-artifacts.md` | Narrative artifact inventory with schema sketches and producer/consumer mapping. | Medium-high complexity; low parallelism (contract design). |
| LOCAL-TBD-M4-NARRATIVE-2 — [M4] Narrative cleanup (2/2): remove StoryTags + caches and update consumers | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-narrative-cleanup-2-remove-storytags.md` | StoryTags consumer map plus narrative cache inventory and replacement mapping. | Low complexity; high parallelism (mechanical inventory). |

## Safety Net

| Issue | File | Prework | Complexity / Parallelism |
| --- | --- | --- | --- |
| M4-SAFETY-NET — [M4] Safety net: observability baseline + CI smoke tests | `docs/projects/engine-refactor-v1/issues/M4-SAFETY-NET.md` | Readiness checklist that points to child prework artifacts and flags gaps. | Low complexity; coordination only. |
| LOCAL-TBD-M4-SAFETY-1 — [M4] Safety net (1/2): step-level tracing foundation | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-safety-net-1-observability.md` | Trace event model, plan fingerprint algorithm, and hook-point list. | Medium-high complexity; low parallelism (contract design). |
| LOCAL-TBD-M4-SAFETY-2 — [M4] Safety net (2/2): CI smoke tests + CIV-23 re-scope | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-safety-net-2-smoke-tests.md` | Smoke-test matrix, stub adapter capability list, and CIV-23 rescope note. | Low-medium complexity; high parallelism. |
