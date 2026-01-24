---
id: M11-U02
title: "[M11/U02] Author config overhaul: knobs + presets + config layering"
state: done
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [config, knobs, presets, morphology, foundation]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [M11-U00]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Introduce **author-facing knobs** and **preset tiers** for realism-first map generation, while preserving the existing advanced config as an escape hatch.
- Reduce “flat/verbose advanced config” exposure by giving authors a stable, ergonomic surface: knobs-first, advanced-only when needed.

## Objective
- Make the default authoring posture “realism-first” and **easy to tune**.
- Make the config structure **greenfield-friendly** so the physics model can evolve without locking authors into brittle step-level structures.

## Deliverables
- A standard, cross-domain author config shape with explicit composition rules:
  - advanced config is the baseline (schema-defaulted)
  - knobs apply last as deterministic transforms (no presence-gating; no compare-to-default sentinels)
- A small set of realism-oriented knob groups with documented ranges and interactions:
  - Foundation: plate count / activity, polar edge strength, deformation style
  - Morphology: sea level posture, erosion strength, orogeny emphasis, volcanism emphasis, coastline ruggedness
- Preset taxonomy:
  - `realism/earthlike` (default target)
  - `realism/young-tectonics` (more active, sharper relief)
  - `realism/old-erosion` (smoother, wider valleys)
  - (Optional) non-realism presets as separate category (kept out of the realism pipeline)

## Acceptance Criteria
- Knobs composition is test-locked:
  - knobs-only: defaults + knobs transform applies
  - advanced+knobs: authored overrides + knobs transform still applies (same transform codepath)
- No hidden tuning constants:
  - any constant used to interpret a knob is either an explicit advanced config input or an explicitly named, documented constant.
- Authors can materially reshape outcomes (mountain density, coast ruggedness, erosion intensity) **without** editing step-level config trees.

## Implementation Notes (proposed, but do not require consensus)
- Add stage knobs schemas for `foundation`, `morphology-pre`, `morphology-mid`, `morphology-post`, and Gameplay `map-morphology` where appropriate.
- Keep advanced config as-is initially, but nest it under a single key per stage (e.g. `advanced`) to stop unbounded sprawl at the stage surface.
- Implement `apply<Stage>Knobs(advancedConfig, knobs, ctx)` pure transforms and call them from `step.normalize(...)` using `NormalizeCtx`.

## Testing / Verification
- Add/extend “knobs-last” tests (one per domain, fixture-based).
- Ensure workspace compile catches unknown keys (strict schemas) once stage surfaces are migrated to `public` schemas.

## References
- Config/knobs semantics: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/IMPLEMENTATION.md`
- Morphology knobs posture: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/MORPHOLOGY-NON-IMPLEMENTATION.md`
- Earth-like ranges: `mods/mod-swooper-maps/src/maps/presets/swooper-earthlike.config.ts`

## Implementation Decisions

### Use stage knobs as the author surface; keep advanced config as the baseline
- **Context:** We need a durable author surface that doesn’t require editing step-level trees, while preserving advanced config as an escape hatch.
- **Options:** (A) stage-level knobs threaded via `ctx.knobs` with per-step `normalize`, (B) a new “preset compiler” layer with a separate config type.
- **Choice:** (A) stage-level knobs + deterministic transforms in step `normalize`.
- **Rationale:** matches existing Hydrology knob patterns and keeps composition local + test-lockable.
- **Risk:** knob enums/multipliers must remain stable and documented to avoid silent tuning drift.

### Presets are plain `StandardRecipeConfig` bundles
- **Context:** Presets should be easy to import and override without extra machinery.
- **Options:** (A) exported config objects (TS constants), (B) runtime registry/lookup.
- **Choice:** (A) exported config objects under `mods/mod-swooper-maps/src/maps/presets/realism/`.
- **Rationale:** keeps presets type-checked and composable with overrides.
- **Risk:** preset naming is not enforced at runtime; docs/tests must remain the source of truth.
