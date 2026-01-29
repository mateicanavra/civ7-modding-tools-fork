# Foundation Improvement Proposal (Prose-First)

> **Scope:** Foundation domain (mesh → crust → plates → tectonics → projection → topology) and its authoring surface.
> **Goal:** Higher realism and control with fewer confusing knobs, while preserving deterministic, mesh-first semantics.

## Executive Summary

The current Foundation pipeline is powerful but leans on heuristic algorithms and exposes a large set of knobs that are easy to misuse. This proposal introduces a **physics-informed, author-friendly control model** and a set of algorithm upgrades for each stage. The intent is to:

- Improve **geologic realism** (coherent continents, plate motion, and tectonic history).
- Give authors **meaningful, high-leverage controls** (plate cohesion, motion variance, continent sizing) while hiding internal or derived values.
- Keep the pipeline **deterministic and mesh-first**, with explicit projection artifacts for consumers.

Each section below follows the requested format: the original issue, a proposed design, downstream effects, and the improvements to realism/authoring/robustness.

---

## 1) Mesh Resolution & Scaling

### Original problem / poor solution
- Mesh sizing uses reference-area scaling plus derived plate/cell counts. This creates an extra layer of configuration the author often cannot reason about and can easily misconfigure (e.g., incorrect `referenceArea` or `cellsPerPlate`).

### Proposed design
**Replace `referenceArea` and `plateScalePower` with a single author-facing “resolution profile.”**

- **New author knob:** `foundation.resolutionProfile` (enum)
  - `"coarse" | "balanced" | "fine" | "ultra"`
- **Derived constants (internal):**
  - `cellDensityPerTile`: derived from profile (e.g., 0.3, 0.6, 1.2, 2.0)
  - `targetPlateDensity`: derived from profile
- **Algorithm:**
  - `cellCount = round(width * height * cellDensityPerTile)`
  - `plateCount = round(width * height * targetPlateDensity)`

### Downstream enablement
- More consistent mesh density across map sizes.
- Authors set intent (detail level) rather than an opaque formula.

### Improvements
- **Author experience:** one obvious knob replaces multiple interdependent ones.
- **Robustness:** less risk of invalid combos (e.g., tiny maps with too many plates).

---

## 2) Crust Generation (Continents, Age, Buoyancy)

### Original problem / poor solution
- Continents are seeded via pseudo-plates and frontier expansion. Crust age and base elevation are tied to distance-from-boundary heuristics that do not reflect any tectonic history.

### Proposed design
**Introduce a “Crust Assembly Phase” that combines craton seeding with plate-history-informed rifting and accretion.**

1. **Craton seeds** (author-controlled):
   - `cratonCount` (low cardinality knob) and `cratonSizeBias` (0..1).
2. **Rift/accretion field generation**
   - Use a pre-plate “proto-tectonic field” (simple vector noise + distance-to-craton) to define likely rifting corridors.
3. **Crust age evolution**
   - Age increases from craton cores outward, but is *reset* or *lowered* along rift corridors.

**Algorithmic approach:**
- Use a multi-source distance field from craton seeds to define **age baseline**.
- Superimpose a low-frequency divergence field to define **rift bands** (reduce age, reduce strength).
- Derive buoyancy/base elevation from age + crust type (subduction-like cooling curve approximations).

### Downstream enablement
- Coherent continental cores with younger margins.
- Rift corridors align with later tectonic uplift/rift potential, creating realistic continent shapes.

### Improvements
- **Realism:** age/strength respond to tectonic history proxies rather than random adjacency.
- **Author control:** craton count/size are understandable and impactful.
- **Robustness:** fewer emergent artifacts (e.g., incoherent salt-and-pepper crust).

---

## 3) Plate Graph & Motion (Kinematics)

### Original problem / poor solution
- Plate motion vectors are randomized, which makes it hard to produce coherent global tectonic behavior.
- Authors lack a “global character” control (e.g., convergent vs divergent worlds).

### Proposed design
**Introduce two layers: a global motion policy + optional per-plate overrides.**

**Author controls:**
- `plateMotionPolicy` (enum):
  - `"cohesive" | "dispersive" | "shearing" | "balanced"`
- `plateMotionVariance` (0..1)
- `plateOverrides` (optional list): explicit vectors for a handful of named plates (e.g., a stable supercontinent plate).

**Algorithm:**
- Sample plate velocities from a global vector field whose divergence/curl is controlled by policy.
  - `cohesive`: low divergence, mild rotation around a global centroid.
  - `dispersive`: higher divergence, outward drift.
  - `shearing`: high curl (rotational motion), lower divergence.
- Apply per-plate overrides last if provided.

### Downstream enablement
- Coherent tectonic boundary regimes that align with world “personality.”
- Allows scenario design: supercontinent breakup, poleward drift, or shear-dominant worlds.

### Improvements
- **Author experience:** high-level intent knobs with optional precision control.
- **Realism:** consistent plate dynamics, less random-looking boundary patterns.

---

## 4) Plate Partitioning (Boundaries)

### Original problem / poor solution
- Weighted flood fill uses crust resistance but boundaries can still cut through cratons or oceans in ways that feel arbitrary.

### Proposed design
**Use a “resistance field” that combines crust type, age, and rift corridors.**

- Resistance is **high** in old continental cores.
- Resistance is **low** in rift bands and young oceanic crust.
- Plate seeding is biased toward stable regions; plate growth respects resistance via Dijkstra.

### Downstream enablement
- Plate boundaries prefer oceanic zones or rift corridors, producing more realistic margins.

### Improvements
- **Realism:** plate boundaries align with plausible tectonic weaknesses.
- **Robustness:** fewer pathological plate shapes.

---

## 5) Tectonic Segments & Regimes

### Original problem / poor solution
- Boundary regimes are chosen by max intensity of compression/extension/shear, which can flip regimes noisily.

### Proposed design
**Introduce a “regime classifier” that uses vector geometry and crust pairing.**

- Compute boundary-normal and tangential components as today.
- Add a *regime confidence* score using the ratio of normal vs tangential motion.
- Stabilize regime labels via hysteresis: boundaries keep their prior regime unless a stronger condition overrides.

### Downstream enablement
- More consistent convergent/divergent/transform belts that do not flicker.

### Improvements
- **Realism:** continuous regimes along plate boundaries.
- **Simplicity:** a single regime confidence threshold for authors.

---

## 6) Tectonic History (Eras)

### Original problem / poor solution
- Fixed 3-era diffusion with exponential decay is a blunt approximation and not configurable.

### Proposed design
**Introduce variable era counts and a “history profile” knob.**

- `historyProfile`: `"young" | "balanced" | "ancient"`
  - young: more weight to recent era
  - ancient: heavier cumulative uplift
- `eraCount` derived from profile (e.g., 3, 5, or 7)

**Algorithm:**
- Use era weights that sum to 1 and drift steps scaled by plate speeds.
- Allow authors to choose whether cumulative uplift is linear or saturating (sigmoid).

### Downstream enablement
- Better separation of ancient shields vs young orogeny in morphology.

### Improvements
- **Realism:** more plausible long-term uplift histories.
- **Author control:** simple profile knob with predictable outcomes.

---

## 7) Tectonic Evolution as the Primary Driver (Era-Resolved Outputs)

### Original problem / poor solution
- The current Foundation output exposes only the latest-era tectonic fields plus a few cumulative totals. Downstream morphology cannot easily consume per-era masks or reason about *which* era drove uplift, subduction, or volcanism.
- Plate motion is computed, but plate evolution is not explicitly tracked in a way that downstream steps can use to differentiate old vs new terrain formation.

### Proposed design
**Introduce an “Era Evolution” sub-pipeline that produces explicit per-era masks and plate kinematic history tensors.**

**Key additions:**
1. **Era-resolved boundary masks**  
   - `tectonicHistory.eras[e].boundaryType` already exists; extend each era with explicit masks for `convergentMask`, `divergentMask`, `transformMask`, and `subductionPolarity` for that era.
2. **Era-resolved force fields**  
   - Keep `upliftPotential`, `riftPotential`, `shearStress`, `volcanism`, `fracture` per era; expose them as authoritative inputs for morphology.
3. **Plate advection history (optional, bounded)**  
   - Introduce a *lightweight advection* step that moves per-plate “tracer indices” across the mesh by following plate velocity vectors for a limited number of steps per era.  
   - This does **not** need to be a full physical simulation; it’s a controlled, deterministic remap that allows per-era “where was this cell in era N” reasoning.

**Algorithmic outline:**
- For each era `e`:
  1. Generate plate velocities (per motion policy).
  2. Compute boundary segments and regime classification.
  3. Diffuse boundary effects into per-era tectonic tensors (as today).
  4. Optionally advect a *tile tracer index* (nearest-cell mapping updated by era-specific plate drift).

### Downstream enablement
- Morphology can use `tectonicHistory.eras[e]` as **layered masks** for mountains, hills, or volcano placement (e.g., older eras yield eroded mountains, newer eras yield sharper relief).
- The optional advection provides a way to identify regions that moved into/out of collision zones across eras without simulating full tectonic reconstruction.

### Improvements
- **Realism:** derived landforms can reflect age-specific tectonic drivers rather than only the newest snapshot.
- **Author control:** authors can choose how many eras matter (e.g., only last 2 vs full history).
- **Robustness:** the system remains deterministic and bounded (no unbounded drift).

---

## 8) Projection to Tiles

### Original problem / poor solution
- Current nearest-cell search is O(tiles × cells), expensive and non-interpolated.

### Proposed design
**Use spatial indexing and optional barycentric weighting.**

- Precompute a KD-tree (or bin grid) for mesh sites.
- Optionally smooth projection using a weighted average of nearest 3–4 cells.

### Downstream enablement
- Faster generation and smoother plate/crust signals in tile space.

### Improvements
- **Performance:** reduces runtime on larger maps.
- **Realism:** less “blocky” boundary artifacts on tile grid.

---

## 9) Authoring Surface Simplification

### Original problem / poor solution
- Too many knobs are exposed that are either derived or tightly coupled.

### Proposed design
**Refactor authoring knobs into 3 tiers:**

1. **High-level knobs** (author-facing, stable):
   - `resolutionProfile` (coarse → ultra)
   - `continentProfile` (small/islands/earthlike/supercontinent)
   - `plateMotionPolicy` (cohesive/dispersive/shearing/balanced)
   - `historyProfile` (young/balanced/ancient)

2. **Advanced knobs** (power users):
   - `cratonCount`, `cratonSizeBias`
   - `plateMotionVariance`
   - `riftBandStrength`

3. **Internal constants** (hidden):
   - `referenceArea`, `plateScalePower`, raw decay constants, etc.

**Key rule:** If a value is derived from map dimensions or a profile, it is not author-facing. All derived values must be explicit constants defined in code (no magic numbers).

### Downstream enablement
- Cleaner pipeline configuration; easier to explain and maintain.

### Improvements
- **Author experience:** fewer footguns, more intentional control.
- **Robustness:** configuration remains consistent across map sizes.

---

## 10) Optional “Scenario Authoring” Mode

### Original problem / poor solution
- No easy way to predefine plate motion vectors without fully manual configuration.

### Proposed design
**Add a compact scenario mode:**

```json
{
  "plateMotionScenario": {
    "mode": "supercontinent-breakup",
    "seedPlateId": 3,
    "spreadAngleDeg": 220,
    "variance": 0.2
  }
}
```

- This mode generates a structured velocity field (e.g., radial dispersion) for plates in that scenario.

### Downstream enablement
- Authors can build narrative maps (e.g., Pangea-like breakup) without manual vector specification.

### Improvements
- **Author experience:** high leverage; minimal configuration.
- **Realism:** structured global motion fields are more coherent.

---

## 11) Implementation Notes & Guardrails

- All new knobs should be documented in `docs/system/libs/mapgen/foundation.md` and the relevant recipe configuration reference.
- Use deterministic RNG labels for new steps to preserve reproducibility.
- Keep mesh-first contracts intact; tile projections remain a derivative for morphology.

---

## Summary of Expected Outcomes

| Outcome | Impact |
|--------|--------|
| Clear authoring surface | Easier to tweak maps without accidentally breaking scale | 
| Plate dynamics control | Ability to guide cohesion, dispersion, or shear | 
| Improved crust realism | Continents are more coherent and geologically plausible | 
| Better tectonic history | Distinguishes ancient shields vs young uplift | 
| Faster projection | Scales better for large maps |

---

## Next Steps (Suggested)

1. Add `Era Evolution` outputs (era masks + per-era force fields) to the Foundation artifacts and recipe contracts.
2. Update morphology to optionally consume per-era tensors when generating mountains/hills/volcanoes (fallback to latest-era if disabled).
3. Prototype a bounded advection pass and validate determinism + performance on small/medium maps.
4. Add authoring schema updates for the new profiles and deprecate derived knobs.
5. Prototype crust assembly and motion policy in a feature branch with visual diagnostics.
6. Validate via morphology landmass outputs on small/medium/large maps.
