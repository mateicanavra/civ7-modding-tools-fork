# Architecture Decision Records — Swooper Maps

> Significant architectural decisions for the Swooper Maps mod. Follow the global ADR pattern in `docs/system/ADR.md`.

## ADR-001: Era-Tagged Morphology View
**Status:** Accepted
**Date:** 2025-12-05
**Context:** A proposal suggested iterating Foundations → Voronoi plate solve → morphology multiple times to stack per-iteration “era” tags for narrative use. The refactor blueprint mandates a single immutable `FoundationContext` per run with WorldModel tightly coupled to the engine; repeated solves would force teardown of engine-bound state and risk desync with the staged buffers.
**Decision:** Keep the single-pass physics pipeline. Do not rerun foundations/morphology in multiple loops. Derive era-like signals analytically from the existing physics snapshot and publish them as immutable overlays (e.g., `eraMorphology`) alongside margins.
**Consequences:**
- Preserves single source of truth and determinism (`FoundationContext` + WorldModel) without extra plate solves.
- Narrative layers read sparse overlay records derived from physics tensors (`shieldStability`, `riftPotential`, `upliftPotential`, `boundaryCloseness`, `boundaryType`) instead of mutating the heightfield again.
- Performance remains bounded; morphology/physics run once. Implementation lives in overlays/tagging, leaving heightfield edits inside morphology stages only.
- Next steps: add an era overlay entry in `StoryOverlays`, emit records during morphology using staged buffers/tensors, expose accessors for narrative/placement consumers, and cover with diagnostics (ASCII/histograms) for validation.

## ADR-002: Own Plot Tagging + Plan Adapter for Civ7 Map Utilities
**Status:** Accepted
**Date:** 2025-12-05
**Context:** After the latest Civ7 drop, `/base-standard/maps/map-utilities.js` no longer exported `addPlotTags`, breaking our orchestrator. The official scripts now tag plots inline (e.g., Voronoi maps) instead of providing the helper. Relying on fragile upstream utilities risks recurrent breakage as the SDK evolves.
**Decision:** Maintain our own stable `addPlotTags` implementation (`mods/mod-swooper-maps/mod/maps/core/plot_tags.js`) and stop depending on the missing Civ7 helper. Continue to consume official resources where they are stable, but prefer an adapter layer for Civ7 utilities/files so updates require changing only one surface. Some utilities (e.g., plot tagging) we will fully own going forward.
**Consequences:**
- Map orchestrator now uses our `addPlotTags`, removing a runtime failure point when Civ7 moves/removes helpers.
- Future Civ7 resource changes are isolated behind a small adapter surface instead of spread across layers.
- Slight maintenance cost to keep our copy in sync with needed behavior, but improved resilience and diagnosability.
- Next steps: inventory current Civ7 utility touchpoints, wrap them in a dedicated adapter module, and migrate consumers to that adapter. Promote fully owning any high-churn or critical helpers (plot tagging, deterministic RNG access) while keeping adapters thin for stable SDK surfaces.
