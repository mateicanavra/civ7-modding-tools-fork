# Scratchpad — Agent Split 2 (Contracts)

Current state (keep this to one message; overwrite this section each update):

- Contract content has started landing in `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md` (upstream Foundation inputs + downstream Morphology truth outputs + determinism/tie-breakers).
- Canonical upstream inputs (mesh-first, locked): `artifact:foundation.mesh|crust|plateGraph|tectonics`.
- Stronger lock applied: Foundation *does* publish tile-projected plate tensors as `artifact:foundation.plates` in the Phase 2 target, but it is explicitly a derived-only view of mesh-first truth (not a second “truth surface”). Lock schema/semantics and ensure consumers reuse this artifact rather than re-deriving tile views ad hoc.
- Canonical Morphology truth outputs (locked): `artifact:morphology.topography|substrate|coastlineMetrics|landmasses|volcanoes`; explicitly disallowed as cross-domain contracts: `artifact:morphology.routing`, `artifact:morphology.coastlinesExpanded`.
- Locked contract semantics already added:
  - Topology: wrapX=true, wrapY=false; tile indexing `i=y*width+x`; mesh indexing `cellIndex`.
  - Determinism: landmass ID ordering + seam-aware bbox encoding; volcano vent ordering/tie-breaks.
  - Truth boundary: Morphology must not consume `artifact:map.*`, `effect:map.*`, or overlays; called out current legacy violation in `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts`.
- Known blockers/coordination asks:
  - Agent Split 3: confirm the final canonical `effect:map.<thing>Plotted` set so I can reference the names (as “Gameplay-owned effects”) without inventing variants.
  - Agent Split 1: confirm freeze-point naming/terminology (`F1`/`F2` etc.) so contracts consistently reference the same identifiers.
  - “Move, don’t duplicate” constraint: I can’t delete contract content from `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md` per hard boundary; treating the spec split files as canonical, with monolith cleanup deferred to orchestrator.
