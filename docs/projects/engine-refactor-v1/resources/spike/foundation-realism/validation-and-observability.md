# Foundation Realism (M11) — Validation + observability

Primary spike: `../spike-foundation-realism-gaps.md`

This doc deep-dives the “realism invariants” and “feel metrics” area: what we can validate without rendering, what to trace, and what metrics catch regressions (especially “mountain walls”).

## Scope (this area only)

- “Realism invariants” that are testable without rendering.
- Trace payloads that make it easy to spot regressions (ASCII + numeric summaries).
- Explicit metrics to catch “mountain wall” outcomes and “noise-first drift” between Foundation drivers and Morphology outputs.

Relevant current code touchpoints:
- Foundation step traces:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts`
- Existing tests (Bun):
  - `mods/mod-swooper-maps/test/foundation/*`

## Q8) Validation invariants: what can we test without rendering?

Question: “What are the ‘realism invariants’ we can test without rendering (plate size distribution, boundary length distribution, continental clustering, etc.)?”

### Alternative A — Statistical distribution invariants (range assertions)
- Behavior
  - Tests don’t care about exact shapes, only distributions.
- Modeling
  - Add a small “metrics ruleset” library (pure functions) that takes truth artifacts and returns summaries:
    - plate area distribution stats (Gini, P90/P50, min area fraction)
    - boundary length per regime distribution (counts/lengths)
    - continental clustering: adjacency-based clustering score in mesh or tiles
  - Tests assert ranges per preset/knob band, not exact numbers.
- Implementation
  - New metrics helpers in a neutral place (e.g. `packages/mapgen-core/src/lib/metrics/*` or domain-local if truly Foundation-specific).
  - Tests in `mods/mod-swooper-maps/test/foundation/*` call the ops directly (as existing tests do).

### Alternative B — Topological and geometric invariants (hard correctness properties)
- Behavior
  - Tests enforce “things that must never happen”:
    - no plate IDs outside range
    - no one-tile polar belt artifacts
    - regime propagation width > 2 tiles for major belts
    - wrap seam connectivity preserved
- Modeling
  - Model invariants as pure “checks” over artifacts (not steps).
- Implementation
  - Extend existing tests:
    - `mods/mod-swooper-maps/test/foundation/m11-projection-boundary-band.test.ts` (replace the 2-tile regime cap assumptions)
    - Add new tests using `buildPlateTopology` for plate adjacency constraints.

### Alternative C — Snapshot-based invariants (golden metrics per seed)
- Behavior
  - Lock in a small suite of seeds and record metric snapshots; diffs catch regressions.
- Modeling
  - Treat snapshots as a validation artifact of the repo (not runtime artifacts).
- Implementation
  - Add a “metrics snapshot” test file; keep snapshots small and numeric (not giant grids).

### Recommendation

Choose **A + B combined**:

- Use **hard invariants** for correctness/topology constraints (wrap, no slivers, determinism).
- Use **distribution invariants** for realism (plate sizes, belt widths), keeping thresholds wide and driver-oriented.

---

## Q9) “Feel” metrics: what do we log as traces?

Question: “What ‘feel’ metrics do we want to log as traces (ASCII summaries already exist for some tensors)?”

### Alternative A — ASCII grids for key drivers (today’s posture, expanded)
- Behavior
  - Developers can visually inspect belts/crust at a glance without rendering.
- Modeling
  - Trace events emitted by steps only (effect boundary posture), e.g.:
    - boundary regime (`foundation.plates.ascii.boundaryType` exists today)
    - uplift/fracture/volcanism bands (compressed into a few characters)
- Implementation
  - Expand `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts` trace set.
  - Keep sampling via `computeSampleStep` + `renderAsciiGrid` as in existing code.

### Alternative B — Numeric summaries/histograms (more stable than ASCII)
- Behavior
  - Logs are comparable across runs and can be pasted into issues without screenshots.
- Modeling
  - Emit trace payloads that contain:
    - histograms (binned counts) for key tensors
    - distribution stats (mean/std/percentiles)
    - a compact “plate topology summary” (if `artifact:foundation.plateTopology` exists)
- Implementation
  - Add a small metrics helper; emit trace events from steps.

### Alternative C — Publish “diagnostic truth artifacts” (consumable by tooling)
- Behavior
  - External tools (playground/docs) can consume diagnostics without parsing trace logs.
- Modeling
  - Introduce `artifact:foundation.diagnostics` truth artifact (pure data), distinct from trace logs.
- Implementation
  - Additional artifact/tag; more contract surface to maintain.

### Recommendation

Choose **Alternative A + B**:

- ASCII is best for quick belt sanity checks.
- Numeric summaries are best for regression diffing and automated “dashboard” style checks.
- Avoid a new diagnostics artifact unless/until a consumer needs it as a dependency (keep truth contracts lean).

---

## Q10) Metrics to catch “mountain wall” regressions

Question: “What metrics catch ‘mountain wall regressions’ (range curvature distribution, belt width distribution, continuity-with-segmentation, foothill gradients)?”

### Alternative A — Analyze Foundation belt drivers directly (pre-morphology predictors)
- Behavior
  - Detects when inputs are likely to produce walls: overly straight, thin, high-intensity belts with low segmentation.
- Modeling
  - Compute metrics from tile drivers:
    - belt width distribution derived from `boundaryCloseness` / strain fields
    - “straightness” proxy: orientation coherence of high belt strength regions
    - segmentation counts: number of connected components above thresholds
- Implementation
  - Metrics helper over `artifact:foundation.plates` (+ any new deformation/history tiles).
  - Tests live in `mods/mod-swooper-maps/test/foundation/*`.

### Alternative B — Analyze Morphology truth outputs (post-morphology, pre-stamping)
- Behavior
  - Measures the actual mountain/hill masks and gradients that read as walls in-game.
- Modeling
  - Compute on morphology truth artifacts (e.g., ridge plans / orogeny truth) rather than on stamped `artifact:map.*`.
  - Metrics:
    - ridge curvature/length distribution
    - foothill gradient around ridge cores (mountain→hill→flat transition)
    - continuity-with-segmentation: long connected “walls” vs broken chains
- Implementation
  - Use existing morphology ops/tests patterns:
    - `mods/mod-swooper-maps/test/morphology/*`
  - Keep Physics boundary intact by not requiring any `effect:map.*`.

### Alternative C — Joint metric: correlation of belts → mountains (pipeline health check)
- Behavior
  - Ensures morphology remains anchored to physics drivers (no “noise-first” drift).
- Modeling
  - Compute correlation/MI-like scores between:
    - belt strength fields (Foundation) and ridge/mountain masks (Morphology)
- Implementation
  - Integration test that runs both stages in a minimal pipeline and computes the score; place near `mods/mod-swooper-maps/test/standard-run.test.ts` or a dedicated morphology+foundation test.

### Recommendation

Choose **Alternative B + C**:

- “Mountain wall regressions” are ultimately an output-feel issue; measure them on **morphology truth outputs**, not engine-stamped surfaces.
- Add the belt→mountain correlation as a guardrail that preserves the driver-first posture across refactors.
