---
id: M10-U02
title: "[M10/U02] Delete the overlay system"
state: planned
priority: 3
estimate: 0
project: engine-refactor-v1
milestone: M10
assignees: []
labels: [morphology, ecology, refactor]
parent: null
children: []
blocked_by: [M10-U01]
blocked: [M10-U03]
related_to: [M10-U06]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Remove the narrative overlay system entirely: delete producers/consumers and remove narrative stages from the standard recipe.

## Deliverables
- `narrative-pre` and `narrative-mid` stages removed from the standard recipe and deleted from disk.
- `artifact:storyOverlays` removed from all recipe contracts and tags.
- Ecology features no longer require overlays.
- Tests/configs migrated to remove narrative stage references.

## Acceptance Criteria
- `narrative-pre` and `narrative-mid` are removed from `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`.
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre` and `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid` are deleted.
- `rg -n "artifact:storyOverlays|narrativePreArtifacts\\.overlays|readOverlay|overlays\\.js" mods/mod-swooper-maps/src` returns zero hits outside `docs/**`.
- `ecology/features` no longer requires overlays.
- Standard recipe tests referencing narrative stages are migrated/deleted in-slice (no dual config paths).

## Testing / Verification
- `rg -n "artifact:storyOverlays|narrativePreArtifacts\\.overlays|readOverlay|overlays\\.js" mods/mod-swooper-maps/src`
- `bun run --cwd mods/mod-swooper-maps test -- test/standard-run.test.ts test/standard-recipe.test.ts`

## Dependencies / Notes
- Blocked by [M10-U01](./M10-U01-delete-overlays-as-morphology-inputs.md).
- Blocks [M10-U03](./M10-U03-map-morphology-stamping.md).
- Tracing pass is tracked separately in [M10-U06](./M10-U06-tracing-observability-hardening.md).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Scope
- Delete `artifact:storyOverlays` from the standard recipe.
- Remove `narrative-pre` and `narrative-mid` stages from `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`.
- Migrate configs/tests that reference narrative stages:
  - `mods/mod-swooper-maps/src/maps/**`
  - `mods/mod-swooper-maps/test/standard-run.test.ts`
  - `mods/mod-swooper-maps/test/standard-recipe.test.ts`
  - `rg -n "stages/narrative-(pre|mid)" mods/mod-swooper-maps/test mods/mod-swooper-maps/src`
- Remove Ecology overlay dependency:
  - Update `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/contract.ts` to drop overlays.

### Guardrails (slice-local)
- Overlay purge gate (fast, code-only):
  - `rg -n "artifact:storyOverlays|narrativePreArtifacts\\.overlays|readOverlay|overlays\\.js" mods/mod-swooper-maps/src` must be empty outside `docs/**`.

### Downstream migrations
- Consumer matrix “Break” rows completed here:
  - `narrative-pre/*` + `narrative-mid/*` deleted
  - `ecology/features` drops overlays

### Exit criteria (pipeline-green)
- No stage/step contracts in the standard recipe require `artifact:storyOverlays`.
- Narrative stages are removed from recipe/config/tests.
- Ruthlessness mini-pass: delete now-unused overlay helpers/contracts/artifacts; run fast gates.

### Files
```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/recipe.ts
    notes: Remove `narrative-pre` and `narrative-mid` stages
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/artifacts.ts
    notes: Deleted after stage removal
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/artifacts.ts
    notes: Deleted after stage removal
  - path: mods/mod-swooper-maps/src/recipes/standard/overlays.ts
    notes: Deleted once overlay system is removed
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/contract.ts
    notes: Drop overlay requires; delete overlay-bias logic
  - path: mods/mod-swooper-maps/test/standard-run.test.ts
    notes: Remove narrative stage expectations/config
  - path: mods/mod-swooper-maps/test/standard-recipe.test.ts
    notes: Remove narrative stage expectations/config
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
