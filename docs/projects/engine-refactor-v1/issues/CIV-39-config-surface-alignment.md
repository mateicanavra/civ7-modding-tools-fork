---
id: CIV-39
title: "[M2] Stable-Slice Story Rainfall Config Surface Alignment (Orogeny Deferred)"
state: planned
priority: 2
estimate: 1
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: []
labels: [Config, Story, Climate]
parent: null
children: []
blocked_by: [CIV-36]
blocked: []
related_to: [CIV-27, CIV-30, CIV-38]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Promote and document the **story-driven rainfall knobs** that are already meaningful in the M2 stable slice, so validated config matches the runtime tunables consumed by `climate-engine.ts`.  
Story orogeny (windward/lee amplification along belts) is explicitly deferred to the M3+ task‑graph architecture and should not be promoted via legacy cache shims in M2.

## Deliverables

- [ ] **Typed `climate.story.rainfall` block**
  - Add an optional `story` sub‑block to `ClimateConfigSchema` with a `rainfall` object that explicitly models the stable‑slice knobs used today:
    - `riftRadius` (tiles)
    - `riftBoost` (rainfall units)
    - `paradiseDelta` (rainfall units)
    - `volcanicDelta` (rainfall units)
  - Document defaults/ranges consistent with current behavior in `layers/climate-engine.ts`.
- [ ] **Stable‑slice docs alignment**
  - Update any M2 stable‑slice config docs/snippets to advertise these blocks as supported in the orchestrator‑centric slice.
  - Keep scope limited to keys already used in TS; no new story climate behavior is introduced here.

## Acceptance Criteria

- [ ] `MapGenConfigSchema` validates and defaults:
  - `climate.story.rainfall.{riftRadius,riftBoost,paradiseDelta,volcanicDelta}`.
- [ ] `getTunables().CLIMATE_CFG.story.rainfall` resolves to the validated values without extra shims.
- [ ] Climate refinement uses these knobs when minimal story tags exist (from CIV‑36) and is unchanged when blocks are absent.
- [ ] Build and tests pass.

## Out of Scope

- Any new story overlays or additional climate/story passes beyond what is already in the stable slice.
- Story orogeny belts / windward‑lee amplification and any config surface for them (handled in M3+ as a dedicated orogeny step/layer).
- Canonical data‑product reshaping of story/climate config (owned by M3).
- Diagnostics config promotion or alias cleanup (owned by CIV-38).

## Dependencies / Notes

- Depends on minimal story tagging being present so these knobs have effect (CIV‑36).
- Runtime sources:
  - `packages/mapgen-core/src/layers/climate-engine.ts` (Pass D rift humidity; Pass E orogeny belts is deferred in M2).
  - `packages/mapgen-core/src/bootstrap/tunables.ts` (`CLIMATE_CFG`, `FOUNDATION_CFG.story` views).
- Historical reference:
  - `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/layers/climate-engine.js`
  - `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/bootstrap/tunables.js`
