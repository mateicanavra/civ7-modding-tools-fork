# Foundation Realism (M11) — Polar caps as plates

Primary spike: `../spike-foundation-realism-gaps.md`

This doc deep-dives the polar policy area (no latitude override; polar caps participate as plates/boundaries; all regimes available), including the open questions and recommended physics-first direction.

## Scope (this area only)

- Remove polar regime injection and replace it with a plate policy that makes polar rims emerge from kinematics + geometry.
- Ensure all regimes (compression/extension/transform) are available for polar boundaries.
- Eliminate one-tile (or few-tile) polar belts by fixing projection/regime propagation posture (policy-driven kernels, not hard distance caps).

Relevant current code touchpoints:
- Polar regime injection today:
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`
- Regime propagation cap today (root cause of thin belts in projection):
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts`

## Q6) Polar transform boundary semantics: tangential motion vs azimuthal shear?

Question: “What does ‘polar transform boundary’ mean in our model: tangential polar motion, or azimuthal shear between polar cap and subpolar plates?”

### Alternative A — Tangential polar plate motion (cap rotates, boundary is ring shear)
- Behavior
  - A polar cap plate has dominant angular velocity around the pole, causing a transform-dominant ring boundary.
  - Produces a broad shear belt with pull-apart basins and segmented ridges (downstream-friendly).
- Modeling
  - Plate kinematics policy lives in the partition/plate graph op strategy:
    - `polarCaps: { mode: "tangential", angularSpeed, capFraction }`
  - `foundation/compute-tectonic-history` (or tectonics op) decomposes strain into compression/extension/shear based on boundary normal vs relative motion.
- Implementation
  - Replace latitude injection:
    - Delete edge-band override in `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`.
  - Ensure plate graph includes polar plates with tangential velocities:
    - update `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/*` (or a new partition op).

### Alternative B — Azimuthal shear between cap and subpolar plates (relative-motion-derived; no special velocity)
- Behavior
  - Polar “transform” emerges when subpolar plates have opposing azimuthal components; the cap itself can be slow.
  - More emergent but less reliable for consistently “alive” polar rims.
- Modeling
  - No dedicated polar kinematics; rely on global plate motion field plus boundary geometry.
  - Polar transform is a classification outcome from relative motion, not a policy.
- Implementation
  - Similar injection removal in `compute-tectonics`, but with fewer changes in `compute-plate-graph`.

### Alternative C — Mixed transpression/transtension belt (shear + compression/extension coupling by latitude)
- Behavior
  - The polar ring alternates between transpressional and transtensional segments, producing more varied ridges/basins.
- Modeling
  - Still policy-free at the artifact boundary: expose strain decomposition fields; let downstream choose how to render “mixed belts”.
- Implementation
  - Requires computing and publishing directionality/strain components (see Q5/Q2).

### Recommendation

Choose **Alternative A (tangential polar plate motion)**.

- It yields a reliable, physics-plausible “polar rim is alive” baseline without latitude overrides, while still being a driver (motion), not an output clamp.
- It naturally produces ring shear belts that downstream domains can interpret into varied morphology/hydrology signals.

---

## Q7) Polar plates: one per hemisphere or multiple microplates?

Question: “Do we need one polar plate per hemisphere, or multiple polar microplates for variety?”

### Alternative A — One polar plate per hemisphere (simple, stable)
- Behavior
  - Clean ring boundary; easier to reason about; fewer seams.
- Modeling
  - Partition/plate graph strategy includes exactly two polar plates with configurable `capFraction`.
- Implementation
  - Implemented primarily in plate partition / plateGraph generation.

### Alternative B — 2–4 microplates per pole (variety, segmentation)
- Behavior
  - Polar boundary becomes segmented; avoids long, uniform belts; introduces micro-rifts and stepped arcs.
- Modeling
  - Partition strategy parameter: `polarMicroplatesPerHemisphere: 0 | 2 | 3 | 4`
  - Rules ensure microplates remain within the cap and do not create one-tile slivers (driver constraints, not output clamps).
- Implementation
  - Changes in plate partitioning:
    - seed multiple polar sites in mesh space in `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/*` or a new `compute-plate-partition`.
  - Validation tests for “no polar slivers” and minimum plate area.

### Alternative C — Conditional microplates: only when global plate count is high enough
- Behavior
  - Small maps remain stable (one cap plate), large maps get variety (microplates).
- Modeling
  - Compile-time normalization sets microplate count based on derived plate count and map size.
- Implementation
  - Implement in `step.normalize` (compile-time), consistent with compile-first posture.

### Recommendation

Choose **Alternative C (conditional microplates)**, with a default of “one per hemisphere” on small maps and “2–3 per pole” on larger maps.

- It’s maximal in outcome quality (variety) while still respecting constraints: this is a driver policy chosen at compile-time, not a runtime clamp.
- It avoids over-fragmenting small maps and reduces the risk of microplate slivers.

