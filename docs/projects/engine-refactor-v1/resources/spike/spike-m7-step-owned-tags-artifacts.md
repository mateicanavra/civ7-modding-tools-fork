# Spike M7: Step-owned tags and artifacts refactor plan

Using architecture skill to structure a step-owned tag/artifact refactor plan against the current worktree (`/Users/mateicanavra/Documents/.nosync/DEV/civ7-modding-tools-mapgen-domain-config`).

**Current state (confirmed in this worktree)**
- Tag kinds in use are `artifact:*`, `field:*`, `effect:*` (no `buffer:*` tags in the standard recipe today).
- Central definitions live in `mods/mod-swooper-maps/src/recipes/standard/tags.ts` and `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts`.
- Steps are a mix of file-based (`steps/*.ts`) and directory-based (ecology/placement).

**Target layout**
- Each step owns two modules: `tags.ts` and `artifacts.ts`.
- Steps that are currently single files become directories so they can host `index.ts`, `tags.ts`, and `artifacts.ts`.
- Recipe keeps aggregation (flat list for `createRecipe`) and a barrel for artifacts, but those files become thin import/re-export layers.

**Concrete refactor plan (step-by-step)**

1. **Create a step ownership map for tags/artifacts (no decisions left)**
   - Foundation step owns: `artifact:foundationPlatesV1`, `artifact:foundationDynamicsV1`, `artifact:foundationSeedV1`, `artifact:foundationDiagnosticsV1`, `artifact:foundationConfigV1`.
   - LandmassPlates step owns: `effect:engine.landmassApplied` (adapter verification + satisfies check).
   - Coastlines step owns: `effect:engine.coastlinesApplied` (adapter verification + satisfies check).
   - Lakes step owns: `artifact:heightfield` (publish/get helper; used by climateBaseline and rivers).
   - ClimateBaseline step owns: `artifact:climateField` (publish/get helper; used by storySwatches + climateRefine + rivers).
   - Rivers step owns: `artifact:riverAdjacency` and `effect:engine.riversModeled`.
   - StorySeed step owns: `artifact:storyOverlays` and `artifact:narrative.motifs.margins`.
   - StoryHotspots step owns: `artifact:narrative.motifs.hotspots`.
   - StoryRifts step owns: `artifact:narrative.motifs.rifts`.
   - StoryOrogeny step owns: `artifact:narrative.motifs.orogeny`.
   - StoryCorridorsPre step owns: `artifact:narrative.corridors`.
   - Biomes step owns: `artifact:ecology.biomeClassification`, `field:biomeId`, `effect:engine.biomesApplied`.
   - Features step owns: `field:featureType`, `effect:engine.featuresApplied`.
   - Derive-placement-inputs step owns: `artifact:placementInputs`.
   - Placement step owns: `artifact:placementOutputs`, `effect:engine.placementApplied` (custom satisfies logic).
   - **Gotcha:** `field:terrainType`, `field:elevation`, `field:rainfall` are defined today but not provided by any step. Decide whether to keep them as "engine field tags" in a small non-step module (recommended) or drop/update tests (would be a behavioral change). I recommend keeping them in a tiny `recipes/standard/tags/engine-fields.ts` module that only exports tag definitions, and include it in the recipe aggregation.

2. **Normalize step directories (add `tags.ts` + `artifacts.ts`)**
   - Convert file-based steps into folders with `index.ts`:
     - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts` -> `.../landmassPlates/index.ts`
     - `.../steps/coastlines.ts` -> `.../coastlines/index.ts`
     - `.../steps/ruggedCoasts.ts` -> `.../ruggedCoasts/index.ts`
     - `.../steps/islands.ts` -> `.../islands/index.ts`
     - `.../steps/mountains.ts` -> `.../mountains/index.ts`
     - `.../steps/volcanoes.ts` -> `.../volcanoes/index.ts`
     - `.../steps/lakes.ts` -> `.../lakes/index.ts`
     - `.../steps/climateBaseline.ts` -> `.../climateBaseline/index.ts`
     - `.../steps/rivers.ts` -> `.../rivers/index.ts`
     - `.../steps/climateRefine.ts` -> `.../climateRefine/index.ts`
     - `.../steps/storySeed.ts` -> `.../storySeed/index.ts`
     - `.../steps/storyHotspots.ts` -> `.../storyHotspots/index.ts`
     - `.../steps/storyRifts.ts` -> `.../storyRifts/index.ts`
     - `.../steps/storyOrogeny.ts` -> `.../storyOrogeny/index.ts`
     - `.../steps/storyCorridorsPre.ts` -> `.../storyCorridorsPre/index.ts`
     - `.../steps/storyCorridorsPost.ts` -> `.../storyCorridorsPost/index.ts`
     - `.../steps/storySwatches.ts` -> `.../storySwatches/index.ts`
   - For steps already in directories, just add `tags.ts` + `artifacts.ts`:
     - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/tags.ts` + `artifacts.ts`
     - `.../features/tags.ts` + `artifacts.ts`
     - `.../plot-effects/tags.ts` + `artifacts.ts` (likely empty artifacts)
     - `.../placement/steps/derive-placement-inputs/tags.ts` + `artifacts.ts`
     - `.../placement/steps/placement/tags.ts` + `artifacts.ts`

3. **Split artifact definitions out of `recipes/standard/artifacts.ts`**
   - Move each artifact's types/builders/validators/getters into the owning step's `artifacts.ts`:
     - BiomeClassification types + `isBiomeClassificationArtifactV1` -> `.../ecology/steps/biomes/artifacts.ts`
     - Narrative Corridors types + builders + `isNarrativeCorridorsV1` -> `.../narrative-mid/steps/storyCorridorsPre/artifacts.ts`
     - Narrative Motifs Margins types + builder + validator -> `.../narrative-pre/steps/storySeed/artifacts.ts`
     - Narrative Motifs Hotspots types + builder + validator -> `.../narrative-pre/steps/storyHotspots/artifacts.ts`
     - Narrative Motifs Rifts types + builder + validator -> `.../narrative-pre/steps/storyRifts/artifacts.ts`
     - Narrative Motifs Orogeny types + builder + validator -> `.../narrative-mid/steps/storyOrogeny/artifacts.ts`
     - Heightfield/climate/river adjacency publish/get helpers:
       - `publishHeightfieldArtifact` + `getPublishedHeightfield` (if you add it) -> `.../hydrology-pre/steps/lakes/artifacts.ts`
       - `publishClimateFieldArtifact` + `getPublishedClimateField` -> `.../hydrology-pre/steps/climateBaseline/artifacts.ts`
       - `publishRiverAdjacencyArtifact` + `getPublishedRiverAdjacency` + `computeRiverAdjacencyMask` -> `.../hydrology-core/steps/rivers/artifacts.ts`
     - Placement input/output artifacts:
       - Move `mods/mod-swooper-maps/src/recipes/standard/stages/placement/placement-inputs.ts` into `.../steps/derive-placement-inputs/artifacts.ts`
       - Move `mods/mod-swooper-maps/src/recipes/standard/stages/placement/placement-outputs.ts` into `.../steps/placement/artifacts.ts`
   - Keep the recipe-level `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` as a re-export barrel only (no definitions); it should re-export the step artifacts for convenience and for tests that still import from this path.

4. **Split tag definitions out of `recipes/standard/tags.ts`**
   - Each step's `tags.ts` should export:
     - The step's tag IDs (owned + required).
     - `REQUIRES`/`PROVIDES` arrays used by the step.
     - A `TAG_DEFINITIONS` array containing `DependencyTagDefinition` entries only for tags that the step owns and that need `satisfies`/`demo`/`owner`.
   - For artifact tag IDs, define them in `artifacts.ts` and re-export from `tags.ts` (avoids tag<->artifact circular imports).
   - For effect/field tag IDs, define them directly in `tags.ts`.
   - Use the same satisfies logic currently in `mods/mod-swooper-maps/src/recipes/standard/tags.ts`:
     - Foundation tags use `validateFoundation*` from `@swooper/mapgen-core`.
     - Heightfield/climate/river tags use the existing helper checks.
     - Narrative tags use their `isNarrative*` validators.
     - Placement applied effect uses the current custom `isPlacementOutputSatisfied` logic.
     - Effect tag owners (`biomesApplied`, `featuresApplied`, `placementApplied`) should keep the same owner metadata.
   - **Engine field tags:** move `field:terrainType`, `field:elevation`, `field:rainfall` definitions into a small `mods/mod-swooper-maps/src/recipes/standard/tags/engine-fields.ts` module; include it in the aggregation list. These tags don't have a provider step today.

5. **Rebuild recipe-level aggregation**
   - Replace `mods/mod-swooper-maps/src/recipes/standard/tags.ts` with a thin aggregation module:
     - `STANDARD_TAG_DEFINITIONS` is composed from all step `TAG_DEFINITIONS` arrays + `engine-fields.ts`.
     - Optionally re-export tag ID constants from step modules for convenient imports (barrel only).
   - Update `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` to import `STANDARD_TAG_DEFINITIONS` from the new aggregator.

6. **Update step `requires` / `provides`**
   - Each step's `index.ts` should import its own `REQUIRES`/`PROVIDES` from local `tags.ts` and pass those arrays to `createStep`.
   - When a step uses a tag owned by another step, import the tag ID from the owning step's `tags.ts`, not from a central catalog.

7. **Update artifact usage imports**
   - Steps that call `publish*`/`getPublished*` should import them from the owning step's `artifacts.ts` (or from the recipe barrel if you keep that as a convenience re-export).
   - Update `mods/mod-swooper-maps/test/**/*.ts` imports to use the new exports; easiest path is to keep the recipe barrel `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` and only change the barrel's internals.

8. **Clean up old central definitions**
   - Delete the old definitions from `mods/mod-swooper-maps/src/recipes/standard/tags.ts` and `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts`.
   - Ensure all import paths in `mods/mod-swooper-maps/src/recipes/standard/stages/**` use the step-owned tags/artifacts.
   - Update any tests referencing `M3_DEPENDENCY_TAGS`/`M4_EFFECT_TAGS` if you remove those objects.

9. **Verification**
   - Run `pnpm -C packages/mapgen-core build` (per mod AGENT).
   - Run `pnpm -C mods/mod-swooper-maps check`, `pnpm -C mods/mod-swooper-maps test`, `pnpm -C mods/mod-swooper-maps build`.

**Gotchas to handle explicitly**
- **Multi-provider tags** (e.g., `effect:engine.coastlinesApplied`, `artifact:narrative.corridors`, `artifact:heightfield`) must have a single `DependencyTagDefinition` owner; other steps should only reuse the tag ID.
- **Tag/artifact circular imports**: define artifact tag IDs in `artifacts.ts` and re-export them in `tags.ts`; keep `tags.ts -> artifacts.ts` dependency only.
- **Engine field tags** are currently "unowned"; decide whether to keep them in a small `engine-fields.ts` module (recommended) or drop them and update tests.

If you want, I can also attach a quick ownership checklist (step by step) as a working list for implementation.

Skills used: architecture.
