id: LOCAL-TBD
title: Wire foundation config into WorldModel and mountains layer for Swooper Desert Mountains
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: [codex]
labels: [Bug, Architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Fix miswired foundation and mountain configuration so the Swooper Desert Mountains map uses its intended plate and mountain tuning, then refine boundary and intensity behavior to allow valid civilization starts.

## Deliverables
- `swooper-desert-mountains` entry config updated so mountain tuning lives under `foundation.mountains` instead of a top-level `mountains` override.
- `WorldModel` wired to read plate and dynamics configuration from the `foundation.*` tunables via `setConfigProvider`.
- Mountains layer confirmed to consume `foundation.mountains` values (thresholds, weights, tectonicIntensity) via orchestrator wiring.
- Debug logs (temporary or gated) that show effective `WorldModel` plate config and mountains thresholds in a real game run.
- Documentation note describing the configuration flow for `foundation.mountains` and `foundation.plates` for future map entries.

## Acceptance Criteria
- On a fresh map generation:
  - Logs show `WorldModel` plate count and key dynamics fields that match `foundation.plates` from `swooper-desert-mountains` (not the internal 4/4 defaults).
  - Mountains layer logs show `mountainThreshold`, `hillThreshold`, `tectonicIntensity`, and key weights matching `foundation.mountains` overrides.
  - The landmass log (`landmass-plate`) reflects the configured plate count and produces clear basins (not a single boundary-saturated landmass).
- Start placement:
  - `pickStartPlotByTile` still reports a healthy number of candidate tiles per region.
  - At least most major civilizations receive valid start positions (no longer `0/6 civilizations placed successfully` on standard settings).
- Visual inspection:
  - The ASCII advanced start region dump shows a mix of mountains and non-mountain land, with evident basins suitable for starts.
- All new wiring is covered by at least one lightweight unit test (e.g., `setConfigProvider` influencing `WorldModel` config) and passes `pnpm test`.

## Testing / Verification
- Build and tests:
  - `pnpm run build`
  - `pnpm test`
- In-game manual tests:
  - Generate multiple Swooper Desert Mountains maps at the standard 74x46 size.
  - Confirm:
    - `[WorldModel]` logs show plate count and dynamics that match `foundation.plates` overrides.
    - `[Mountains]` logs show thresholds and intensity values that match `foundation.mountains`.
    - `landmass-plate` logs report reasonable land tiles and boundary coverage without falling back to minimum plate counts.
    - Start placement logs show successful assignment for most or all majors, with far fewer or no `FAILED TO PICK LOCATION` messages.

## Dependencies / Notes
- Mirrors the Linear issue workflow:
  - This doc should be renamed from `LOCAL-TBD` and updated with a real Linear `id` once the issue is created upstream.
- Primary root causes to address first:
  - Misplaced mountains config (`overrides.mountains` instead of `overrides.foundation.mountains`) causing the mountains layer to run with defaults.
  - Missing `setConfigProvider` wiring for `WorldModel`, so plate and dynamics config from `foundation.*` never reaches the physics sim.
- Complementary concerns (to be considered after wiring is correct):
  - Boundary saturation on small maps:
    - Consider dynamic `boundaryInfluenceDistance` based on map size and plate count while preserving existing saturation safeguards.
  - Voronoi wrapping:
    - Optionally adjust distance calculations in `computePlatesVoronoi` to respect horizontal wrap and reduce seam artifacts.
  - Tectonic intensity semantics:
    - Decide whether `tectonicIntensity` should scale physics weights only, thresholds as well, or act as a blend factor against fractal noise; retune `swooper-desert-mountains` thresholds accordingly if semantics change.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Fix foundation/mountains wiring:
  - Move the `swooper-desert-mountains` mountain overrides under `overrides.foundation.mountains` and align with `MountainsConfig` types.
  - Verify `tunables.FOUNDATION_CFG.mountains` reflects the moved config.
- Wire `WorldModel` to foundation config:
  - Import and call `setConfigProvider` from `MapOrchestrator` (or `bootstrap/entry`) to return a `WorldModelConfig` built from `FOUNDATION_PLATES`, `FOUNDATION_DYNAMICS`, and `FOUNDATION_DIRECTIONALITY`.
  - Add a one-time `[WorldModel]` log in `init()` or `computePlatesVoronoi` to print plate count and select dynamics fields.
- Confirm mountains layer consumption:
  - Ensure `buildMountainOptions` reads from `FOUNDATION_CFG.mountains` and passes options into `layerAddMountainsPhysics`.
  - Add a short `[Mountains]` debug log echoing thresholds and intensity used at runtime.
- Post-wiring tuning and optional enhancements:
  - After wiring is verified, evaluate boundary coverage metrics and, if necessary, introduce a dynamic starting `boundaryInfluenceDistance` proportional to average plate radius.
  - Optionally add horizontal wrap to the Voronoi cell→plate assignment distance metric.
  - Revisit `tectonicIntensity` behavior and adjust thresholds and weights in `swooper-desert-mountains` once semantics are finalized.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
