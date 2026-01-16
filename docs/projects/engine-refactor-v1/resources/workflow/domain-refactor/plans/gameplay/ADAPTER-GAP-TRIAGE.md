# Gameplay Domain — Adapter Gap Triage (Draft)

## Goal

For each Civ7 script-level lever that exists but is not a first-class `EngineAdapter` capability, classify it as:
- out-of-scope
- needed-for-Gameplay-v1
- later / nice-to-have

This triage is prerequisite to a credible refactor plan.

## Primary Sources

- `docs/projects/engine-refactor-v1/resources/spike/spike-gameplay-domain-refactor-plan-notes.md`
- `packages/civ7-adapter/src/types.ts`

## Triage Assumptions (For This Draft)

- “Gameplay v1” here means: **merge/own** narrative + placement concerns as a domain surface and keep parity with current behavior by continuing to call the existing high-level adapter entrypoints (starts/resources/discoveries/wonders/etc).
- Under that scope, we do **not** require new adapter APIs unless there is a concrete, near-term authored behavior we cannot express with the current entrypoints.

## Gap Classification (Draft)

```yaml
gaps:
  - concern: "direct resource placement"
    class: later
    blocking_for_gameplay_v1: false
    evidence:
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/resource-generator.js uses ResourceBuilder.setResourceType(...)"
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/map-utilities.js uses ResourceBuilder.setResourceType(...)"
    rationale: >
      Gameplay v1 can continue to treat resources as an engine-owned bulk generation step
      via EngineAdapter.generateResources(). Direct placement becomes relevant only if we
      want to author/override resource placement rules inside the mod pipeline.
    possible_future_surfaces:
      - "EngineAdapter.setResourceType(...) (or higher-level batch APIs)"
      - "Gameplay ops: planResources(...) + applyResources(...)"

  - concern: "map-type conditional resource post-processing"
    class: later
    blocking_for_gameplay_v1: false
    evidence:
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/resource-generator.js consults Configuration.getMapValue(\"Name\") + GameInfo.MapIslandBehavior"
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/map-utilities.js defines replaceIslandResources(...)"
    rationale: >
      This behavior is already included when delegating to the official generateResources() routine.
      It only becomes a gap if we want to author the post-processing in-mod rather than delegating.

  - concern: "mapgen-time city/district mutation"
    class: out_of_scope
    blocking_for_gameplay_v1: false
    evidence:
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/map-utilities.js removeRuralDistrict(...) / placeRuralDistrict(...)"
    rationale: >
      This is real engine capability, but Gameplay v1 (narrative+placement merge) does not
      require authoring district mutation. Capture as a future gameplay lever.
    notes: "If we ever use this, it likely needs explicit safety/guardrails (what is legal to mutate when)."

  - concern: "start position scoring internals"
    class: out_of_scope
    blocking_for_gameplay_v1: false
    evidence:
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/assign-starting-plots.js uses StartPositioner.getStartPositionScore(...) and helpers"
    rationale: >
      Gameplay v1 should keep start placement as a black-box engine capability
      (EngineAdapter.assignStartPositions). Exposing scoring knobs would be a separate product/design decision.

  - concern: "discovery placement primitives"
    class: out_of_scope
    blocking_for_gameplay_v1: false
    evidence:
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/discovery-generator.js uses MapConstructibles.addDiscovery(...)"
    rationale: >
      Gameplay v1 can delegate to generateDiscoveries(). Lower-level primitives are only needed
      if we want custom discovery placement behaviors authored in-mod.

  - concern: "plot effects (e.g., permanent snow)"
    class: later
    blocking_for_gameplay_v1: false
    evidence:
      - ".civ7/outputs/resources/Base/modules/base-standard/maps/snow-generator.js uses MapPlotEffects.addPlotEffect(...)"
    rationale: >
      This is a player-facing board lever, but it is currently driven by physics map scripts.
      Gameplay v1 does not require direct plot-effect authoring; capture as future extension point.
```

## Summary (So We Don’t Forget Later)

- Gameplay v1 does not appear to require new `EngineAdapter` capabilities.
- The main value of this triage is to:
  - prevent accidental scope creep (“we need to expose everything”)
  - keep a vetted backlog of real engine levers we can elevate later
