---
id: LOCAL-M2-CONFIG-SURFACE-ALIGNMENT
title: "[M2] Stable-Slice Story Rainfall/Orogeny Config Surface Alignment"
state: planned
priority: 3
estimate: 1
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: []
labels: [Config, Story, Climate]
parent: null
children: []
blocked_by: [CIV-36]
blocked: []
related_to: [CIV-27, CIV-30, LOCAL-M2-DEV-DIAGNOSTICS]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Promote and document the **story-driven rainfall and orogeny knobs** that are already meaningful in the M2 stable slice, so validated config matches the runtime tunables consumed by `climate-engine.ts`.

## Deliverables

- [ ] **Typed `climate.story.rainfall` block**
  - Add an optional `story` sub‑block to `ClimateConfigSchema` with a `rainfall` object that explicitly models the stable‑slice knobs used today:
    - `riftRadius` (tiles)
    - `riftBoost` (rainfall units)
    - `paradiseDelta` (rainfall units)
    - `volcanicDelta` (rainfall units)
  - Document defaults/ranges consistent with current behavior in `layers/climate-engine.ts`.
- [ ] **Typed `foundation.story.orogeny` tunables**
  - Extend `StoryConfigSchema` (as used under `foundation.story`) to include an optional `orogeny` tunables object with:
    - `windwardBoost` (rainfall units)
    - `leeDrynessAmplifier` (multiplier)
  - Ensure schema/docs reflect that these values are consumed during `refineClimateEarthlike` when `STORY_ENABLE_OROGENY` is active.
- [ ] **Stable‑slice docs alignment**
  - Update any M2 stable‑slice config docs/snippets to advertise these blocks as supported in the orchestrator‑centric slice.
  - Keep scope limited to keys already used in TS; no new story climate behavior is introduced here.

## Acceptance Criteria

- [ ] `MapGenConfigSchema` validates and defaults:
  - `climate.story.rainfall.{riftRadius,riftBoost,paradiseDelta,volcanicDelta}`.
  - `foundation.story.orogeny.{windwardBoost,leeDrynessAmplifier}`.
- [ ] `getTunables().CLIMATE_CFG.story.rainfall` and `getTunables().FOUNDATION_CFG.story.orogeny` resolve to the validated values without extra shims.
- [ ] Climate refinement uses these knobs when minimal story tags exist (from CIV‑36) and is unchanged when blocks are absent.
- [ ] Build and tests pass.

## Out of Scope

- Any new story overlays or additional climate/story passes beyond what is already in the stable slice.
- Canonical data‑product reshaping of story/climate config (owned by M3).
- Diagnostics config promotion or alias cleanup (owned by `LOCAL-M2-DEV-DIAGNOSTICS`).

## Dependencies / Notes

- Depends on minimal story tagging being present so these knobs have effect (CIV‑36).
- Runtime sources:
  - `packages/mapgen-core/src/layers/climate-engine.ts` (Pass D rift humidity; Pass E orogeny belts).
  - `packages/mapgen-core/src/bootstrap/tunables.ts` (`CLIMATE_CFG`, `FOUNDATION_CFG.story` views).
- Historical reference:
  - `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/layers/climate-engine.js`
  - `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/bootstrap/tunables.js`

