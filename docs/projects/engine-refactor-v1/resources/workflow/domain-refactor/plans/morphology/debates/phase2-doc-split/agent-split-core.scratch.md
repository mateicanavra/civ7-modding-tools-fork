# Scratchpad — Agent Split 1 (Core model & pipeline)

Current state (keep this to one message; overwrite as needed):

I moved the Phase 2 “spine” into `spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`: invariants/glossary, domain ownership + no-backfeeding, stage lifecycle + freeze points (F1–F5), braid rules, and the Morphology causality spine (ordering constraints; includes polar edge regime requirement).

Dependencies / non-overlap:
- Contracts (Agent Split 2): I will reference (not define) the concrete artifact schemas/field lists and any contract ids; I’ll leave TODO-style “integration hooks” describing what Contracts must lock (ids, types, units, determinism/tie-breakers).
- Map projections + stamping (Agent Split 3): I will reference (not define) `artifact:map.*` semantics and `effect:map.*Plotted` guarantees; I’ll leave integration hooks for how the braid stages/plot-* steps must align with freeze points (truth → map intent freeze → adapter stamp → effect).

Blockers / alignment notes (Phase 3 migration, not Phase 2 doc work):
- Current standard recipe still braids `narrative-pre/mid` between Morphology stages: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`. Phase 2 core spec locks the target topology/ownership (Gameplay absorbs Narrative) and treats current wiring as non-canonical.
- Current Morphology topography artifact includes an engine-coupled `terrain` array (engine terrain ids) in `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`; Phase 2 invariants require Physics truth artifacts be engine-agnostic (engine/projection lives under `artifact:map.*`).
- Current effect tags are `effect:engine.*` / `ENGINE_EFFECT_TAGS` in `mods/mod-swooper-maps/src/recipes/standard/tags.ts`; Phase 2 naming for stamping guarantees is `effect:map.*Plotted` (Agent Split 3 owns the stamping/projection spec, but this impacts tag registry alignment).
- New alignment (user): `artifact:foundation.plates` is Phase 2-canonical as a Foundation-owned, derived-only tile-space view consumed by tile-based physics (especially Morphology). Avoid duplicated projection implementations; keep one artifact + one derivation baseline. Evidence: `packages/mapgen-core/src/core/types.ts` (`FOUNDATION_PLATES_ARTIFACT_TAG`).
