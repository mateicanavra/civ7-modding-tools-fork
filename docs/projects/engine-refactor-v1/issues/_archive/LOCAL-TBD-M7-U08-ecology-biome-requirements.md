---
id: LOCAL-TBD-M7-U08
title: "[M7] Restore Civ7 biome requirements + full feature constants"
state: in-progress
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M7
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Audit Civ7 base biome/feature rules (scripts + XML), restore missing biome placement requirements (notably marine), and bring adapter/type constants up to full parity with Civ7 feature + biome lists.

## Deliverables
- Audit notes + mapping for Civ7 biome/feature requirements (base scripts + XML).
- Biomes step assigns BIOME_MARINE for water tiles and publishes consistent `field:biomeId`.
- Biome engine bindings include marine + correct defaults (no `BIOME_SNOW`).
- Adapter + SDK constants updated to include full Civ7 biome/feature lists.
- Docs updated to reflect binding + marine assignment behavior.

## Acceptance Criteria
- Water tiles always get BIOME_MARINE before base feature placement runs.
- Biome bindings and defaults match Civ7 biomes (tundra/grassland/plains/tropical/desert/marine only).
- Feature constants include all Civ7 features (aquatic + natural wonders, including Bermuda Triangle and Mount Everest).
- Typecheck/build/tests/deploy succeed.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm lint` / `pnpm check` (workspace)
- `pnpm build` / `pnpm run deploy` (workspace)

## Dependencies / Notes
- Civ7 base resources: `.civ7/outputs/resources/Base/modules/**`
- Base biome + feature rules: `base-standard/maps/feature-biome-generator.js`, `base-standard/data/terrain.xml`

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)
- Compare base `designateBiomes/addFeatures` with current ecology pipeline to capture required constraints.
- Ensure marine biome is assigned for all water tiles to unblock feature placement and gameplay lookups.
- Update binding schema defaults to avoid referencing non-existent BIOME_SNOW.
- Update constants to reflect full Civ7 lists for clarity + future-proofing.

## Implementation Decisions

### Map snow biome symbol to BIOME_TUNDRA by default
- **Context:** Civ7 base resources define only six biomes; `BIOME_SNOW` does not exist in game data, yet the ecology symbol list includes `snow`.
- **Options:** Keep `BIOME_SNOW` in defaults; remap `snow` to `BIOME_TUNDRA` by default; remove `snow` symbol entirely.
- **Choice:** Remap `snow` to `BIOME_TUNDRA` by default, keep symbol for internal climate semantics.
- **Rationale:** Preserves internal classification intent without referencing missing engine globals.
- **Risk:** If a future Civ7 update adds `BIOME_SNOW`, defaults may need revisiting.

### Treat marine as a separate engine binding and explicitly assign it to water tiles
- **Context:** Base game requires BIOME_MARINE for water tiles; current binding schema only maps land symbols.
- **Options:** Add `marine` to symbol list; add `marine` binding separate from land symbols; infer marine via hardcoded adapter lookup.
- **Choice:** Add explicit `marine` binding and set BIOME_MARINE on water tiles during the biomes step.
- **Rationale:** Keeps land classification untouched while ensuring engine-required marine biomes exist.
- **Risk:** If water/land masks drift from engine terrain types, assignments could mismatch.

### Disable climate swatches in presets by omitting config
- **Context:** Climate swatches add macro overlays that can fight early ecology tuning (baseline + biomes + features) while iterating on stable defaults.
- **Options:** Keep swatches enabled with tuned weights; disable by adding a config flag; disable by omitting `climate.swatches`.
- **Choice:** Omit `climate.swatches` in current map presets so the swatches stage no-ops.
- **Rationale:** Keeps the pipeline intact while removing a major source of variability during ecology retuning.
- **Risk:** Less dramatic macro-climate regions until swatches are reintroduced deliberately.
