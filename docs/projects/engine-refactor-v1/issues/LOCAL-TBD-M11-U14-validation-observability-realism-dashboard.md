---
id: LOCAL-TBD-M11-U14
title: "[M11/U14] Add realism invariants + traces to prevent plate/belt/mountain regressions"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [tests, observability, foundation, morphology, realism]
parent: LOCAL-TBD-M11-U15
children: []
blocked_by: [LOCAL-TBD-M11-U13]
blocked: []
related_to: [M11-U00, M11-U06, M10-U06, LOCAL-TBD-M11-U10, LOCAL-TBD-M11-U11, LOCAL-TBD-M11-U12, LOCAL-TBD-M11-U13]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Add a small suite of realism invariants + metrics-backed traces so plate/belt outputs and belt→mountain coupling regressions (especially “mountain walls”) are caught in tests and visible in logs without rendering.

## Deliverables
- Shared slice invariants: see `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U15-foundation-realism-execution-spine.md` (`FND-INV-*`).
- Define a small suite of realism invariants (IDs; tests + traces reference these exactly), validated without rendering.
- **Invariant scope (default):**
  - Preset: `mods/mod-swooper-maps/src/maps/presets/swooper-earthlike.config.js#swooperEarthlikeConfig`
  - Dimensions: `{ width: 60, height: 40 }`
  - Seeds: `123`, `424242`, `9001`
- **Hard invariants (must never regress):**
  - `FND-HARD-DETERMINISM-PLATES`: same seed + config ⇒ identical `artifact:foundation.plates` tensors (`id`, `boundaryCloseness`, `boundaryType`, `upliftPotential`, `riftPotential`, `tectonicStress`, `shieldStability`, `volcanism`).
  - `FND-HARD-PLATE-ID-RANGE`: all `artifact:foundation.plates.id` values are within `[0, plateGraph.plates.length - 1]`.
  - `FND-HARD-BELT-EXISTS`: there exists at least one tile with `boundaryCloseness > 0`, and at least one tile with `boundaryType != 0`.
  - `FND-HARD-NO-POLAR-EDGE-SEEDING` (earthlike preset): top/bottom rows have `boundaryType == 0` (guards against `isPolarEdgeTile`-style seeding and cap leakage).
  - `FND-HARD-REGIME-WIDTH-NOT-CAPPED`: there exists at least one tile with `boundaryType != 0` whose `boundaryCloseness <= 64` (guards against “regime only exists in a 1–2 tile band”).
- **Distribution invariants (wide thresholds; driver-oriented):**
  - `FND-DIST-PLATE-AREA-TAIL`: `p90Area/p50Area >= 1.4` computed from `artifact:foundation.plateTopology` (preferred) or equivalent topology stats.
  - `FND-DIST-BOUNDARY-BAND-FRACTION`: `fraction(boundaryCloseness > 0)` is within `[0.04, 0.40]`.
- **Cross-domain integration invariants (belt → mountains; prevents “noise-first drift”):**
  - `MORPH-GUARD-BELT-TO-MOUNTAIN-CORRELATION`: mountain rate near convergence vs interior has ratio `>= 3.0` (use `boundaryType == convergent` and `boundaryCloseness >= 64` for “near”).
  - `MORPH-GUARD-NO-MOUNTAIN-WALLS`: a connected-components “walliness” metric over morphology mountain mask is `<= 6.0` (Odd-Q adjacency, `wrapX=true`, clamp Y).
- Implement metrics helpers (pure, adapter-free), Bun tests, and step-level trace events (ASCII + numeric summaries). File list lives in `## Implementation Details (Local Only)`.

## Acceptance Criteria
- The invariant IDs listed in Deliverables are implemented as automated tests and pass for the defined scope (preset + dimensions + seeds).
- “Mountain wall regression” is primarily detected by `MORPH-GUARD-NO-MOUNTAIN-WALLS`, with the belt→mountain guardrail enforced by `MORPH-GUARD-BELT-TO-MOUNTAIN-CORRELATION`.
- Required trace kinds are asserted by smoke tests when steps are verbose:
  - Foundation: `foundation.plates.summary`, `foundation.plates.hist.boundaryCloseness`, `foundation.plates.ascii.boundaryCloseness`, `foundation.plates.ascii.boundaryType`.
  - Morphology: `morphology.mountains.metrics` (in addition to existing `morphology.mountains.*` traces).
- New/updated trace events emit both:
  - ASCII summaries for quick belt/mountain sanity checks, and
  - numeric summaries/histograms suitable for diffing and pasting into issues.
- No new “diagnostics artifact” contract is introduced (keep observability in traces unless/until a consumer requires an artifact).

## Testing / Verification
- Run: `bun run --cwd packages/mapgen-core test`
- Run: `bun run --cwd mods/mod-swooper-maps test`
- Focus (Bun): `bun run --cwd mods/mod-swooper-maps test -- test/foundation/m11-realism-invariants.test.ts test/morphology/m11-realism-mountain-walls.test.ts`
- Run: `bun run test`

## Dependencies / Notes
- References:
  - Spike entrypoint: `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-realism-gaps.md`
  - Area deep dive: `docs/projects/engine-refactor-v1/resources/spike/foundation-realism/validation-and-observability.md`
- Related:
  - [M11-U00](./M11-U00-physics-first-realism-upgrade-plan.md)
  - [M11-U06](./M11-U06-orogeny-mountains-physics-anchored.md)
  - [M10-U06](./M10-U06-tracing-observability-hardening.md)
  - Local drafts that this issue hardens (if still local): `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U10-foundation-plate-partition-realism.md`, `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U11-foundation-tectonic-segments-and-history.md`, `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U12-foundation-polar-caps-as-plates.md`, `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U13-foundation-crust-load-bearing-prior.md`

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Three-layer pass (why / how / where)

**1) High level (validate without rendering)**
- Plate realism can be guarded by distribution + topology metrics computed on `artifact:foundation.plateTopology` (preferred) or equivalent topology stats derived from `artifact:foundation.plates.id`.
- Belt realism can be guarded by boundary-band width/distribution checks on `boundaryCloseness` + `boundaryType`.
- “Mountain wall” outcomes are best guarded by metrics on morphology planning outputs (mountain/hill masks), because that is what reads as “walls” in-game.
- Belt→mountain correlation prevents “noise-first drift” where mountains detach from Foundation drivers.

**2) Mid level (modeling approach + artifact boundaries)**
- **Metrics helpers (pure):** reusable, typed-array-in → numbers-out functions; importable from tests and from steps to build trace payloads.
- **Tests:** implement the invariant IDs from Deliverables as a mix of hard invariants (must-never happen) and distribution invariants (range assertions with wide tolerances).
- **Traces:** emitted only at step boundaries (`context.trace.event`) and contain:
  - ASCII grids for fast human inspection, and
  - numeric summaries/histograms for stable regression diffs.
  - Heavier ASCII payloads should remain verbose-step only (follow M10-U06 tracing posture).
- **No new diagnostics artifact:** do not add `artifact:foundation.diagnostics` (stay aligned with existing contract guardrails).

**3) Low level (concrete additions)**
- Add pure metrics helpers (typed arrays in → numbers out) in `packages/mapgen-core/src/lib/metrics/`.
- Add Bun tests implementing the invariant IDs:
  - Foundation invariants: run the standard recipe for each seed/dims; compute plate topology + belt stats and assert thresholds.
  - Morphology invariants: run the standard recipe; compute mountains from truth planning outputs and assert correlation + “walliness” thresholds.
- Add trace events (ASCII + numeric summaries) at existing step boundaries:
  - Foundation: emit `foundation.plates.summary`, `foundation.plates.hist.boundaryCloseness`, `foundation.plates.ascii.boundaryCloseness` (keep existing `foundation.plates.ascii.boundaryType`).
  - Morphology: emit `morphology.mountains.metrics` from `plotMountains.ts`.

```yaml
files:
  - packages/mapgen-core/src/lib/metrics/foundation-realism.ts
  - packages/mapgen-core/src/lib/metrics/morphology-realism.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotMountains.ts
tests:
  - mods/mod-swooper-maps/test/foundation/m11-realism-invariants.test.ts
  - mods/mod-swooper-maps/test/morphology/m11-realism-mountain-walls.test.ts
  - mods/mod-swooper-maps/test/foundation/tracing-observability-smoke.test.ts
  - mods/mod-swooper-maps/test/morphology/tracing-observability-smoke.test.ts
docs:
  - docs/projects/engine-refactor-v1/resources/spike/foundation-realism/validation-and-observability.md
artifacts:
  - artifact:foundation.plateTopology
  - artifact:foundation.plates
  - artifact:morphology.topography
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
