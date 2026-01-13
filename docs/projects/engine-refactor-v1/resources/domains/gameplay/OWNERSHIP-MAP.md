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
- Some physics steps also publish overlays today (notably `morphology-post/steps/islands.ts` publishes HOTSPOTS). This is a boundary wrinkle that must be resolved explicitly (see “Wrinkles”), and it strongly suggests a model where:
  - Gameplay owns the **overlay system contract** (types/keys/meaning),
  - But physics steps are still allowed to publish overlays as part of their work (because overlays are “story about physics”, not “gameplay-only behavior”).

## Step Ownership (Draft, Evidence-Backed)

The definitive step inventory (contracts + impl) lives in:
- `docs/projects/engine-refactor-v1/resources/spike/spike-gameplay-domain-refactor-plan-notes.md`

This section makes the ownership claim explicit.

### Gameplay-Owned Steps (Narrative)

```yaml
steps:
  - stage: narrative-pre
    ids: [story-seed, story-hotspots, story-rifts, story-corridors-pre]
  - stage: narrative-mid
    ids: [story-orogeny]
  - stage: narrative-swatches
    ids: [story-swatches]
  - stage: narrative-post
    ids: [story-corridors-post]
```

### Gameplay-Owned Steps (Placement)

```yaml
steps:
  - stage: placement
    ids: [derive-placement-inputs, placement]
```

### Physics-Owned Steps That Consume Gameplay Outputs (Overlays)

This is the critical “braid boundary”: physics steps are allowed to **consume** gameplay-owned overlays as policy input.

```yaml
consumers:
  - stage: morphology-mid
    step: ruggedCoasts
    reads: [motifs.margins, corridors]
  - stage: morphology-post
    step: islands
    reads: [motifs.margins, motifs.hotspots, corridors]
  - stage: hydrology-post
    step: climateRefine
    reads: [motifs.rifts, motifs.hotspots]
  - stage: ecology
    step: biomes
    reads: [corridors, motifs.rifts]
  - stage: ecology
    step: features
    reads: [motifs.hotspots, motifs.margins]
```

## Wrinkles / Boundary Decisions (Draft)

### Non-gameplay stages publishing overlays

Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts` publishes HOTSPOTS overlays.

Decision needed (recommended default included):

#### Keep physics-owned overlay publication (recommended for v1)
- **Context:** Some overlays (e.g., HOTSPOTS) are derived as a direct byproduct of a physics step (morphology islands). Forcing this computation into a gameplay-owned stage increases churn and makes the braid harder to reason about.
- **Choice:** Keep the computation and publication in the physics step, but treat it as “publishing into the gameplay-owned overlay contract”.
- **Implication:** Gameplay owns overlay keys/types/meaning; physics steps may publish overlays when they are the authoritative producer.

#### Move overlay publication into a gameplay-owned step (possible later)
- **Context:** If we later want a strict layering model (“only gameplay writes overlays”), we can move the computation into narrative-*.
- **Risk:** This may require reshaping stage contracts (dependencies on morphology outputs) and increases refactor scope.

This doc should become definitive about which approach we take, and why.
