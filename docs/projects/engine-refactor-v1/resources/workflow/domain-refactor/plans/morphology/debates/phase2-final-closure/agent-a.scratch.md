# Agent A — Phase 2 Morphology trilogy closure scratchpad

Scope guardrails:
- I am only editing the Morphology Phase 2 trilogy I own, plus this scratchpad (explicitly requested for running notes).
- I am not touching shared workflow docs/prompts/guardrails; this worktree currently has unrelated modified files already present.

## Interim notes (running)

- The trilogy already has a strong posture on `artifact:map.*` (Gameplay-only intent), `effect:map.*Plotted` (boolean guarantees), and "Physics must not consume `artifact:map.*` / adapter state".
- Remaining ambiguity to close is mostly “modal” phrasing in the map stamping file’s “Verified vs inferred” sections:
  - Several clauses say “inferred … unless future evidence proves it unnecessary” or “recipe may choose one of two paths”.
  - Phase 2 needs these to read as locked contracts: either encode a required adapter-call ordering unconditionally, or explicitly model the *config surface* that selects a strategy (single path per recipe; no compat/dual path).
- The trilogy currently references `plot-*` steps and a “Step/effect boundary map”, but it does not yet have a single, unmistakable table of:
  - physics steps vs gameplay steps,
  - which ops exist (stable I/O + config),
  - what is frozen at which freeze point (F1–F5) in terms of *artifact keys*.
  I will add/reshape sections so “steps + operations + their I/O/config” is contract-grade obvious.
- Agent C audit flagged two Phase 2 closure gaps I agree with:
  - Add an explicit **Morphology operation catalog** (canonical op ids + I/O + config + determinism anchors) in `PHASE-2-CORE-MODEL-AND-PIPELINE.md`.
  - Add a single **`plot-*` mapping table** in `PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` that, per `effect:map.*Plotted`, lists the allowed Physics truth sources and any published `artifact:map.*` intent surfaces.
- Additional closure gaps from Agent C (now addressed in the trilogy):
  - Topography ambiguity: lock `seaLevel` semantics (number, meters, may be fractional), land/water threshold, and deterministic bathymetry quantization.
  - Volcanism ordering: lock `artifact:morphology.volcanoes` as **intent-only** (no Morphology topography mutation in Phase 2) and add the invariant `volcano tile => landMask=1` at F2.

## Questions / potential blockers (for orchestrator if needed)

- None yet. If I need to touch shared workflow docs/prompts (owned by Agent B), I will stop and ask via orchestrator.

## Closure checklist (final)

### `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`

- Added `### 6.5 Canonical Morphology operation catalog (Phase 2 locked)`:
  - Canonical op ids, stable I/O, normalized config posture, and determinism anchors (including seed labels).
  - Explicitly models volcano intent as a plan op + deterministic derivations for `artifact:morphology.volcanoes`.
- Added `### 6.6 Morphology truth step map (Phase 2)`:
  - Canonical Physics step ids, op calls, and the set of truth artifacts published/frozen at F2 via a required publish/freeze step.
- Removed remaining modal language in contract-level statements.

### `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`

- Locked `artifact:morphology.topography` semantics at the determinism boundary:
  - `elevation` semantic unit = integer meters (quantized deterministically).
  - `seaLevel` semantic unit = meters, allowed to be fractional.
  - Land/water threshold is strict: `elevation > seaLevel` is land; equality is water.
  - `bathymetry` is derived and deterministically quantized (explicit rounding + int16 clamp).
- Locked volcanism semantics to match the Phase 2 causality spine:
  - `artifact:morphology.volcanoes` is intent-only; it MUST NOT mutate `artifact:morphology.topography` in Phase 2.
  - Volcano vents are land-only at F2 (`volcano tile => landMask=1`), enforced by selecting candidates from land tiles only.

### `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`

- Tightened posture so `artifact:map.*` is first-class but Physics never consumes it:
  - Removed “either/or” stamping paths for biomes/features; Phase 2 locks per-tile/per-placement adapter stamping for determinism/observability.
  - Promoted “verified vs inferred” language into Phase 2 contract requirements where it is an effect boundary guarantee.
- Added a single `plot-*` boundary contract table mapping each `effect:map.*Plotted` to:
  - allowed Physics truth sources (explicit keys for Hydrology/Ecology where referenced),
  - published `artifact:map.*` intent surfaces (only where required),
  - required adapter calls / ordering.
- Coast expansion closure: explicitly states the post-`expandCoasts` “sync back into runtime buffers” is Gameplay/runtime state only; any divergence from `artifact:morphology.topography.landMask` is an integration failure (re-stamp/fail fast), never a Physics truth mutation.

## Remaining ambiguities (needs orchestrator decision)

- None required for Phase 2 closure within the trilogy. Any remaining “what exact terrain/feature ids get stamped” decisions are Gameplay adapter policy, not Physics truth, and should be handled in Phase 3 wiring under the `plot-*` steps.
