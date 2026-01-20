# Balanced lens: enforce boundaries, not bureaucracy (compromise)

## Position

Compromise: enforce a **hard artifact boundary now** (what Physics is allowed to output / consume), but **defer a rigid module/package split** until Morphology remodel stabilizes. This keeps conceptual cleanliness and prevents “engine enums leaking upstream”, without forcing a large refactor that slows delivery.

## Concrete compromise plan

### 1) Exact boundaries (what lives where)

**Physics (Morphology as a Physics domain) produces “truth artifacts” only:**
- Deterministic, engine-agnostic fields over a defined map topology/grid.
- Examples: continuous/scalar fields and masks like `elevation_macro`, `slope`, `roughness`, `landmask`, `ridge_strength`, `shelf_depth`, `coast_distance`, `orogeny_stress`, “is_mountain_candidate”.
- Allowed: map topology details that are **world facts for Civ7** (wrap east–west, no wrap north–south) as part of the coordinate/adjoinment model; no “wrap knobs”.

**Gameplay owns “projection artifacts”:**
- Discrete classifications and intent that encode *player-facing semantics* and game rules.
- Examples: `TerrainClass`/biome/feature intents, threshold policies (e.g., “mountain if slope > X”), and any balance-oriented heuristics (“more mountains near starts”, “ensure X% plains”).

**Stamping lives only in engine-adapter recipe steps:**
- The adapter takes a projection and applies it to Civ7 engine constructs via the available APIs (including calling engine-side processes like `TerrainBuilder.buildElevation()` when required).
- Stamping may incorporate engine constraints/quirks, but must not back-propagate engine IDs/enums into Physics truth.

### 2) Braiding: how we keep throughput during remodel

During Morphology remodel, allow a **single “braided” execution pass** that produces both:
- `MorphologyTruth` (Physics-owned, stable contract)
- `MorphologyDerivedTruth` (still Physics-owned): convenience derivations needed by downstream physics domains (Hydrology/Ecology) that are *not* gameplay semantics (e.g., “flow barriers”, “basin candidates”, “rain-shadow potential”).

Do **not** allow “braided” to emit gameplay projections or engine identifiers; those must be created in a later phase.

This lets us keep pipelines running while we progressively lift gameplay classification out of Morphology.

### 3) What artifacts are forbidden vs allowed

**Forbidden in Physics outputs (hard rule now):**
- Civ7 engine enums/IDs, tags, database row names, terrain/feature/resources as engine-facing identifiers.
- “Player-facing” balancing constraints (“ensure 2-ring workable”, “start bias”).
- Any logic that assumes engine internal elevation/fractal implementation details as part of truth (see DEF-001).

**Allowed in Physics outputs:**
- Tile/grid sampling of truth **as measurement**, not as gameplay classification (e.g., “sampled elevation macro per tile” is OK; “tile terrain type is Grassland” is not).
- Topology facts: E–W wrap adjacency is part of world geometry for Civ7 maps.
- Multiple representations of the same truth at different resolutions, as long as they’re derived deterministically from truth + config/seed.

**Allowed in Gameplay projections:**
- Thresholds, bucketing, rule-of-thumb classifications, and “intent maps” that are explicitly about what the player should see / rules should treat as X.
- Any transforms that deliberately sacrifice fidelity for readability/balance.

**Allowed in stamping:**
- Lossy mapping from projection to engine constraints, including “call `buildElevation()` once” style hybridization (DEF-001), provided the projection remains engine-agnostic and stamping contains the engine coupling.

### 4) Where stamping lives (and where it must not)

- Stamping steps live in the Civ7 adapter “recipe” layer (the step sequence that applies a map to the engine).
- Morphology (Physics) may expose helper functions for sampling truth, but must not import/know adapter types or call engine APIs.

## Risks and mitigations

### Risk: “Truth” vs “projection” boundary becomes contentious in edge cases
Mitigation:
- Use the simple litmus test: if a value is defined by **player-facing semantics or balance**, it’s projection; if it’s **measurement/geometry**, it’s truth.
- When ambiguous, treat as projection by default (safer; keeps Physics clean).

### Risk: Short-term friction moving classification out of Morphology
Mitigation:
- Keep “DerivedTruth” as a sanctioned compromise output for downstream physics consumers.
- Add minimal shims so downstream code can transition from “terrain type” to “truth + policy”.

### Risk: Engine limitations make “pure truth” feel pointless (DEF-001 elevation mismatch)
Mitigation:
- Accept and document that some truth can’t be stamped 1:1 (no `setElevation`), but keep **macro truth** valuable for structure, rivers, climate, and narrative overlays.
- Treat engine elevation/fractals as part of stamping/projection fidelity, not Physics truth.

### Risk: Over-engineering the split slows Morphology remodel
Mitigation:
- Make the “hard rule” only about **artifact contents** (no engine/gameplay leakage), not about package boundaries yet.
- Defer package-level reshuffle until after Morphology remodel surfaces stable interfaces.

## Decision rubric: what pushes us toward rigidity vs deferral

### Push toward enforcing a rigid split *now*
- Morphology remodel already requires touching most call sites, so marginal cost of moving modules is low.
- We see repeated regressions from engine identifiers creeping into Physics artifacts.
- Downstream domains (Hydrology/Ecology/Placement) are being blocked by unclear ownership of “what is truth”.
- We can define stable contracts for `MorphologyTruth` and `GameplayProjection` with tests in place.

### Push toward deferring rigidity (keeping the compromise)
- Morphology remodel is still exploring representations (high churn), making early package boundaries brittle.
- The adapter constraints (e.g., DEF-001 elevation mismatch) mean we’ll iterate on stamping semantics anyway.
- There’s a near-term delivery milestone that depends on Morphology outputs staying mostly stable.
- We lack test harness coverage to confidently refactor the pipeline end-to-end.

### Practical “go/no-go” check
- If we can express **all current Morphology outputs** as either `Truth` or `Projection` without losing necessary data, enforce the artifact boundary immediately.
- If we cannot, allow temporary `DerivedTruth`, but require a written list of what’s in it and why (so it doesn’t become a dumping ground).
