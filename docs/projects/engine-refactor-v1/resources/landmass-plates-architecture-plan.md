# Implementation Plan: Tectonic Landmass Fix & Fail-Hard Mountains

## Background / Root Cause
- Landmass scoring penalizes plate boundaries by multiplying arc noise around 0.5, forcing land to select only plate interiors (shields). Boundaries contribute little uplift → continents avoid ridges.
- Mountains layer then fills a fixed quota of tiles sorted by score; with all land scores ≈0, sorting falls back to tile index so a strip of mountains piles up at the map bottom (index 0 first).

## Objectives
1) Let plate boundaries compete fairly with interiors so continents can include ridges/coasts.
2) Make mountain placement threshold-based (physics-driven) so missing data produces zero mountains instead of artifacts.
3) Keep behavior default—no legacy flags or compatibility shims.

## Phase 1 — Landmass Boundary Scoring
- **Fix arc noise mix:** Change arc raggedness from `0.5 + (noise-0.5)*weight` to `1.0 + (noise-0.5)*weight` so noise ranges ~0.75–1.25 instead of hard-penalizing boundaries.
- **Inputs:** keep `arcWeight`, `arcNoiseWeight`, `boundaryBias` (clamped 0–0.4), shared fractal id 3.
- **Outcome:** `landScore = max(interiorScore, arcScore)` now allows convergent rims to win tiles without being halved.

## Phase 2 — Mountains Fail-Hard Thresholding
- Drop quota math entirely (BASE_*_PERCENT, targetMountains/Hills, selectTopScoringTiles).
- Use `selectTilesAboveThreshold` for mountains and hills with config thresholds (defaults 0.45 / 0.25). If physics scores are low, zero mountains are placed—no more bottom strip artifacts.
- Keep landMask-aware `isWater` gating so underwater uplift never gets land mountains; continue diagnostics via `LOG_MOUNTAINS`.

## Verification Plan
- Regenerate a map with `LOG_LANDMASS` and `LOG_MOUNTAINS` enabled.
- Landmass log: `[Landmass] Core-vs-boundary scoring` should show non-zero `convergentLand`; probe counts at thresholds should look sane (not all near zero).
- Mountains log: `[Mountains] placement` should show `mode: physics-threshold` with mountain/hill counts derived from thresholding (not fixed ratios) and no systematic south/bottom bias in row stats.

## Notes
- No experiment flags retained; new behavior is the default path.
- WorldModel tensors remain immutable; fixes stay inside landmass/mountains layers.

## Phase 3 — Robustness & Refactoring
- **Fix Zero Noise Crash:** Patch `landmass-plate.ts` to adaptively handle fractal inputs. If `FractalBuilder` returns 8-bit values (0-255), the legacy `>>> 8` shift results in zero noise, causing flat scores and binary search failure (picking 0 land tiles). The fix checks magnitude before shifting.
- **Pipeline Architecture:** Refactor the monolithic `landmass-plate.ts` into composable components under `packages/mapgen-core/src/layers/landmass/`:
  - `scoring.ts`: Encapsulates the specific Plate/Fractal scoring logic.
  - `masking.ts`: Handles threshold application and mask generation.
  - `index.ts`: Coordinator that wires components together.
- **Shared Utilities:** Extract generic logic to `packages/mapgen-core/src/utils/`:
  - `threshold-solver.ts`: The generic binary search algorithm (reusable by Mountains/Biomes).
  - `grid-analysis.ts`: Logic for extracting windows/bounds from binary masks.
