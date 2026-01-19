## Addendum 01: Polar Boundary Tectonics (North/South Edges as Real Plate Boundaries)

### Problem statement

In the current map representation, the **north and south edges** are hard geometry boundaries. If treated as “where tectonics stop,” they produce pathological artifacts:

* mountain chains that terminate abruptly,
* dead zones (flat, uninteresting rims),
* drainage / erosion discontinuities,
* or visually arbitrary cutoffs that do not read as Earth-like geology.

For the Phase 2 Morphology model, we explicitly treat the **north and south edges as true tectonic boundaries**, not inert truncations.

---

### Conceptual model

#### Polar edges imply off-map plates

Treat each hard north/south edge as an interface between:

* the **in-bounds plate mosaic** (Foundation plates projected into the playable area), and
* a **notional off-map “polar plate”** (or plate set) that occupies the space beyond the playable area.

This “polar plate” is not simulated as a full extra region graph; it exists as a **boundary condition**.

#### The edge participates in tectonic regime classification

The north and south edges are modeled as boundary segments that participate in the same tectonic regime classification as interior plate boundaries:

* **convergent** → compression / uplift / subduction-style morphology
* **divergent** → extension / rifting / spreading-style morphology
* **transform** → shear / faulting-style morphology

The regime is **not story-driven** and not influenced by Gameplay overlays. It is a physics-domain rule governed by Morphology config + Foundation plate kinematics (if available) and is expressed through the same Morphology machinery (base-topography, substrate, erosion, volcano planning).

---

### Boundary policy modes

We introduce a polar boundary policy knob, conceptually:

* `polarBoundaryModeNorth: "transform" | "convergent" | "divergent"`
* `polarBoundaryModeSouth: "transform" | "convergent" | "divergent"`

Optionally, north/south can share a single `polarBoundaryMode` default and override per edge.

#### Common structure: “edge band”

Each edge boundary is expressed through an **edge influence band** of configurable width, `polarEdgeBandTiles` (e.g. 3–12 tiles). All edge effects are applied within this band via the same “boundary falloff” machinery used for in-map plate boundaries:

* strongest effects at the map edge,
* decaying smoothly into the interior,
* no hard, one-tile discontinuities.

#### Mode summaries (topography + volcanism + substrate)

| Mode           | Tectonic meaning at edge                                 | Primary topographic expression                                                                         | Volcanism expectation             | Substrate / erosion signature                                        |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------- | -------------------------------------------------------------------- |
| **transform**  | in-bounds plates shear past a massive off-map plate      | linear fault zone / rugged rim; localized pull-apart basins; **no continuous wall**                    | low to moderate (localized)       | fractured rock → **higher erodibility** and linear valleys           |
| **convergent** | in-bounds plates collide / subduct against off-map plate | **mountain arc** or uplifted rim parallel to edge; possible trench/bathymetry steepening offshore-side | **high** (subduction-arc chain)   | hardened/igneous belt → **lower erodibility**, high relief persists  |
| **divergent**  | in-bounds plate is pulling away from off-map plate       | rift/graben near edge; **spreading ridge** in bathymetry; tendency toward polar marginal seas          | moderate to high (rift volcanism) | young basaltic crust + sediment-starved slopes; moderate erodibility |

---

### Mode details (what “good” looks like)

#### 1) Transform mode (edge shear / fault boundary)

**Intent:** The edge behaves like a shear zone, not an impassable wall.

* **Base topography (`compute-base-topography`):**

  * Introduce a linear **fault belt** parallel to the edge: alternating modest uplift and subsidence (a “ragged seam”).
  * Allow occasional **pull-apart basins** (localized depressions) in the edge band.
  * Avoid continuous, high-amplitude uplift that reads as a mountain wall.

* **Substrate (`compute-substrate`):**

  * Mark fault belt tiles as **fractured** (higher erodibilityK) relative to stable interiors.
  * SedimentDepth tends to accumulate in pull-apart basins once erosion runs.

* **Volcano planning (`plan-volcanoes`):**

  * Default to **low density**; allow sparse localized volcanic features only if the underlying plate regime indicates volcanism (e.g., transform segments adjacent to a rift).

* **Geomorphic cycles (`compute-geomorphic-cycle`):**

  * Erosion should carve **linear valleys** and fault-aligned drainage, producing visually coherent “edge tectonic scars.”
  * Ensure no “cliff-to-nowhere” artifacts by using the same smoothing/diffusion logic used elsewhere.

**Result:** The polar rim reads as a tectonically active seam—rugged, faulted, and interesting—without forcing a continuous mountain barricade.

---

#### 2) Convergent mode (edge collision / subduction margin)

**Intent:** The edge becomes a meaningful orogenic belt, like a subduction margin or collision boundary.

* **Base topography:**

  * Generate a continuous **mountain arc** within the edge band:

    * maximum uplift near the boundary,
    * foothills tapering inward.
  * If bathymetry is modeled explicitly, apply a **steepening depth gradient** near the edge-water region (trench analogue) *only if the edge-adjacent area is ocean* (depends on landMask after sea level).

* **Substrate:**

  * Model the belt as more resistant lithology (lower erodibilityK) to preserve sharp relief.
  * Optionally increase uplift-linked sediment source potential (more sediment generation downstream).

* **Volcanism:**

  * Plan a **subduction-style volcanic arc** parallel to the boundary:

    * volcano chain offset slightly inland from the trench analogue (if ocean exists),
    * or aligned with the mountain belt if land dominates.

* **Geomorphic cycles:**

  * Erosion should carve deep, short basins draining away from the edge belt.
  * The belt should remain high (worldAge/erosion can round peaks but shouldn’t flatten the arc completely).

**Result:** A polar mountain rim option that produces believable convergent-margin geography—mountains + volcanism—rather than a random “top-edge cliff.”

---

#### 3) Divergent mode (edge spreading / rift boundary)

**Intent:** The edge represents extension: a rifted margin or spreading ridge at/near the boundary.

* **Base topography:**

  * Create a **rift trough / graben** near the edge on continental crust.
  * Encourage formation of **marginal seas** at the poleward edge by biasing seaLevel selection or local subsidence (still respecting global hypsometry rules).
  * For oceanic contexts, emphasize a **ridge analogue** in bathymetry: shallower depths adjacent to the boundary band, tapering into deeper ocean.

* **Substrate:**

  * Young crust analogue: moderate erodibilityK, low sedimentDepth initially.
  * Deposition should concentrate in the rift trough after erosion cycles.

* **Volcanism:**

  * Moderate to high **rift volcanism** within the edge band (linear volcanic features rather than isolated volcanoes).

* **Geomorphic cycles:**

  * Erosion should preferentially deepen rift valleys and produce inward-directed drainage.
  * Avoid “edge sinks” by giving the rift trough an interior outlet or a marginal sea connection depending on sea level.

**Result:** A polar-edge option that reads like a rifted boundary or polar spreading system, creating a distinctive “polar marginal sea / ridge” geography.

---

### Where this slots into the Morphology pipeline

This addendum does **not** introduce a new domain or any cross-domain coupling. It is an extension of existing Morphology steps:

1. **Tectonic regime classification (internal rule)**

   * Extend the regime classifier to treat the **north and south edges** as boundary segments.
   * The edge segment’s regime is selected from `polarBoundaryMode{North|South}`.

2. **`morphology/compute-substrate`**

   * Apply edge-regime-specific lithology/erodibility adjustments in the edge band.

3. **`morphology/compute-base-topography`**

   * Apply edge-regime-specific uplift/subsidence and bathymetry shaping within the edge band.

4. **`morphology/compute-sea-level` and `morphology/compute-landmask`**

   * Sea level remains global (hypsometry-driven), but can incorporate the polar edge shaping without special casing.
   * LandMask is derived normally (uplift → elevation → seaLevel → landMask).

5. **`morphology/plan-ridges-and-foothills` and `morphology/plan-volcanoes`**

   * Treat edge segments as eligible ridge/volcano sources according to the selected mode:

     * convergent → orogenic ridge + arc volcanism
     * divergent → rift ridge + rift volcanism
     * transform → sparse/secondary volcanism only

6. **`morphology/compute-geomorphic-cycle`**

   * Erosion/diffusion/deposition operates normally; the edge features are shaped the same way as any other boundary features.

7. **Routing consideration (minimal but important)**

   * Flow routing near hard edges must avoid “dead-end drainage” artifacts. Model-level provision:

     * treat the off-map beyond north/south as a **virtual sink** at sea level (or as a continuation of bathymetry for ocean tiles), so runoff can “exit” the map consistently when appropriate.
     * This is not a separate hydrology feature; it’s simply a boundary condition for `compute-flow-routing` so that drainage basins remain well-defined.

---

### Config sketch (optional; keeps semantics explicit)

If helpful for concreteness, this can be represented as a small Morphology config surface:

```ts
interface MorphologyAuthorConfig {
  boundaries?: {
    polar?: {
      north?: { mode: "transform" | "convergent" | "divergent"; intensity?: number; bandTiles?: number };
      south?: { mode: "transform" | "convergent" | "divergent"; intensity?: number; bandTiles?: number };
      // Defaults applied if north/south omitted.
      defaults?: { mode: "transform" | "convergent" | "divergent"; intensity: number; bandTiles: number };
    };
  };
}
```

**Determinism & identity semantics:**

* Mode defaults are applied by schema/defaulting (no presence-gating at runtime).
* “Missing north/south overrides” means “use defaults,” not “fallback to hidden behavior.”

**Recommended default (if you want the least visually disruptive baseline):**

* `mode: "transform"` with moderate intensity and a narrow band.
  This tends to avoid creating a polar mountain wall unless explicitly requested.

---

### Guardrails (model-level)

* **No dead zones:** Edge bands must never default to flat, featureless terrain solely because they are at the boundary. Every tile in the edge band participates in a tectonic regime.
* **No discontinuities:** Uplift/subsidence and substrate changes taper smoothly inward; no one-tile cliffs unless slope/aspect legitimately demands it.
* **No story hacks:** No overlays, no Gameplay influence. Edge behavior is purely Morphology physics + config.
* **No special-case volcanism:** Volcano placement at edges is a natural consequence of convergent/divergent regimes (arc vs rift volcanism), not a one-off “if near edge then add volcano” hack.

---

This addendum can be appended to the Phase 2 Morphology modeling document under “Decisions & defaults” (as a locked modeling decision) and referenced in the op catalog as an extension to the tectonic regime classifier used by `compute-substrate`, `compute-base-topography`, and landform planning ops.
