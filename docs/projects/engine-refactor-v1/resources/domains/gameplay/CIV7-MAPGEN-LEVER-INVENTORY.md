# Civ7 Map Generation — Gameplay Lever Inventory (Draft)

## Goal

Capture **evidence-backed** mapgen-time gameplay levers from Civ7 official scripts/data, so Gameplay scope is grounded in what is actually possible.

## Notes on Searching

Official resources often live under a path that is ignored by default tooling.
Prefer:
- `rg --no-ignore` when scanning `.civ7/outputs/resources/**`

## Known Levers (Seed)

The canonical seed list and evidence paths live in:
- `docs/system/libs/mapgen/research/SPIKE-gameplay-mapgen-touchpoints.md`

This document will be expanded with additional “hidden” levers discovered in utility scripts.

## Additional Levers Found in Utility Scripts (Evidence)

### Mapgen-time resource replacement that mutates city districts

Evidence:
- `.civ7/outputs/resources/Base/modules/base-standard/maps/map-utilities.js`
  - `removeRuralDistrict(iX, iY)` uses `MapCities.getDistrict(...)` + `Cities.get(...)` and calls `city.Districts?.removeDistrict(...)`.
  - `placeRuralDistrict(iX, iY)` calls `city.Growth?.claimPlot(...)`.
  - `replaceIslandResources(...)` calls `removeRuralDistrict(...)` before `ResourceBuilder.setResourceType(...)`, then `placeRuralDistrict(...)` after.

Design implication:
- “Gameplay mapgen” can plausibly include **city/district mutation hooks** (at least for rural districts) as part of late-stage board/content adjustment workflows.
- This is not currently a first-class SDK/adapter surface in the mod pipeline; it is evidence of a reachable engine capability.

### Plot effects as mapgen-time knobs (permanent snow)

Evidence:
- `.civ7/outputs/resources/Base/modules/base-standard/maps/snow-generator.js`
  - Uses `MapPlotEffects.getPlotEffectTypesContainingTags(...)` and `MapPlotEffects.addPlotEffect(...)`.

Design implication:
- Some “board modifiers” are represented as plot effects; these may be important gameplay-relevant levers (movement/attrition/visual state) even when driven by physics rules.

## Scope Notes (Draft)

- This inventory intentionally includes some **borderline** items (e.g., plot effects) because they influence player-facing board state, even if produced by physics domains.
- When we turn this into an implementation plan, each lever should be triaged into:
  - gameplay-owned apply boundary (engine calls/data tables)
  - physics-owned behavior (but may publish overlays or provide gating artifacts)
  - out-of-scope for the gameplay merge

## Related (Not Mapgen-Time, But Evidence of Board Mutation Surfaces)

Evidence:
- `.civ7/outputs/resources/Base/modules/base-standard/scripts/age-transition-post-load.js`
  - Uses `ResourceBuilder.setResourceType(...)` and `MapCities`/`Cities` APIs during age transitions.

This is out-of-scope for “map generation time” itself, but it’s relevant evidence that Civ7 supports:
- additional “board mutation” flows outside initial map generation.

