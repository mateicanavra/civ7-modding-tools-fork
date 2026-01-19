## Addendum: Purging Overlay Inputs + Replacing Legacy “Thumb-on-Scale” Controls with Physics-First Drivers (Phase 2 Morphology)

### Why this addendum exists

You’re right to flag this: the Phase 2 Morphology model still contains **legacy leakage** in three places:

1. **Morphology “reading hotspots / overlays”** (even as “data-only masks”)
2. **Ocean basin separation** framed as an explicit post-process constraint (a manual corridor / “sea lane protection” concept)
3. **Landform accents (islands / volcanoes / mountains)** described as if they could depend on non-physics inputs (hotspots-as-overlay, corridor masks, etc.)

All three violate the greenfield goal and the hard rule: **physics domains must not consume story/gameplay overlays as inputs**.

This addendum is the authoritative correction: it supersedes specific parts of the Phase 2 model and forces the entire system (Foundation + Morphology + downstream) into a clean one-way authority relationship.

---

# A) New locked invariant (overrides any earlier text)

### A1 — No overlay inputs to Morphology, ever (Phase A Gameplay)

**LOCKED:** Morphology must not consume **any** artifact or payload produced by Gameplay/Narrative/Placement (now consolidated as Gameplay) *as an input to physics computation*.
This includes “optional constraints,” “protected sea lanes,” “hotspots,” “corridors,” “motifs,” or any “data-only mask.”

**What’s allowed instead:**

* Morphology consumes only **Foundation + Environment** physics inputs and author config.
* Gameplay consumes Morphology/Hydrology/Ecology outputs and produces overlays/placements **read-only** (Phase A posture).

**Implication:** any Phase 2 text that says “overlay constraints (optional)” is now invalid and must be deleted.

---

# B) Hotspots are a physics driver, not an overlay

The word “hotspot” is overloaded. We keep the *physics concept* (mantle plume / melt anomaly), but we ban the *overlay concept*.

### B1 — Rename the concept in the model to prevent confusion

**Replace** “HOTSPOTS overlay” / “hotspot mask” anywhere in Morphology with:

* **Foundation-owned**: `mantleMeltFlux` (or `meltFlux`) field

  * continuous scalar per tile/mesh node indicating melt potential / magma supply
* Optional companion fields (Foundation-owned):

  * `plumeId` (categorical plume source identity; supports island-chain tracking)
  * `plumeAge` or `timeSinceActivation` (for time-stepped plume life)

**Morphology uses `meltFlux` as a physics input** to volcano + island formation:

* convergent margins: arc volcanism from subduction-related melt (can be expressed via `meltFlux` tied to compression boundary zones)
* divergent margins: ridge/rift volcanism from extensional melt (melt flux tied to rift strain)
* plume volcanism: isolated/interior melt anomalies (classic hotspot chain)

**Gameplay may publish an overlay** derived from `meltFlux` for story/UX, but it is downstream-only:

* `gameplay.overlay.volcanic_hotspots` = *annotation derived from Foundation+Morphology*
* never consumed by Morphology

### B2 — Concrete Phase 2 edits implied

* Any mention of “HOTSPOTS overlay produced upstream” remains **allowed** as a Gameplay artifact, but **Morphology must not read it**.
* Any Morphology op signatures that include “hotspot signals” must be changed to “melt flux signals (Foundation).”

---

# C) Ocean basin separation is not a Morphology thumb; it’s a Foundation macrostructure outcome

The earlier Phase 2 doc treated “ocean separation / sea lane protection” as a Morphology-adjacent constraint. That’s the wrong abstraction.

### C1 — What we’re deleting

**Delete** the following concepts from Morphology modeling:

* “protected sea lanes / corridor masks” as Morphology inputs
* “ocean separation policy” that enforces a corridor by post-processing the landmask/bathymetry
* any config surface that looks like “keep this channel open” or “ensure an ocean band exists” at the Morphology layer

Those are all “thumb-on-scale” terrain edits that exist only because the underlying physics controls weren’t strong enough.

### C2 — What replaces it: Foundation “tectonic macrostructure” levers

If you want reliable “two major land groups separated by ocean,” you don’t force it in Morphology. You **bias plate initialization + kinematics** in Foundation so the separation is an emergent tectonic consequence.

**New Foundation-level (physics-first) macro knobs** (conceptual; exact schema is Phase 3):

1. **Plate field topology**

* `plateCount`
* `plateSizeDistribution` (few large vs many small)
* `continentalSeedCount` and `continentalSeedClustering`

  * controls whether continents cluster into 1–2 supercontinents vs disperse

2. **Mantle flow / stress field**

* `convectionCellCount` (macro patterning)
* `stressAnisotropy` (preferred compression/extension axis)
* `divergenceBelts`: optional specification of where extension tends to occur (e.g., one global belt that becomes a major ocean ridge)

3. **Supercontinent cycle phase (high leverage)**

* `supercontinentPhase: "assembly" | "dispersal" | "mixed"`

  * **assembly** biases convergence (collisions, mountains, fewer oceans)
  * **dispersal** biases divergence (rifts, new ocean basins, separated continents)
  * **mixed** yields Earth-like complexity

**Key point:** These knobs change *forces between plates*, not the terrain result directly.

### C3 — Where Morphology still plays a role (correctly)

Morphology still owns:

* hypsometry / sea level selection (how much of the elevation distribution is submerged)
* basin shaping as a *physical response* to crust type/age + vertical motion
* coastline/shelf structure as a *physical derivative* of bathymetry + erosion

But Morphology does **not** “guarantee” an ocean corridor with a special-case mask. If the game wants a “Distant Lands” experience, Gameplay selects distant lands from **landmass decomposition** (see below), not from a forced corridor.

---

# D) Landforms must be pure physics derivatives (no Gameplay influence)

This addendum locks the causality for mountains, volcanoes, and island chains:

### D1 — Mountains (pure compression + uplift)

Mountains arise from:

* **compressional strain rate** (boundary convergence)
* **vertical motion rate** (uplift) and crust buoyancy (isostasy)
* erosion/diffusion history (world age)

No story corridor, no overlay, no “place range here.”

### D2 — Volcanoes (pure melt + regime)

Volcano placement arises from:

* `meltFlux` (mantle plume + rift melt + subduction arc melt)
* regime classification (convergent/divergent/transform)
* local topography (prefer vents near rifts, arcs inland of trenches, etc.)

No “hotspot overlay” inputs.

### D3 — Island chains (pure plume/arc/ridge + sea level)

Islands arise from:

* volcanic construction above sea level (melt flux + time + plate motion)
* ridge building (divergent boundary uplift)
* subduction arcs (convergent boundary volcanism)
* sea level threshold

No “hotspot seeds” from story. If Gameplay wants to *label* island chains, it derives it after the fact.

---

# E) Concrete patch list: what to change in the Phase 2 Morphology document

This is the minimum set of edits needed to eliminate legacy creep without rewriting the whole document again.

### E1 — Section 3.2 “Inputs” (SUPERCEDES)

**Delete**:

* “Overlay constraints (optional): protected corridors / sea lanes (from Narrative overlays)…”

**Replace with:**

* “Morphology consumes only Foundation tectonic/material drivers + environment geometry + author config. No Gameplay/Narrative overlays are valid Morphology inputs.”

### E2 — Section 3.4 “Causality spine” (SUPERCEDES)

**Edit these bullets:**

* Remove “enforce coastal constraints (e.g. protected sea lanes)”
* Remove “using signals like hotspots” in landform accents

**Replace with:**

* Coast structuring is driven by bathymetry gradients + wave exposure proxy + lithology + erosion (all physics-derived).
* Landform accents consume only physics signals (strain regime + meltFlux + crust type/age).

### E3 — Section 6 “Contract matrix” (SUPERCEDES)

**Delete** any mention of:

* `artifact:storyOverlays` as an input to Morphology
* “data-only protection masks passed in”
* “Morphology-owned overlays” (corridors/rifts/deltas) as outputs

**Replace with:**

* Morphology outputs only physical artifacts/buffers (topography, routing, substrate, landmasses, coastline metrics).
* Gameplay overlays exist, but are downstream-only and never flow back into physics.

### E4 — Section 7 “Op catalog” (SUPERCEDES)

Update op input language:

* `plan-island-chains`: replace “tectonic/hotspot signals” with “meltFlux + regime signals (Foundation)”
* `plan-volcanoes`: explicitly consumes `meltFlux` rather than “hotspotWeight” semantics
* Remove any “coast protection masks from overlays” rule family entirely.

### E5 — Section 8 “Legacy disposition ledger” (SUPERCEDES)

* Mark `oceanSeparation.*` as **kill in Morphology** (or “migrate to Foundation” if you want to keep compatibility for author UX).

  * In Morphology, it must not exist as a direct terrain-shaping rule.
* Any `hotspot*` fields inside Morphology config:

  * migrate → rename to melt/plume scaling terms *only if still needed*
  * otherwise kill if it is just an implicit “make hotspots happen” knob

### E6 — Section 12 “Decisions & defaults” (SUPERCEDES)

* Remove any phrasing implying Morphology will “consume hotspots input provided by Gameplay/Narrative.”
* Replace “Ocean separation as basin shaping” with:

  * “Foundation macrostructure biases produce separated basins; Morphology expresses them; Gameplay chooses distant lands based on landmasses.”

---

# F) Cross-domain implications (system changes required)

This addendum forces two model-level changes outside Morphology:

### F1 — Foundation must own *all* “macro layout” controls

If we remove Morphology corridor hacks, Foundation must provide:

* a controllable plate/mantle system that can produce:

  * 1–2 large land clusters
  * meaningful ocean basins between them (when desired)
  * plausible ridge/trench systems
* and a clean set of *physics fields* that Morphology can consume:

  * `strainRegime` or `strainRate` (compression/extension/shear)
  * `verticalMotionRate` (uplift/subsidence)
  * `meltFlux` (plume + ridge + arc melt)
  * `crustType`, `crustAge` (buoyancy + bathymetry aging)

### F2 — Gameplay “Distant Lands” must be a projection of landmasses, not a forced ocean lane

Gameplay should decide “homelands vs distant lands” by:

* selecting landmass sets (or regions within landmasses) derived from `morphology.landmasses`
* stamping engine-required LandmassRegionIds as a downstream apply/projection
* without requiring Morphology to guarantee a specific ocean corridor

This is *simpler*, more robust, and doesn’t compromise physics.

---

# G) Guardrails to prevent future legacy creep

Add these to the Phase 3 guardrail plan (but they are modeling constraints now):

1. **Static contract rule:** No Morphology step contract may require any Gameplay overlay artifact.
2. **Op signature rule:** No Morphology op may accept “overlay” inputs (even data-only masks).
3. **Import rule:** Morphology domain code must not import from Gameplay domain modules.
4. **Naming rule:** “hotspot” is reserved for Gameplay overlay *labels only*. Physics uses `meltFlux/plume` terminology.
5. **Config rule:** Any “ocean separation” knob must live in Foundation macrostructure (or be eliminated entirely). Morphology does not contain it.

---

## Summary (what changes, definitively)

* Morphology **does not read hotspots, corridors, or any overlay**—not even “data-only masks.”
* “Hotspots” become a **physics field** (`meltFlux/plumes`) owned by Foundation. Gameplay can annotate them, but Morphology never consumes overlays.
* “Ocean basin separation” is removed as a Morphology thumb-on-scale feature. It becomes an emergent property of Foundation macrostructure (plate init + kinematics), and Gameplay uses landmass projections to satisfy Civ7’s two-slot logic.
* Mountains/volcanoes/islands are strictly **physics derivatives**: strain regime + uplift/subsidence + melt flux + sea level + erosion history.

If you want, I can also produce a very small “diff checklist” formatted exactly as “replace this paragraph with that paragraph” for each affected Phase 2 section, but the above is the canonical correction.
