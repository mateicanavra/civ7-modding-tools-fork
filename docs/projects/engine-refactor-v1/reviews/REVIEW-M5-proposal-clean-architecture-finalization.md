
## REVIEW m5-u01-def-011-delete-crust-mode

### Quick Take
The legacy crust-mode fork is fully removed and configs no longer accept `crustMode`, but the change leaves legacy-only tuning knobs in the schema that now do nothing and drops coverage for stage-failure reporting.

### High-Leverage Issues
- `packages/mapgen-core/test/orchestrator/task-graph.smoke.test.ts`: the failure-mode coverage was replaced with a success assertion, so we no longer verify structured stage failure reporting.
- `packages/mapgen-core/src/config/schema.ts` + `packages/mapgen-core/src/domain/morphology/landmass/crust-first-landmask.ts` + `packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/*`: legacy-only knobs (e.g., continentalFraction/crustClusteringBias/microcontinentChance, bandPairs/baseSeparation/edge policies) remain in schema but are now ignored with area mode forced.

### Fix Now (Recommended)
- Restore a dedicated test that asserts stage failures surface as structured `stageResults` entries (keep the small-map success test if desired).
- Decide whether to remove or hard-fail legacy-only landmass/ocean separation knobs now that the legacy path is deleted; otherwise document the no-op behavior.

### Defer / Follow-up
- If removal is too breaking, create a follow-up issue to deprecate and remove the now-no-op landmass/ocean separation knobs (schema + docs + release notes).

### Needs Discussion
- Should any of the legacy landmass/ocean separation knobs be reinterpreted as area-mode tunables, or should they be removed entirely?

### Cross-cutting Risks
- Schema still accepts no-op legacy knobs, which conflicts with the "no dead code" M5 goal and may confuse downstream configs.
