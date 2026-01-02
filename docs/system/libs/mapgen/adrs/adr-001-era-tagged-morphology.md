---
system: mapgen
component: domain-content
concern: morphology
---

# ADR-001: Single-Pass Era-Tagged Morphology

**Status:** Accepted
**Date:** 2025-12-05

## Context

A proposal suggested iterating Foundations → Voronoi plate solve → morphology multiple times (3–5 loops) to stack per-iteration "era" tags for narrative use. The idea was to store only per-iteration morphology tags as an ordered stack while publishing the final iteration's physics output as the canonical world state.

However, the refactor blueprint mandates a single immutable `FoundationContext` per run with WorldModel tightly coupled to the engine. Repeated solves would force teardown of engine-bound state and risk desync with the staged buffers.

### Technical Constraints

1. **Single Source of Truth:** `FoundationContext` is created once per map. The WorldModel singleton caches global buffers and early-exits on subsequent `init()` calls. Looping would conflict with this design.

2. **Engine Coupling:** WorldModel writes directly against Civ VII engine globals; there is no in-memory adapter for speculative passes. Multiple loops would mutate the real gameplay surface repeatedly.

3. **Existing Signals:** Current physics outputs already encode "era-like" information:
   - `shieldStability` — ancient interiors
   - `riftPotential` — paleo scars
   - `upliftPotential` + `tectonicStress` — active belts

4. **Performance:** Iterating Voronoi + morphology multiple times would multiply the most expensive part of the pipeline.

## Decision

**Keep the single-pass physics pipeline. Do not rerun foundations/morphology in multiple loops.** Instead, derive era-like signals analytically from the existing physics snapshot and publish them as immutable narrative **story entries** (e.g., `eraMorphology`). Any narrative “overlay” snapshot is derived on demand from those story entries.

### Alternative Approach: Analytic Era Tag Overlay

Publish `eraMorphology` as a **narrative story entry** (immutable artifact payload). Narrative “overlay” snapshots are derived on demand from story entries; `ctx.overlays` must not be required for correctness.

```json
{
  "eraIndex": 1,
  "featureKind": "riftShoulder",
  "geometryRef": "x,y",
  "strength": 0.74,
  "provenance": { "stage": "mountains", "algo": "plateScores:v3", "paramsHash": "..." }
}
```

During morphology stages (coastlines, mountains, volcanoes), compute analytic scores once:
- **Era 1 – Ancient Scar:** High `shieldStability`, moderate `riftPotential`, low `boundaryCloseness`
- **Era 2 – Mature Relief:** Moderate stability, sustained `upliftPotential`
- **Era N – Active Belt:** High `upliftPotential` + `tectonicStress`, convergent `boundaryType`

Normalize to `0..1`, threshold by configurable densities, and emit sparse overlay records.

## Consequences

### Benefits

- Preserves single source of truth and determinism (`FoundationContext` + WorldModel) without extra plate solves
- Narrative consumers read sparse story-entry records derived from physics tensors instead of mutating the heightfield again
- Performance remains bounded; morphology/physics run once
- Tags reference the published configuration snapshot (`FoundationContext.config`), so provenance hashes trace exactly which knobs produced each overlay

### Trade-offs

- Implementation lives in overlays/tagging, leaving heightfield edits inside morphology stages only
- Narrative overlays cannot perform true multi-era terrain evolution—they annotate rather than sculpt

### Next Steps

1. Add an era-morphology narrative story-entry product (typed, versioned)
2. Emit records during morphology using staged buffers/tensors
3. Expose accessors for narrative/placement consumers (query story entries; derive views on demand)
4. Cover with diagnostics (ASCII/histograms) for validation

## Implementation Details

### Tensor Sources

1. **Voronoi Plate Solve:** `computePlatesVoronoi()` seeds plates with Civ VII's Voronoi utilities and performs Lloyd relaxation. Each cell is assigned to the nearest plate.

2. **Boundary Analysis:** The helper builds a kd-tree and calls `computePlateBoundaries()` to evaluate each shared edge, calculating:
   - **Convergence/Divergence:** Difference in plate movement along the boundary normal
   - **Shear:** Relative movement perpendicular to the normal

3. **Scalar Fields:** For each tile, the solver finds the nearest boundary, converts distance into a 0–255 "closeness" value, and classifies boundary type:
   - `tectonicStress` = `boundaryCloseness`
   - `upliftPotential` boosts stress near convergent boundaries
   - `riftPotential` mirrors uplift for divergent boundaries
   - `shieldStability` = 255 – stress (interior cratons)

> **Physics Fidelity:** These tensors are heuristic approximations built from geometry and scripted plate motions. They encode directional biases and proximity metrics that mimic tectonic behavior well enough for downstream morphology and narrative logic. Continuous evolution is not modeled; the "eras" are interpretations layered atop this static snapshot.

### Usage in Narrative Overlays

- **Query Path:** `storyTagRiftValleys`, `storyTagHotspotTrails`, and future narrative consumers read the `eraMorphology` story-entry records and sort descending by `eraIndex`, blending strengths with configurable decay.
- **Examples:**
  - Early-era scars increase probability of paleo river corridors and canyon discoveries
  - Active-era belts temper rainforest swatches and boost geothermal hotspots
  - Mixed-era tiles (scars + active) signal uplifted plateaus suitable for highland biomes
- **Guardrails:** Narrative consumers only adjust staged buffers (`writeClimateField`, placement metadata). Heightfield alterations remain in morphology stages.

### Acceptance Tests

1. **Determinism:** Run generation twice with fixed seeds; assert identical serialized `eraMorphology` payloads
2. **Density Bounds:** Verify per-era tag counts remain under configured land-tile thresholds
3. **Storage Budget:** Confirm total overlay bytes stay within target (< X KB)
4. **Runtime Cost:** Benchmark mountains + rivers stages pre/post tagging; ensure overhead < 5%
5. **Visual Sanity:** Enable ASCII diagnostics to confirm paleo scars influence river placement plausibly
