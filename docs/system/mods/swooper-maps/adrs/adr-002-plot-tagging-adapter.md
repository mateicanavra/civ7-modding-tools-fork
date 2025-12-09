# ADR-002: Own Plot Tagging + Civ7 Adapter Layer

**Status:** Accepted
**Date:** 2025-12-05

## Context

After the latest Civ7 drop, `/base-standard/maps/map-utilities.js` no longer exported `addPlotTags`, breaking our orchestrator. The official scripts now tag plots inline (e.g., Voronoi maps) instead of providing the helper.

Relying on fragile upstream utilities risks recurrent breakage as the SDK evolves.

## Decision

1. **Maintain our own stable `addPlotTags` implementation** (`mods/mod-swooper-maps/mod/maps/core/plot_tags.js`) and stop depending on the missing Civ7 helper.

2. **Continue to consume official resources where they are stable**, but prefer an adapter layer for Civ7 utilities/files so updates require changing only one surface.

3. **Fully own high-churn or critical helpers** (plot tagging, deterministic RNG access) while keeping adapters thin for stable SDK surfaces.

## Consequences

### Benefits

- Map orchestrator now uses our `addPlotTags`, removing a runtime failure point when Civ7 moves/removes helpers
- Future Civ7 resource changes are isolated behind a small adapter surface instead of spread across layers
- Improved resilience and diagnosability

### Trade-offs

- Slight maintenance cost to keep our copy in sync with needed behavior

### Next Steps

1. Inventory current Civ7 utility touchpoints
2. Wrap them in a dedicated adapter module
3. Migrate consumers to that adapter
4. Promote fully owning any high-churn or critical helpers while keeping adapters thin for stable SDK surfaces
