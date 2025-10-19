# Era-Tagged Morphology Assessment

## Original Prompt

**Question:** Should we introduce an “era-tagged morphology” approach that iterates Foundations → Voronoi Plate Generation → Morphology in 3–5 loops, storing only per-iteration morphology tags as an ordered stack for narrative use while publishing the final iteration’s physics output as the canonical world state?

**Decision:** **NO — rely on the single-pass physics pipeline and extend existing overlay metadata instead of rerunning foundations/morphology.**

### Rationale

1. **Single Source of Truth:** The refactor blueprint mandates a single immutable `FoundationContext` created once per map (`mod/maps/core/types.js:437`). The WorldModel singleton caches global buffers and early exits on subsequent `init()` calls (`mod/maps/world/model.js:82`). Looping foundations/morphology would require tearing down engine-coupled state between iterations, conflicting with the blueprint and risking desync with Civ’s live surface.
2. **Engine Coupling:** WorldModel writes directly against Civ VII engine globals; we no longer have an in-memory adapter for speculative passes (`mod/ARCHITECTURE.md:8`). Multiple loops would mutate the real gameplay surface repeatedly.
3. **Existing Signals:** Current physics outputs already encode “era-like” information: `shieldStability` for ancient interiors, `riftPotential` for paleo scars, `upliftPotential` + `tectonicStress` for active belts (`mod/maps/world/model.js:200-269`). Narrative overlays already consume sparse tags (StoryTags) and caches such as `OrogenyCache` without rerunning heavy stages (`mod/maps/story/tagging.js:420-605`).
4. **Storage & Compute:** Iterating Voronoi + morphology multiple times would multiply the most expensive part of the pipeline and tempt us to cache extra heightfields—precisely what the refactor removed.

## Alternative: Analytic Era Tag Overlay

### Unique Advantages

- **Zero extra solves:** Leverages the single deterministic physics snapshot and shared staging buffers.
- **Narrative leverage:** Exposes compact “era morphology” overlays derived from existing tensors, giving writers differentiated cues (ancient scars vs. modern uplift) without re-running morphology.
- **Alignment with roadmap:** Matches the plan to formalize `StoryOverlays` as immutable data products in Phase D (`ENGINE_REFACTOR_PLAN.md:85`) and keeps story layers thin wrappers over physics outputs.
- **Determinism & observability:** Tags reference the published configuration snapshot (`FoundationContext.config`), so provenance hashes trace exactly which knobs produced each overlay.

### Minimal Implementation Path

1. **Overlay Registry:** Introduce `ctx.overlays.ensure('eraMorphology')`, backed by a sparse record store alongside existing StoryTags. Records follow:
   ```json
   {
     "eraIndex": 1,
     "featureKind": "riftShoulder",
     "geometryRef": "x,y",          // tile key or pointer into shared buffers
     "strength": 0.74,
     "provenance": { "stage": "mountains", "algo": "plateScores:v3", "paramsHash": "…" },
     "notes": "optional developer diagnostics"
   }
   ```
2. **Derive Era Buckets:** During morphology stages (coastlines, mountains, volcanoes) compute analytic scores once:
   - **Era 1 – Ancient Scar:** High `shieldStability`, moderate `riftPotential`, low `boundaryCloseness`.
   - **Era 2 – Mature Relief:** Moderate stability, sustained `upliftPotential`.
   - **Era N – Active Belt:** High `upliftPotential` + `tectonicStress`, convergent `boundaryType`.
   Normalize to `0..1`, threshold by configurable densities, and emit sparse overlay records via the registry.
3. **Narrative Accessors:** Extend `MapContext` with `getEraMorphology({ minStrength, decay })`. Narrative overlays read ordered stacks newest→oldest, applying exponential decay (e.g., `0.65^Δera`) when combining influences.
4. **Diagnostics & Provenance:** Reuse dev logging toggles (`DEV.LOG_RELIEF_ASCII`, `DEV.LOG_LANDMASS_ASCII`) to visualize tagged eras. Hash the active stage config (`FoundationContext.config`) into `paramsHash` for replay parity.

#### Pseudocode

```js
function tagEraMorphology(ctx, tensors, stageId, configSnapshot) {
  const overlay = ctx.overlays.ensure("eraMorphology");
  const { shield, rift, uplift, tectonic, boundaryType, boundaryCloseness } = tensors;
  const size = ctx.dimensions.width * ctx.dimensions.height;

  for (let i = 0; i < size; i++) {
    const scarScore = normalizeScar(shield[i], rift[i], boundaryCloseness[i]);
    if (scarScore >= ERA_THRESHOLDS.ancient) {
      overlay.add(i, {
        eraIndex: 1,
        featureKind: "paleoScar",
        geometryRef: indexToKey(i, ctx.dimensions.width),
        strength: scarScore,
        provenance: buildProvenance(stageId, configSnapshot),
      });
    }

    const activeScore = normalizeActive(uplift[i], tectonic[i], boundaryType[i]);
    if (activeScore >= ERA_THRESHOLDS.modern) {
      overlay.add(i, {
        eraIndex: ERA_CONFIG.latest,
        featureKind: "orogenyActive",
        geometryRef: indexToKey(i, ctx.dimensions.width),
        strength: activeScore,
        provenance: buildProvenance(stageId, configSnapshot),
      });
    }
  }
}
```

### Mapping to Narrative Overlays

- **Query Path:** `storyTagRiftValleys`, `storyTagHotspotTrails`, and future overlays request `ctx.overlays.get('eraMorphology')`. They sort records descending by `eraIndex` and blend strengths with configurable decay to balance recency vs. legacy scars.
- **Usage Examples:** 
  - Early-era scars increase probability of paleo river corridors and canyon discoveries.
  - Active-era belts temper rainforest swatches and boost geothermal hotspots.
  - Mixed-era tiles (scars + active) signal uplifted plateaus suitable for highland biomes.
- **Guardrails:** Overlays only adjust staged buffers (`writeClimateField`, `StoryTags`, placement metadata). Heightfield alterations remain in morphology stages, preserving physical plausibility.

### Risks & Mitigations

- **Over-tagging:** Enforce per-era density caps (< X% of land tiles) and debias with stratified sampling.
- **Narrative overrides physics:** Keep rainfall/feature nudges within clamps already enforced by climate helpers. Require overlays to check `StageManifest` enablement before emitting tags.
- **Schema drift:** Unit-test schema contracts and provenance hashes; lint overlay payload sizes to prevent silent growth.
- **Perception mismatch:** Provide developer diagnostics (ASCII overlays, histograms) so authors can preview era signals alongside terrain.

### Example Walk-Through — “Grand Canyon” Analogue

1. **Mountains Stage:** Detects strong convergent uplift along a plate boundary → emits `eraIndex = N`, `featureKind = "orogenyActive"`, `strength ≈ 0.9`.
2. **Rift Analysis:** Adjacent shield interior with moderate rift legacy → emits `eraIndex = 1`, `featureKind = "paleoScar"`, `strength ≈ 0.6`.
3. **Rivers Stage:** Reads both tags to prioritize entrenched river carving through the scar, caching a `paleoRiver` record at `eraIndex = 2`.
4. **Narrative Overlay:** Combines the stack `{N=active orogeny, 2=paleoRiver, 1=paleoScar}` to place canyon discoveries, arid swatches, and museum events without touching the original heightfield.
5. **Downstream Consumers:** Biomes and placement layers consult the same overlay stack to bias desert belts and cultural artifacts, ensuring narrative intent remains grounded in the static physics output.

### Acceptance Tests

1. **Determinism:** Run generation twice with fixed seeds; assert identical serialized `eraMorphology` payloads.
2. **Density Bounds:** Verify per-era tag counts remain under configured land-tile thresholds.
3. **Storage Budget:** Confirm total overlay bytes stay within target (< X KB) to avoid multi-snapshot bloat.
4. **Runtime Cost:** Benchmark mountains + rivers stages pre/post tagging; ensure overhead < 5%.
5. **Visual Sanity:** Enable ASCII diagnostics (`DEV.LOG_RELIEF_ASCII`, `DEV.LOG_RAINFALL_ASCII`) to confirm paleo scars influence river placement and climate overlays plausibly.
6. **Narrative Regression:** Disable a morphology stage via manifest and ensure overlay queries degrade gracefully (no stale tags, clear warnings).

## Narrative Q&A Context

**Why no multi-pass reruns?** The era tags are analytic labels extracted from the single physics snapshot. We map WorldModel tensors—shield stability, rift potential, uplift, tectonic stress—into “early vs. late” categories and record them via overlays. Narrative overlays then consume an ordered tag stack, weighting recent signals more heavily while still referencing older scars. Because the mountains layer already blends those tensors when placing ranges (older belts bias toward hills, newer belts stay steep), we don’t have to rerun mountain placement. Adjustments to Appalachians-vs.-Rockies style outcomes remain inside the one mountains stage heuristic, keeping physics and narrative in sync. Multiple Voronoi solves would just duplicate cost without yielding more grounded tags.

## Where the Tensors Come From

1. **Voronoi Plate Solve:** `computePlatesVoronoi()` seeds plates with Civ VII’s Voronoi utilities and performs Lloyd relaxation (`mod/maps/world/plates.js:61-118`). Each Voronoi cell is assigned to the nearest plate, producing the primary `plateId` field.
2. **Boundary Analysis:** The helper builds a kd-tree of Voronoi region cells and calls `computePlateBoundaries()` to evaluate each shared edge (`plates.js:259-311`). For every boundary it calculates:
   - **Subduction (convergent/divergent):** Difference in plate movement along the boundary normal (`plates.js:295-309`).
   - **Sliding:** Relative movement perpendicular to the normal (`plates.js:294-308`).
3. **Movement Vectors:** `calculatePlateMovement()` blends each plate’s translational movement with a rotational component derived from Civ’s `PlateRegion` metadata (`plates.js:332-356`). Global directionality config from `foundation.dynamics.directionality` biases these vectors via `applyDirectionalityBias()` before the solve runs (`plates.js:363-388`).
4. **Scalar Fields:** For each tile, the solver finds the nearest boundary, converts distance into a 0–255 “closeness” value, and classifies boundary type based on subduction/sliding thresholds (`plates.js:191-243`). From those:
   - `tectonicStress` = `boundaryCloseness`.
   - `upliftPotential` boosts stress near convergent boundaries; otherwise it’s quartered (`plates.js:226-234`).
   - `riftPotential` mirrors uplift for divergent boundaries.
   - `shieldStability` is the inverse (255 – stress), highlighting interior cratons.
   - Movement arrays (`plateMovementU/V`, `plateRotation`) capture the vector outputs.
5. **WorldModel Publication:** `WorldModel.init()` copies these arrays into its singleton state (`mod/maps/world/model.js:259-269`) and exposes them through `FoundationContext.plates` for downstream stages (`core/types.js:437-452`).

> **Physics Fidelity:** These tensors are heuristic approximations built from geometry and scripted plate motions. Civ’s Voronoi stack gives us coherent boundaries and relative motion, but the fields are not simulating full geodynamics—they encode directional biases and proximity metrics that mimic tectonic behavior well enough for downstream morphology and narrative logic. Continuous evolution is not modeled; the “eras” are interpretations layered atop this static snapshot.

## Easy Enhancements (Optional)

1. **Blended Scar Metric:** Derive scars from a weighted blend of `shieldStability`, `riftPotential`, and local relief (slope computed from the heightfield buffer) rather than a single tensor. This better separates weathered belts from flat interiors without extra simulation.
2. **Pseudo-Erosion Smoothing:** After mountains/hills execute, run a small kernel smoothing pass over `upliftPotential` where current relief is low. The smoothed value feeds early-era tags to represent aged ranges.
3. **Boundary Lifetimes:** Use plate movement magnitude and direction (`plateMovementU/V`, `plateRotation`) to estimate how quickly a boundary refreshes. Fast-moving convergent zones bias tiles toward later eras; sluggish zones drift toward earlier eras.
4. **Percentile Thresholds:** Instead of fixed thresholds, compute map-specific percentiles (e.g., top 10 % uplift → latest era) when emitting tags. This keeps tag densities stable across presets.
5. **Climate Sanity Check:** Cross-reference the staged climate buffer; if an “ancient” tag coincides with rainforest-level rainfall, dampen the era weight to avoid contradictory storytelling cues.

These refinements live entirely inside the single-pass tagging routine—no additional Voronoi solves or engine hooks required. Designers can adopt them incrementally to tighten the link between physics heuristics and authored eras.
