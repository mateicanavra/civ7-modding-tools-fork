# Gameplay Domain — Ownership Map (Draft)

## Goal

Make “Gameplay” ownership explicit without prematurely reshaping the pipeline braid.

This doc is the missing core artifact:
- What moves under Gameplay vs what stays physics-owned.
- How braided stages remain separate (ordering preserved) but can still be “Gameplay-owned”.

## Current Stage Braid (Source of Truth)

Source: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`

```yaml
stages_in_order:
  - foundation
  - morphology-pre
  - narrative-pre
  - morphology-mid
  - narrative-mid
  - morphology-post
  - hydrology-pre
  - narrative-swatches
  - hydrology-core
  - narrative-post
  - hydrology-post
  - ecology
  - placement
```

## Proposed Ownership Model (Draft)

### Stage Ownership

```yaml
stages:
  - id: foundation
    owner: physics
  - id: morphology-pre
    owner: physics
  - id: narrative-pre
    owner: gameplay
  - id: morphology-mid
    owner: physics
  - id: narrative-mid
    owner: gameplay
  - id: morphology-post
    owner: physics
  - id: hydrology-pre
    owner: physics
  - id: narrative-swatches
    owner: gameplay
  - id: hydrology-core
    owner: physics
  - id: narrative-post
    owner: gameplay
  - id: hydrology-post
    owner: physics
  - id: ecology
    owner: physics
  - id: placement
    owner: gameplay
```

### Ownership Notes (Draft)

- Narrative stages are gameplay-owned because they publish “story” overlays consumed by multiple downstream steps (including physics steps).
- Placement is gameplay-owned because it is the canonical “engine apply” boundary (starts, resources, wonders, discoveries, scoring inputs).
- Some physics steps also publish overlays today (notably `morphology-post/steps/islands.ts` publishes HOTSPOTS). This is a boundary wrinkle that must be resolved explicitly (see “Wrinkles”).

## Wrinkles / Boundary Decisions (Draft)

### Non-gameplay stages publishing overlays

Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts` publishes HOTSPOTS overlays.

Decision needed:
- Should HOTSPOTS overlay publication move into a Gameplay-owned stage/step (likely narrative-pre), or remain physics-owned but publish into the shared overlays container?

This doc should become definitive about which approach we take, and why.

