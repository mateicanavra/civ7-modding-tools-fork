id: LOCAL-TBD-M9-hydrology-s1-delete-authored-interventions
title: "M9 / Slice 1 — Delete authored climate interventions + add guardrails"
state: planned
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
- [ ] No `narrative-swatches` stage exists in the standard recipe braid.
- [ ] No Hydrology step contract requires `narrativePreArtifacts.overlays`.
- [ ] No Hydrology step reads `deps.artifacts.overlays` (or any narrative overlay artifact).
- [ ] No Hydrology code imports `@mapgen/domain/narrative/*`.
- [ ] No remaining references to swatches or paleo in Hydrology climate code paths.
- [ ] `pnpm check` passes (includes `pnpm lint:domain-refactor-guardrails`).

## Testing / Verification
- `pnpm check`
- `pnpm -C mods/mod-swooper-maps test`
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
  - path: /mods/mod-swooper-maps/src/domain/hydrology/config.ts
    notes: Remove `climate.swatches` and `climate.story.paleo` from Hydrology public surface (no authored interventions).
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

The repo already has a guardrails hook: `pnpm lint:domain-refactor-guardrails` (`scripts/lint/lint-domain-refactor-guardrails.sh`).

This slice should add enforcement for the hydrology-specific bans in one of two ways (do not punt silently):

### A) Preferred: add explicit checks to the guardrails linter
- Add `run_rg` checks keyed on Hydrology/Narrative paths for:
  - stage `narrative-swatches` existence
  - imports of `@mapgen/domain/narrative` from `swooper-src/domain/hydrology` and hydrology stages
  - `STORY_OVERLAY_KEYS.(SWATCHES|PALEO)` references

### B) Minimum: keep mechanical `rg` checks in CI scripts
- If guardrails linter changes are deferred, ensure the slice adds a dedicated test or script that executes the `rg` checks from the Verification section.

### Prework Prompt (Agent Brief)
**Purpose:** Ensure there are no remaining “authored intervention” paths beyond the known stage/step modules.\n
**Expected Output:** A complete hit list (paths + owning stage) for: `narrative-swatches`, `applyClimateSwatches`, `storyTagClimatePaleo`, `STORY_OVERLAY_KEYS.(SWATCHES|PALEO)`, and any Hydrology reads of overlays.\n
**Sources to Check:**\n
- `rg -n "\"narrative-swatches\"" mods/mod-swooper-maps/src`\n
- `rg -n "applyClimateSwatches|ClimateSwatches" mods/mod-swooper-maps/src`\n
- `rg -n "storyTagClimatePaleo|\\.story\\s*\\.|paleo" mods/mod-swooper-maps/src`\n
- `rg -n "deps\\.artifacts\\.overlays|artifact:overlays" mods/mod-swooper-maps/src`\n

