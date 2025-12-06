# Pipeline configuration refactor

## Goal
- Move to a clear, stage-by-stage configuration model for the entire map-generation pipeline.
- Simplify and document how configuration is declared, merged, and consumed.
- Make interactions between config blocks explicit; co-locate related knobs to avoid hidden side-effects.
- Treat the pipeline as a configurable, declarative system with optional presets and explicit stage configs.

## Scope
1) **Stage config object (declarative, no hidden defaults):**
   - Introduce a canonical `stageConfig` structure that defines each stage’s inputs/outputs, enablement, and per-stage tunables.
   - Remove implicit defaults from stage runners; defaults live in the stage config schema only.
   - Require explicit opt-in/values for stage-specific behaviors (e.g., ocean separation, plate-aware coasts, relief shaping).

2) **Plate preset input (deterministic, layered):**
   - Add an optional `platePreset` block (seed + axis + convergence/rotation profile) with sensible defaults.
   - Stage configs layer on top of the preset (no mutation of the preset itself), keeping deterministic plate layouts when desired.

3) **Config interaction clarity:**
   - Co-locate related config: plate windows + ocean separation + coast shaping; plate tensors + mountains/hills/volcanoes; winds/currents + climate.
   - Make cross-stage dependencies explicit in the config (e.g., coastlines consumes `landmask` + `plateBoundaries`, mountains consumes `uplift/boundaryCloseness`).

4) **Documentation + schema:**
   - Ship a single schema doc describing the stageConfig shape, presets, and merge order.
   - Generate quick-reference docs per stage with expected inputs/outputs and the tunable surface.

## Alignment with existing plans/work
- Current state: `stageManifest` exists but hides defaults inside stage runners; tunables are read via `rebind` but some modules snapshot at import time.
- Prior refactor work: Context/adapter and WorldModel integration are in place; stage toggles exist, but per-stage config is not consolidated, and ocean separation/coast shaping still rely on scattered knobs.
- Gaps: No first-class stage config object; presets are ad hoc; plate presets aren’t formalized; cross-stage dependencies are inferred, not declared.

## Proposed design (do it properly)
### Configuration model
- **Pipeline config root**
  - `preset`: optional name or object (platePreset + global defaults).
  - `stageConfig`: map keyed by stage name; each entry includes:
    - `enabled`: boolean
    - `inputs`: declarative references to prior stage outputs (validated)
    - `params`: stage-specific tunables (typed, validated, with schema defaults)
    - `policy`: optional per-stage policy blocks (e.g., ocean separation policy, coast shaping policy)
  - `globals`: shared primitives (e.g., dimensions, biome tables, adapter hooks) and a `platePreset` block.

- **Plate preset**
  - Fields: seed (mode/fixed/offset), plateAxisDeg, convergenceMix, rotationMultiple, plateCount, relaxationSteps.
  - Deterministic by default; stages layer their params atop without mutating the preset.

- **Merge/validation**
  - Merge order: base defaults → preset → entry overrides → runtime overrides.
  - All stage defaults live in the schema; stage runners receive already-validated params, never implicit fallbacks.
  - Cross-stage validation ensures required outputs are present before a stage runs.

### Pipeline structure
- Explicit data products per stage (e.g., `landmask`, `plateBoundaries`, `heightfield`, `climateField`, `storyTags`).
- Stage runners declare consumption/production; orchestrator enforces it (fail fast if missing).
- Optional stages can be swapped or skipped by config without code changes.

### Diagnostics and ergonomics
- One “debug profile” toggle to enable foundation/plate ASCII, boundary metrics, landmass windows, relief summaries for a single run.
- Stage-level logging flags live alongside each stage’s config, not global hidden toggles.

## Tasks
1) **StageConfig schema + loader**
   - Define `stageConfig` shape (enabled, inputs, params, policy, logging) and implement validation/merge.
   - Refactor stage runners to consume params from `stageConfig` only (remove hidden defaults in code).

2) **Plate preset support**
   - Add `platePreset` block to config; integrate with WorldModel seed capture; ensure deterministic layouts when provided.
   - Expose preset selection in entries (optional) and document default behavior.

3) **Co-locate dependent configs**
   - Group: plate windows + ocean separation + coast shaping; relief (mountains/hills/volcanoes) + plate tensors; winds/currents + climate moisture.
   - Update orchestrator wiring so each consumer reads from the grouped config, not scattered tunables.

4) **Documentation**
   - Write stage reference doc (inputs/outputs/params) and a quick “how configs merge” guide.
   - Add examples: baseline preset, deterministic plate preset, ocean-separation-on profile.

5) **Safeguards**
   - Add validation for required outputs before each stage.
   - Add a replayable diagnostic harness for WorldModel/plate outputs (seed + dimensions + config → boundary/uplift distribution checks).

## Risks if deferred
- Continued hidden defaults and cross-stage side-effects make tuning fragile.
- Plate/ocean/relief interactions may regress silently across refactors.
- Lack of deterministic presets slows debugging and playtesting.

## Success criteria
- A single stageConfig drives the pipeline; stage runners have no implicit defaults.
- Plate presets produce repeatable layouts; overrides layer predictably.
- Config interactions are documented and co-located; adding/removing a stage is declarative.
- Diagnostics can be turned on per run via a debug profile without code edits.
