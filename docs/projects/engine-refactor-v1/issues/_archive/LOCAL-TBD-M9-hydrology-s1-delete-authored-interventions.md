id: LOCAL-TBD-M9-hydrology-s1-delete-authored-interventions
title: "M9 / Slice 1 — Delete authored climate interventions + add guardrails"
state: done
priority: 1
estimate: 8
project: engine-refactor-v1
milestone: null
assignees: [codex]
labels: [hydrology, domain-refactor, slice-1]
parent: LOCAL-TBD-hydrology-vertical-domain-refactor
children: []
blocked_by: []
blocked:
  - LOCAL-TBD-M9-hydrology-s2-knobs-and-params-boundary
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Remove all authored “thumbs on the scale” climate inputs from Hydrology and the standard recipe braid (swatches, story overlays/motifs, paleo).
- Keep the pipeline green by replacing those call-sites with physics-only wiring (or deleting the stage/step outright when it is purely authored).
- Add mechanical guardrails so these banned surfaces cannot silently return.

## Deliverables
- Delete the standard recipe stage `narrative-swatches` and all of its plumbing.
- Remove Hydrology consumption of `artifact:overlays` for climate purposes (hydrology-post climate refine is physics-only).
- Remove paleo/story climate modifiers from Hydrology config and steps.
- Add enforcement: repo scans + (where appropriate) linter rules to lock the bans.

## Acceptance Criteria
- [x] No `narrative-swatches` stage exists in the standard recipe braid.
- [x] No Hydrology step contract requires `narrativePreArtifacts.overlays`.
- [x] No Hydrology step reads `deps.artifacts.overlays` (or any narrative overlay artifact).
- [x] No Hydrology code imports `@mapgen/domain/narrative/*`.
- [x] No remaining references to swatches or paleo in Hydrology climate code paths.
- [x] `bun run check` passes (includes `bun run lint:domain-refactor-guardrails`).

Completed on branch `agent-TURTLE-M9-LOCAL-TBD-M9-hydrology-s1-delete-authored-interventions` (PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/613).

## Testing / Verification
- `bun run check`
- `bun run --cwd mods/mod-swooper-maps test`
- `rg -n "\"narrative-swatches\"" mods/mod-swooper-maps/src/recipes/standard` (expect zero hits)
- `rg -n "storyTagClimatePaleo" mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core` (expect zero hits)
- `rg -n "deps\\.artifacts\\.overlays" mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post` (expect zero hits)
- `rg -n "applyClimateSwatches|ClimateSwatches" mods/mod-swooper-maps/src/domain/hydrology mods/mod-swooper-maps/src/domain/narrative` (expect zero hits)
- `rg -n "STORY_OVERLAY_KEYS\\.(SWATCHES|PALEO)" mods/mod-swooper-maps/src` (expect zero hits)

## Dependencies / Notes
- Parent plan: `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-hydrology-vertical-domain-refactor.md`
- Phase 2 authority (bans + semantics): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md`
- Legacy disposition ledger (keep/kill/migrate): `docs/projects/engine-refactor-v1/resources/domains/hydrology/legacy-disposition-ledger.md`

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

<!-- Path roots -->
swooper-src = mods/mod-swooper-maps/src
swooper-test = mods/mod-swooper-maps/test

## Implementation Decisions

### Delete authored intervention surfaces outright (no dormant stubs)
- **Context:** Phase 2 bans swatches/story/paleo in Hydrology; Phase 3 Slice 1 requires a hard cut to prevent drift.
- **Options:** (A) keep stubs (disabled) for “future”, (B) delete stage + modules + schema surfaces entirely.
- **Choice:** (B) delete entirely.
- **Rationale:** Matches `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/IMPLEMENTATION.md` (“Delete legacy for the slice”; no dual paths) and Phase 2’s “no compat inside Hydrology” posture.
- **Risk:** Map presets lose authored climate shaping; mitigated by keeping baseline + physics refine in place until Slice 2/3 replace them.

### Keep `climate-refine` but remove narrative-driven passes
- **Context:** `climate-refine` previously consumed narrative overlays and story config to perturb rainfall.
- **Options:** (A) delete `climate-refine` entirely, (B) keep it but remove narrative-driven inputs and passes.
- **Choice:** (B) keep it (physics-only passes remain).
- **Rationale:** Preserves pipeline shape and downstream `artifact:climateField` stability while enforcing Phase 2’s “fully derivative” boundary.
- **Risk:** Some previous “story flavor” rainfall deltas disappear; intended per Phase 2.

### Rename and publish the Morphology coastline marker artifact
- **Context:** `narrative-pre/story-seed` gates on a Morphology “coastlines complete” marker artifact; the previous `coastlinesApplied` marker was both unpublished and banned by contract-guard checks.
- **Options:** (A) remove the marker gate, (B) keep marker but rename + publish it from the producer step.
- **Choice:** (B) rename to `coastlinesExpanded` and publish from Morphology `coastlines` step.
- **Rationale:** Keeps contract-first dependency gating (per workflow docs) while avoiding reintroducing “effect-tag style” marker names and ensuring tests cover publish-once discipline.
- **Risk:** Artifact id changes; confined to internal consumers in this repo (updated in the same change).

### Why this slice exists (narrative vs physics boundary)

Hydrology’s locked Phase 2 model is physics-first and derivative. Any authored “make this region wet/dry” mechanism (swatches) or story-driven perturbation (motifs, paleo) violates that model and introduces non-local, non-derivative inputs. This slice hard-cuts those surfaces and establishes guardrails so later work cannot “accidentally” drift back.

### Files (expected touchpoints)

```yaml
files:
  - path: /mods/mod-swooper-maps/src/recipes/standard/recipe.ts
    notes: Remove `narrative-swatches` from stages array and import list.
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/index.ts
    notes: Delete stage (authored swatches stage).
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/steps/storySwatches.ts
    notes: Delete step (publishes swatches overlays; calls narrative swatches).
  - path: /mods/mod-swooper-maps/src/domain/narrative/swatches.ts
    notes: Delete swatches overlay publication and hydrology swatches invocation.
  - path: /mods/mod-swooper-maps/src/domain/narrative/overlays/keys.ts
    notes: Delete `STORY_OVERLAY_KEYS.SWATCHES` and `STORY_OVERLAY_KEYS.PALEO`.
  - path: /mods/mod-swooper-maps/src/domain/narrative/overlays/registry.ts
    notes: Remove swatches/paleo registry entries and any swatches-array expectations.
  - path: /mods/mod-swooper-maps/src/recipes/standard/overlays.ts
    notes: Remove swatches overlay mapping for `STORY_OVERLAY_KEYS.SWATCHES/PALEO`.
  - path: /mods/mod-swooper-maps/src/domain/hydrology/climate/index.ts
    notes: Delete `applyClimateSwatches` export and any swatches-module wiring.
  - path: /mods/mod-swooper-maps/src/domain/hydrology/climate/swatches/index.ts
    notes: Delete swatches implementation (authored macro overrides).
  - path: /mods/mod-swooper-maps/src/domain/hydrology/knobs.ts
    notes: Ensure no authored interventions leak into the public knobs surface.
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core/steps/rivers.ts
    notes: Remove `storyTagClimatePaleo` usage and any `config.climate.story` gating.
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts
    notes: Remove overlays motifs as inputs (no `deps.artifacts.overlays`); keep physics-only refine or delete step if redundant.
  - path: /mods/mod-swooper-maps/test/standard-run.test.ts
    notes: Update test config to remove `narrative-swatches` stage config and any `climate.story` / `climate.swatches` usage.
  - path: /mods/mod-swooper-maps/test/standard-recipe.test.ts
    notes: Update expected stage order (remove `narrative-swatches`).
  - path: /mods/mod-swooper-maps/test/story/overlays.test.ts
    notes: Remove coverage for deleted swatches/paleo overlay keys and swatches overlay kind.
  - path: /mods/mod-swooper-maps/src/maps/swooper-earthlike.ts
    notes: Remove `\"narrative-swatches\"` stage config block and any swatches config.
  - path: /mods/mod-swooper-maps/src/maps/shattered-ring.ts
    notes: Remove `\"narrative-swatches\"` stage config block and any swatches config.
  - path: /mods/mod-swooper-maps/src/maps/sundered-archipelago.ts
    notes: Remove `\"narrative-swatches\"` stage config block and any swatches config.
  - path: /mods/mod-swooper-maps/src/maps/swooper-desert-mountains.ts
    notes: Remove `\"narrative-swatches\"` stage config block and any swatches config.
```

### Guardrails (turn bans into failures)

The repo already has a guardrails hook: `bun run lint:domain-refactor-guardrails` (`scripts/lint/lint-domain-refactor-guardrails.sh`).

This slice should add enforcement for the hydrology-specific bans in one of two ways (do not punt silently):

### A) Preferred: add explicit checks to the guardrails linter
- Add `run_rg` checks keyed on Hydrology/Narrative paths for:
  - stage `narrative-swatches` existence
  - imports of `@mapgen/domain/narrative` from `swooper-src/domain/hydrology` and hydrology stages
  - `STORY_OVERLAY_KEYS.(SWATCHES|PALEO)` references

### B) Minimum: keep mechanical `rg` checks in CI scripts
- If guardrails linter changes are deferred, ensure the slice adds a dedicated test or script that executes the `rg` checks from the Verification section.

### Prework Results (Resolved)

This is a complete inventory of the known “thumb on the scale” Hydrology climate intervention surfaces in `mods/mod-swooper-maps` (code + tests). Any enforcement added via `scripts/lint/lint-domain-refactor-guardrails.sh` should scope to `mods/mod-swooper-maps/{src,test}` (and optionally `mods/mod-swooper-maps/src/maps`) and avoid scanning `docs/**`, since archived reviews intentionally mention swatches/paleo.

**Hit list (by surface)**

- Stage `narrative-swatches` / step `story-swatches`
  - Standard braid inclusion:
    - `/mods/mod-swooper-maps/src/recipes/standard/recipe.ts` (imports + includes `narrativeSwatches`)
  - Stage definition + step wiring:
    - `/mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/index.ts` (stage `id: "narrative-swatches"`)
    - `/mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/steps/storySwatches.ts` (reads overlays; calls `storyTagClimateSwatches(...)`)
    - `/mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/steps/storySwatches.contract.ts` (requires `narrativePreArtifacts.overlays`)
  - Config surfaces (map presets + test fixtures):
    - `/mods/mod-swooper-maps/src/maps/swooper-earthlike.ts` (stage config block `"narrative-swatches": {...}`)
    - `/mods/mod-swooper-maps/src/maps/shattered-ring.ts` (stage config block `"narrative-swatches": {...}`)
    - `/mods/mod-swooper-maps/src/maps/sundered-archipelago.ts` (stage config block `"narrative-swatches": {...}`)
    - `/mods/mod-swooper-maps/src/maps/swooper-desert-mountains.ts` (stage config block `"narrative-swatches": {...}`)
    - `/mods/mod-swooper-maps/test/standard-run.test.ts` (stage config block `"narrative-swatches": {...}`)
    - `/mods/mod-swooper-maps/test/standard-recipe.test.ts` (expects `narrative-swatches` stage id)

- `applyClimateSwatches(...)` (Hydrology climate swatch pass)
  - Primary implementation (Hydrology domain):
    - `/mods/mod-swooper-maps/src/domain/hydrology/climate/swatches/index.ts` (defines `applyClimateSwatches(...)`)
    - `/mods/mod-swooper-maps/src/domain/hydrology/climate/index.ts` (imports/re-exports `applyClimateSwatches`)
  - Consumer/call chain (Narrative → Hydrology inversion today):
    - `/mods/mod-swooper-maps/src/domain/narrative/swatches.ts` (`storyTagClimateSwatches(...)` calls `applyClimateSwatches(...)`)
    - `/mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/steps/storySwatches.ts` (invokes `storyTagClimateSwatches(...)`)

- `storyTagClimatePaleo(...)` (Narrative paleo hook called from Hydrology rivers)
  - Defined (Narrative domain):
    - `/mods/mod-swooper-maps/src/domain/narrative/swatches.ts` (defines `storyTagClimatePaleo(...)`; calls `storyTagPaleoHydrology(...)`; publishes overlay key `PALEO`)
  - Called (Hydrology stage):
    - Stage `hydrology-core` / step `rivers`:
      - `/mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core/steps/rivers.ts` (calls `storyTagClimatePaleo(...)` when `runtime.storyEnabled && config.climate?.story?.paleo != null`)
  - Config surfaces (map presets + test fixtures):
    - `/mods/mod-swooper-maps/src/maps/swooper-earthlike.ts` (`climate.story.paleo` config)
    - `/mods/mod-swooper-maps/src/maps/shattered-ring.ts` (`climate.story.paleo` config)
    - `/mods/mod-swooper-maps/src/maps/sundered-archipelago.ts` (`climate.story.paleo` config)
    - `/mods/mod-swooper-maps/src/maps/swooper-desert-mountains.ts` (`climate.story.paleo` config)
    - `/mods/mod-swooper-maps/test/standard-run.test.ts` (`rivers: { climate: { story: { paleo: ... }}}`)
    - `/mods/mod-swooper-maps/test/story/paleo.test.ts` (directly tests `storyTagPaleoHydrology(...)`)

- `STORY_OVERLAY_KEYS.(SWATCHES|PALEO)` (overlay key surface + registry/mapping)
  - Key definition:
    - `/mods/mod-swooper-maps/src/domain/narrative/overlays/keys.ts` (exports `STORY_OVERLAY_KEYS.SWATCHES` and `.PALEO`)
  - Publications:
    - `/mods/mod-swooper-maps/src/domain/narrative/swatches.ts` (publishes overlays for both keys)
  - Registry/mapping:
    - `/mods/mod-swooper-maps/src/domain/narrative/overlays/registry.ts` (maps both keys → `"swatches"`)
    - `/mods/mod-swooper-maps/src/recipes/standard/overlays.ts` (maps both keys → `"swatches"`)
  - Tests:
    - `/mods/mod-swooper-maps/test/story/overlays.test.ts` (asserts both keys exist + publish/get behaviors)

- Hydrology reads of overlays (Narrative motif feedback into climate)
  - Stage `hydrology-post` / step `climate-refine`:
    - `/mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts` (reads `deps.artifacts.overlays` and extracts `rifts`/`hotspots`)
    - `/mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.contract.ts` (requires `narrativePreArtifacts.overlays`)
