# Debate Scratchpad — Long-Term Lens (Agent LT)

This scratchpad is owned by Agent LT.

## Position

Compromise: lock the *artifact taxonomy + ownership boundary now*, but allow a short-lived transitional adapter layer so Morphology can keep moving while we harden interfaces.

Concretely: Morphology (Physics) must produce only “truth” artifacts (continuous fields / topology / physically interpretable derived metrics) and must not emit engine-facing IDs/tags. Gameplay owns all discrete projections (terrain/feature/resource IDs, region IDs/tags, placements). Stamping remains exclusively in recipe steps via the engine adapter.

## Main Arguments (Long-Term)

- Boundary clarity compounds: once “terrain-ish” concepts leak into Physics outputs, they metastasize into shared helpers, hidden coupling, and later “big bang” refactors to untangle.
- Morphology is a foundational upstream domain: downstream consumers (Hydrology, Ecology, Placement, Gameplay) will multiply quickly. Stable truth artifacts become the “currency” of the pipeline; projections should be recomputable, versionable, and swappable without destabilizing Physics.
- Long-term scalability needs *orthogonality*: continuous truth fields can support multiple projection policies (different presets, balance modes, future expansions) without re-running expensive physics or forking Physics code paths.
- Stamping separation de-risks engine constraints: engine builder-step limitations (and Civ7’s specific E-W wrap, no N-S wrap) should live at the adapter/recipe edge; Physics should stay invariant across engine quirks.

## Main Risks (If We Enforce Too Rigidly, Too Fast)

- Premature categorization risk: during Morphology remodeling we may still be discovering which derived metrics are “physically meaningful” vs “gameplay semantics”; overly strict rules can force awkward abstractions and slow iteration.
- Churn risk: large-scale type/package reshuffles can dominate the remodel, creating a long-lived half-migrated state and developer fatigue (“ignore the boundary, ship anyway”).
- False certainty risk: if we pretend the engine adapter can already stamp *all* outcomes cleanly, we’ll encode brittle contracts that will be revised once engine realities bite.

## Compromise Boundary (Precisely Defined)

Locked now (hard rule):

- Physics (Morphology) outputs:
  - Scalar/vector fields and topology only (e.g., elevation/relief/slope/roughness, ridge strength, shelf depth, land/ocean mask, tectonic/plate fields if applicable).
  - No discrete Civ7 engine IDs and no “tile class” booleans like `isMountainTile`, `terrainType`, `featureId`, `resourceId`, `playerId`, `regionId`, `regionTag`.
  - Derived metrics are allowed if they are continuous and interpretable (e.g., “ruggedness”, “orogeny intensity”), even if later used by Gameplay projection.
- Gameplay projection:
  - The *only* place where truth → discrete classifications happen (terrain/feature/resource selection, region tagging, placements).
  - Projection functions should be deterministic, explicit about thresholds, and parameterized by preset/balance policy.
- Stamping:
  - Only recipe steps invoke the engine adapter and materialize the projection into engine data structures.

Allowed temporarily (explicitly transitional):

- A thin “projection shim” may exist to bridge old call sites while Morphology remodel lands, but it must live outside Physics and be easy to delete (one-way dependency; no Physics importing shim).
- Debug/visualization artifacts may include pseudo-labels, but they must be clearly namespaced as debug-only and must not be consumed by Gameplay logic.

Deferred (not locked yet):

- Exact module/package boundaries and enforcement mechanisms (lint rules, dependency graph constraints) beyond “no engine/gameplay imports in Physics” at the code level.
- The final shape of truth artifact schemas (field naming, normalization conventions, metadata/versioning), provided they remain truth-only.
- Any engine-driven derivations that can’t be expressed as clean stamping today (acknowledging engine API limitations); these should be isolated and documented, not normalized into Physics.

## Failure Modes to Watch For

- Ownership smearing: helper functions that “just compute terrain quickly” creeping into Physics because it’s convenient during remodel.
- Truth/projection conflation via naming: truth structs gaining fields like `terrain`, `biome`, `featureCandidates`, or “final” booleans; these are usually projections in disguise.
- Adapter inversion: recipe/stamping logic pushing requirements upstream (“Physics must output exactly the IDs the engine wants”) rather than adapting at the edge.
- Projection policy leakage: multiple presets/balance modes branching inside Physics (“if preset=… then slope threshold…”) instead of living in projection.
- Permanent transitional layer: the shim becomes a de facto API surface, and deleting it becomes politically/technically impossible.

## What To Do If Drift Appears

- Treat any discrete label in Physics outputs as a bug unless it is explicitly debug-only and non-consumed.
- If a downstream wants a discrete concept, add a continuous metric in Physics (if physically meaningful) and do the classification in Gameplay projection.
- If engine constraints force awkward stamping, isolate it in the adapter/recipe step and document it as an intentional compromise rather than reshaping Physics outputs to match engine quirks.
