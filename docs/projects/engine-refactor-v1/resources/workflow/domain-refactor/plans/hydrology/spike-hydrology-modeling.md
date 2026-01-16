# Hydrology Domain Refactor — Phase 2 Modeling Spike

This file is a **plan-local pointer** to the canonical Phase 2 spike output.

References:
- Plan index: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/HYDROLOGY.md`
- Workflow: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

Canonical Phase 2 artifact:
- `docs/projects/engine-refactor-v1/resources/spike/spike-hydrology-modeling.md`

---

## Checklist (Phase 2 completion gate)

- Model-first only; no slice planning content.
- Canonical model + causality spine is locked and coherent with `docs/system/libs/mapgen/architecture.md`.
- Target contract matrix (buffers/artifacts/overlays) is explicit.
- Config semantics table exists (semantic knobs; missing/empty/null; determinism; tests-to-add).
- Legacy disposition ledger is complete (keep/kill/migrate for all relevant surfaces).
- Upstream intake selection and downstream impact scan are explicit.
- `docs/system/libs/mapgen/hydrology.md` is updated to match the model.
