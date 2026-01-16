# Morphology Domain Refactor — Phase 1 Current-State Spike

This spike is the **Phase 1 output** for the Morphology vertical refactor workflow.

References:
- Plan: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/MORPHOLOGY.md`
- Workflow: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

Goal: ground the Morphology refactor in current-state reality (wiring, contracts, boundary violations) so Phase 2/3 can be scoped based on evidence.

---

## Phase 0 baseline gates (status: pending)

Not run in this spike:
- guardrail script
- package checks/tests

This is a doc-only current-state artifact.

---

## 1) Phase 1 hypotheses to validate (from plan)

Hypotheses:
- Morphology is split across multiple recipe stages:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/`
- These stages appear to still use legacy authoring posture (no stage-owned `artifacts.ts`, steps import domain implementations rather than injected ops).
- `mods/mod-swooper-maps/src/domain/morphology/ops/contracts.ts` is empty.

Results (evidence):
- Confirmed: Morphology is split across `morphology-pre` / `morphology-mid` / `morphology-post`.
- Confirmed: Step files use `defineStep` + `createStep(..., { run: (context, config, _ops, deps) => ... })` but still **import Morphology implementations directly**.
- Confirmed: Morphology ops contract surface exists structurally but is empty, and the standard recipe does not compile/register Morphology ops:
  - `mods/mod-swooper-maps/src/domain/morphology/ops/contracts.ts` exports `{}`.
  - `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` `compileOpsById` excludes Morphology.

---

## 2) Recipe wiring (where Morphology sits)

Standard recipe stage ordering (source of truth):
- `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`

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

Ops compilation (current-state):
- `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` compiles ops for:
  - `foundation`, `hydrology`, `ecology`, `placement`
- Morphology is excluded, so Morphology steps cannot call `ops.*` even if contracts existed.

Implication:
- The current Morphology “domain boundary” is not the ops boundary; it is the recipe step boundary + direct implementation imports.

---

## 3) Morphology stages and steps (current authoring posture)

Morphology stage roots:
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post`

Current composition (contract + implementation files):

```yaml
morphology-pre:
  stage_module: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/index.ts
  knobsSchema: {}
  steps:
    - id: landmass-plates
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.contract.ts
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts
    - id: coastlines
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.contract.ts
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts

morphology-mid:
  stage_module: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/index.ts
  knobsSchema: {}
  steps:
    - id: rugged-coasts
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts

morphology-post:
  stage_module: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/index.ts
  knobsSchema: {}
  steps:
    - id: islands
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.contract.ts
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts
    - id: mountains
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.contract.ts
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts
    - id: volcanoes
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.contract.ts
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts
```

Posture deviations vs target architecture:
- No stage-owned artifact contracts exist for Morphology stages (no `stages/<stage>/artifacts.ts`).
- Steps still deep-import Morphology implementations (e.g. `@mapgen/domain/morphology/landmass/index.js`) instead of calling injected Morphology ops.

---

## 4) Current dependency graph (who reads/writes Morphology outputs)

Morphology currently exposes “outputs” primarily through:
- effect tags (ordering signals),
- runtime state (`StandardRuntime` continent bounds),
- and overlay registry state (HOTSPOTS snapshot and other story overlays).

### 4.1 Effect-tag dependencies (contract-declared)

Effect-tag definitions:
- `mods/mod-swooper-maps/src/recipes/standard/tags.ts` (`M4_EFFECT_TAGS`)

Produced by Morphology steps:

```yaml
effect:engine.landmassApplied:
  producers:
    - morphology-pre/landmass-plates
    - morphology-post/islands
  consumers:
    - morphology-pre/coastlines
    - hydrology-pre/lakes

effect:engine.coastlinesApplied:
  producers:
    - morphology-pre/coastlines
    - morphology-mid/rugged-coasts   # re-provides
  consumers:
    - narrative-pre/story-seed
    - narrative-pre/story-hotspots
    - narrative-pre/story-corridors-pre
    - narrative-pre/story-rifts
    - narrative-mid/story-orogeny
    - narrative-post/story-corridors-post
    - morphology-post/islands
    - placement/derive-placement-inputs
```

Validation gap:
- `mods/mod-swooper-maps/src/recipes/standard/tags.ts` includes a `satisfies` check only for:
  - `ENGINE_EFFECT_TAGS.biomesApplied`
  - `ENGINE_EFFECT_TAGS.placementApplied`
- `effect:engine.landmassApplied` and `effect:engine.coastlinesApplied` have no `satisfies` validator today, so they are purely ordering tags.

### 4.2 Artifact dependencies (contract-declared)

Morphology step contracts require upstream artifacts:

```yaml
artifact:foundation.plates:
  required_by:
    - morphology-pre/landmass-plates
    - morphology-mid/rugged-coasts
    - morphology-post/mountains
    - morphology-post/volcanoes

artifact:storyOverlays:
  produced_by:
    - narrative-pre/story-seed
  required_by:
    - morphology-mid/rugged-coasts
    - morphology-post/islands
```

Artifact contract modules:
- `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts` (`foundationArtifacts`)
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/artifacts.ts` (`narrativePreArtifacts`)

Overlay artifact schema looseness:
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/artifacts.ts` defines `storyOverlays` as:
  - `{ corridors: Type.Array(Type.Any()), swatches: Type.Array(Type.Any()), motifs: Type.Array(Type.Any()) }`
  - `additionalProperties: true`
- Multiple consumers treat it as a registry-of-snapshots with “latest snapshot wins per key”.

### 4.3 Hidden coupling: StandardRuntime continent bounds (not contract-declared)

Producer:
- `morphology-pre/landmass-plates` mutates `StandardRuntime.westContinent` / `StandardRuntime.eastContinent`:
  - `mods/mod-swooper-maps/src/recipes/standard/runtime.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`

Consumers:
- Hydrology (implicit):
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/steps/climateBaseline.ts`
    - reads runtime continents
    - declares `requires: []` in the step contract (no dependency tag)
    - restamps landmass ids and stamps continents again
- Placement (explicit via placement ops + adapter apply):
  - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/inputs.ts` (plans starts using `baseStarts`)
  - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts` (passes continent bounds into engine start assigner)

Implication:
- This is a high-impact consumer surface that bypasses the dependency system and breaks “local reasoning” about step order.

---

## 5) Downstream consumer inventory (current usage)

This is “who consumes Morphology outputs”, not “who imports Morphology modules”.

### 5.1 Effect tag consumers

```yaml
consumers_of_effect:engine.landmassApplied:
  - morphology-pre/coastlines:
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.contract.ts
  - hydrology-pre/lakes:
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/steps/lakes.contract.ts

consumers_of_effect:engine.coastlinesApplied:
  - narrative-pre/story-seed:
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storySeed.contract.ts
  - narrative-pre/story-hotspots:
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyHotspots.contract.ts
  - narrative-pre/story-corridors-pre:
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyCorridorsPre.contract.ts
  - narrative-pre/story-rifts:
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyRifts.contract.ts
  - narrative-mid/story-orogeny:
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/steps/storyOrogeny.contract.ts
  - narrative-post/story-corridors-post:
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post/steps/storyCorridorsPost.contract.ts
  - placement/derive-placement-inputs:
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/contract.ts
  - morphology-post/islands:
      contract: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.contract.ts
```

### 5.2 Runtime continent consumers

```yaml
consumers_of_standardRuntime.continent_bounds:
  - hydrology-pre/climate-baseline:
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/steps/climateBaseline.ts
  - placement/derive-placement-inputs:
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/inputs.ts
  - placement/placement:
      impl: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts
```

Placement contract surface encodes continent bounds:
- `mods/mod-swooper-maps/src/domain/placement/ops/plan-starts/contract.ts`

### 5.3 Overlay consumers (registry view readers)

Overlay registry readers:
- `mods/mod-swooper-maps/src/recipes/standard/overlays.ts`

Known HOTSPOTS snapshot readers (via `readOverlayMotifsHotspots`):
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyCorridorsPre.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`

Known MARGINS snapshot readers (via `readOverlayMotifsMargins`):
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`

---

## 6) Domain surface inventory (outside view)

Morphology domain directory:
- `mods/mod-swooper-maps/src/domain/morphology`

Domain router / ops wiring (current-state):

```yaml
domain_router:
  - mods/mod-swooper-maps/src/domain/morphology/index.ts          # defineDomain({ id: "morphology", ops })
  - mods/mod-swooper-maps/src/domain/morphology/ops/contracts.ts  # exports {}
  - mods/mod-swooper-maps/src/domain/morphology/ops/index.ts      # implementations = {}, contracts = {}
  - mods/mod-swooper-maps/src/domain/morphology/ops.ts            # createDomain(domain, implementations)
```

Observed:
- Morphology’s domain ops contract surface exists structurally, but is empty (`{}`).
- Standard recipe compilation does not include Morphology ops, so steps cannot call `ops.*` today.

Current “public” modules used by steps (direct implementation imports):

```yaml
used_by_recipe_steps:
  - mods/mod-swooper-maps/src/domain/morphology/landmass/index.ts
  - mods/mod-swooper-maps/src/domain/morphology/coastlines/index.ts
  - mods/mod-swooper-maps/src/domain/morphology/islands/index.ts
  - mods/mod-swooper-maps/src/domain/morphology/mountains/index.ts
  - mods/mod-swooper-maps/src/domain/morphology/volcanoes/index.ts
```

Latent/alternate landmass output surface (currently unused by step wiring):
- `mods/mod-swooper-maps/src/domain/morphology/landmass/types.ts` defines `LandmassGenerationResult.startRegions`.
- The step `morphology-pre/landmass-plates` uses `plateResult.windows` and post-adjusts those windows into `StandardRuntime` continent bounds.

---

## 7) Contract matrix (current-state)

Phase 1 records current step contracts + tags + artifact reads. Morphology op contracts do not exist today.

Morphology step contracts:
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.contract.ts`

---

## 8) Legacy surface inventory (config properties + rules/policies + functions)

This is an “outside view” inventory; Phase 2/3 decides keep/kill/migrate.

### 8.1 Config surfaces (current-state)

Morphology config schema module:
- `mods/mod-swooper-maps/src/domain/morphology/config.ts`

Top-level keys used by Morphology steps:

```yaml
MorphologyConfigSchema:
  oceanSeparation: used_by=landmass-plates
  coastlines: used_by=rugged-coasts
  islands: used_by=islands
  mountains: used_by=mountains
  volcanoes: used_by=volcanoes
```

Additional config surface used by Morphology:
- `LandmassConfigSchema` (`mods/mod-swooper-maps/src/domain/morphology/landmass/config.ts`)
  - used by `morphology-pre/landmass-plates` (as `config.landmass`)

Observed config posture in implementations:
- Several Morphology functions accept optional configs and apply runtime defaults/guards (rather than relying on schema defaults + normalize).

### 8.2 Rules/policies (current-state)

```yaml
ocean_separation_policy:
  - mods/mod-swooper-maps/src/domain/morphology/landmass/ocean-separation/policy.ts
  - export: DEFAULT_OCEAN_SEPARATION

coastlines_corridor_policy:
  - mods/mod-swooper-maps/src/domain/morphology/coastlines/corridor-policy.ts
  - exports:
    - resolveSeaCorridorPolicy
    - findNeighborSeaLaneAttributes
    - findNeighborSeaLaneEdgeConfig
```

### 8.3 Functions and entrypoints (current exports used by steps)

```yaml
landmass:
  module: mods/mod-swooper-maps/src/domain/morphology/landmass/index.ts
  exports_used_by_steps:
    - createPlateDrivenLandmasses
    - applyLandmassPostAdjustments
    - applyPlateAwareOceanSeparation

coastlines:
  module: mods/mod-swooper-maps/src/domain/morphology/coastlines/index.ts
  exports_used_by_steps:
    - addRuggedCoasts

islands:
  module: mods/mod-swooper-maps/src/domain/morphology/islands/index.ts
  exports_used_by_steps:
    - addIslandChains

mountains:
  module: mods/mod-swooper-maps/src/domain/morphology/mountains/index.ts
  exports_used_by_steps:
    - layerAddMountainsPhysics

volcanoes:
  module: mods/mod-swooper-maps/src/domain/morphology/volcanoes/index.ts
  exports_used_by_steps:
    - layerAddVolcanoesPlateAware
```

---

## 9) Boundary violations and deletions-to-drive-to-zero (Phase 1 discovery)

### 9.1 Direct domain implementation imports in steps

Steps that import Morphology implementation modules directly:
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`

### 9.2 Cross-domain deep imports (Foundation semantics via implementation modules)

These Morphology modules import `BOUNDARY_TYPE` from `@mapgen/domain/foundation/constants.js` (implementation layout coupling):
- `mods/mod-swooper-maps/src/domain/morphology/coastlines/rugged-coasts.ts`
- `mods/mod-swooper-maps/src/domain/morphology/coastlines/plate-bias.ts`
- `mods/mod-swooper-maps/src/domain/morphology/mountains/scoring.ts`
- `mods/mod-swooper-maps/src/domain/morphology/volcanoes/scoring.ts`

### 9.3 Missing Morphology ops contract surface + recipe compilation hook

Morphology ops are structurally present but empty:
- `mods/mod-swooper-maps/src/domain/morphology/ops/contracts.ts`
- `mods/mod-swooper-maps/src/domain/morphology/ops/index.ts`

Standard recipe does not compile Morphology ops:
- `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` (`collectCompileOps(...)` excludes Morphology).

---

## 10) Current pipeline map (producer/consumer snapshot)

This is a factual wiring snapshot (not target adjustments).

```yaml
foundation:
  produces:
    - artifact:foundation.plates (foundationArtifacts.plates)

morphology-pre:
  landmass-plates:
    consumes:
      - artifact:foundation.plates
    produces:
      - effect:engine.landmassApplied
    side_effects:
      - writes landmask/terrain via adapter + heightfield buffer
      - mutates StandardRuntime.westContinent/eastContinent
      - stamps continents + validates terrain
  coastlines:
    consumes:
      - effect:engine.landmassApplied
    produces:
      - effect:engine.coastlinesApplied
    side_effects:
      - adapter.expandCoasts(...)

narrative-pre:
  story-seed:
    consumes:
      - effect:engine.coastlinesApplied
    produces:
      - artifact:storyOverlays

morphology-mid:
  rugged-coasts:
    consumes:
      - effect:engine.coastlinesApplied
      - artifact:foundation.plates
      - artifact:storyOverlays
    produces:
      - effect:engine.coastlinesApplied
    side_effects:
      - terrain edits to carve bays/fjords (sea-lane protected)

narrative-mid:
  story-orogeny:
    consumes:
      - effect:engine.coastlinesApplied
      - artifact:foundation.plates
      - artifact:storyOverlays

morphology-post:
  islands:
    consumes:
      - effect:engine.coastlinesApplied
      - artifact:storyOverlays
    produces:
      - effect:engine.landmassApplied
    side_effects:
      - publishes overlay snapshot key=HOTSPOTS (story overlay registry)
  mountains:
    consumes:
      - artifact:foundation.plates
    side_effects:
      - writes terrain as hills/mountains via heightfield buffer
  volcanoes:
    consumes:
      - artifact:foundation.plates
    side_effects:
      - writes volcano features + mountain terrain via adapter

hydrology-pre:
  climate-baseline:
    consumes:
      - StandardRuntime.westContinent/eastContinent (implicit)
    side_effects:
      - recalculates areas, rebuilds elevation, stamps continents again
```

---

## 11) Lookback 1 (Phase 1 → Phase 2: what changed about our understanding)

What this Phase 1 spike changed about our understanding:
- Morphology is not a single block; it is a **pipeline segment interleaved with narrative stages** and it reads/writes overlay state mid-braid.
- Morphology is not contract-first today: ops surface exists structurally but is empty, and recipe compilation excludes it.
- Effect tags provide some ordering, but there is at least one high-impact hidden dependency (`StandardRuntime` continents) that is not expressed as a contract requirement.
- Morphology currently publishes HOTSPOTS as an overlay snapshot from the islands step (which creates a cross-stage feedback loop via overlay readers).

What Phase 2 must answer (modeling posture, not slice planning):
- What is the authoritative Morphology model (buffers vs artifacts vs overlays) and what are the canonical contract surfaces?
- How should “continents / start regions” be represented (runtime vs artifact vs derived product), given downstream consumers in hydrology/placement?
- Which overlay motifs are Morphology-owned vs upstream-owned causes (e.g., HOTSPOTS), and how should overlays be treated as non-canonical append-preferred context?

Blocking unknowns to resolve early in Phase 2:
- Whether `effect:engine.landmassApplied` / `effect:engine.coastlinesApplied` should become validated contracts or be replaced with explicit artifact dependencies.
- How to delete the runtime continents coupling without destabilizing hydrology and placement (ownership boundary).

