# M4 Prework Artifacts (Completed)

This directory contains the concrete prework outputs produced from the embedded **Prework Prompt (Agent Brief)** sections across M4 issues.

Each issue doc also has a `## Prework Results / References` section linking to the relevant artifact(s).

## Artifacts by Track

### Pipeline Cutover

- `LOCAL-TBD-M4-PIPELINE-1`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-1-runrequest-recipe-executionplan.md`
- `LOCAL-TBD-M4-PIPELINE-2`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-2-step-config-matrix.md`
- `LOCAL-TBD-M4-PIPELINE-3`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-3-standard-mod-packaging-plan.md`
- `LOCAL-TBD-M4-PIPELINE-4`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-4-default-recipe-and-runtime-cutover.md`
- `LOCAL-TBD-M4-PIPELINE-5`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-5-legacy-ordering-deletion-checklist.md`
- `LOCAL-TBD-M4-PIPELINE-6`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-pipeline-6-dual-orchestration-inventory.md`

### Tag Registry Cutover

- `LOCAL-TBD-M4-TAG-REGISTRY-CUTOVER`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-tag-registry-catalog-plan.md`

### Effects Verification

- `LOCAL-TBD-M4-EFFECTS-1`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-effects-1-effect-tags-postconditions.md`
- `LOCAL-TBD-M4-EFFECTS-2`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-effects-2-biomes-features-reification.md`
- `LOCAL-TBD-M4-EFFECTS-3`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-effects-3-state-engine-removal-map.md`

### Placement Inputs

- `LOCAL-TBD-M4-PLACEMENT-1`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-placement-1-placementinputs-v1-contract.md`
- `LOCAL-TBD-M4-PLACEMENT-2`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-placement-2-cutover-checklist.md`

### Narrative Cleanup

- `LOCAL-TBD-M4-NARRATIVE-1`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-narrative-1-artifact-inventory.md`
- `LOCAL-TBD-M4-NARRATIVE-2`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-narrative-2-storytags-consumer-and-cache-map.md`

### Safety Net

- `LOCAL-TBD-M4-SAFETY-1`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-safety-1-tracing-model-and-fingerprint.md`
- `LOCAL-TBD-M4-SAFETY-2`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-safety-2-smoke-tests-matrix-and-civ23-rescope.md`

### Engine Boundary Cleanup

- `LOCAL-TBD-M4-ENGINE-BOUNDARY-CLEANUP`: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-engine-boundary-globals-inventory.md`

## Key Decisions / Open Questions (Implementation-Relevant)

### Locked decisions (2025-12-22)

- Cross-cutting directionality policy (`foundation.dynamics.directionality`) is supplied via RunRequest `settings` (ADR-ER1-019).
- `effect:engine.placementApplied` is verified via a minimal TS-owned `artifact:placementOutputs@v1` (ADR-ER1-020).
- `effect:engine.landmassApplied` / `effect:engine.coastlinesApplied` use cheap invariants + call evidence; adapter read-back APIs are deferred (ADR-ER1-021; DEF-017).

### Remaining open questions (non-blocking)

- Narrative hotspot categorization: paradise/volcanic hotspot sets are produced by islands placement; decide artifact shape (single categorized artifact vs split artifacts).
- Plan fingerprint semantics: confirm whether pure observability toggles (trace verbosity) are excluded from the semantic fingerprint.
- CIV‑23 rescope: the current doc is under `docs/projects/engine-refactor-v1/issues/_archive/CIV-23-integration-tests.md` and still references legacy `stageConfig`/WorldModel framing.
- Demo payload safety for starts in placement demos (see `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-PLACEMENT-INPUTS.md`).
- `ctx.overlays` compat view: keep derived debug view vs remove entirely (see `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-NARRATIVE-CLEANUP.md`).
