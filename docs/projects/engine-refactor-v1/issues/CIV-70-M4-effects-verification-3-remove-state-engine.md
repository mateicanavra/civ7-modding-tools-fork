---
id: CIV-70
title: "[M4] Effects verification: remove state:engine surface + close DEF-008"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Validation]
parent: CIV-63
children: []
blocked_by: [CIV-69, CIV-64]
blocked: []
related_to: [CIV-64]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove `state:engine.*` from the target registry/contract surface and update deferrals once verified `effect:*` tags and reified fields cover the remaining dependencies.

## Deliverables

- `state:engine.*` tags removed from target registry surface and standard pipeline steps.
- DEF-008 updated to “resolved” once the target surface is clean.
- Any remaining compatibility shims explicitly isolated (no silent fallback in the target path).

## Acceptance Criteria

- No standard pipeline step requires/provides `state:engine.*` tags.
- Registry surface rejects or omits `state:engine.*` in the target contract.
- DEF-008 marked resolved with a brief note pointing to the verified `effect:*` replacements.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A standard pipeline run succeeds and the compiled plan contains no `state:engine.*` tags (requires/provides or registry catalog).

## Dependencies / Notes

- **Parent:** [CIV-63](CIV-63-M4-EFFECTS-VERIFICATION.md)
- **Blocked by:** CIV-69, [CIV-64](CIV-64-M4-PLACEMENT-INPUTS.md)
- **Related:** CIV-64 (placement effect verification)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Treat this as cleanup: do not change algorithms.
- If any placement-related `state:engine.*` dependencies remain, defer to CIV-64 for the effect/reify replacement.
- Current hotspots for `state:engine.*` include:
  - `packages/mapgen-core/src/pipeline/standard.ts` (`M3_STAGE_DEPENDENCY_SPINE`)
  - `packages/mapgen-core/src/pipeline/tags.ts` (legacy tag validation)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: build the final `state:engine.*` removal map so cleanup is mechanical and complete.

Deliverables:
- An inventory of all `state:engine.*` tags in steps, registry validation, and tests.
- For each usage, the planned replacement (`effect:*`, `field:*`, or `artifact:*`) or explicit deletion.
- A short cleanup checklist for removing `state:engine.*` from the registry/tag validation surface and standard pipeline.

Where to look:
- Search: `rg "state:engine" packages/mapgen-core/src packages/mapgen-core/test`.
- Code: `packages/mapgen-core/src/pipeline/standard.ts`, `packages/mapgen-core/src/pipeline/tags.ts`,
  `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`.
- Deferrals: `docs/projects/engine-refactor-v1/deferrals.md` (DEF-008).

Constraints/notes:
- No algorithm changes; this is cleanup only.
- Coordinate with placement inputs so placement effects are already verified.
- Do not implement code; return the inventory and checklist as markdown tables/lists.

## Pre-work

Goal: enumerate every `state:engine.*` usage in code, tests, and docs, and provide a per-tag replacement map so removal is mechanical.

### 1) Inventory: `state:engine.*` usage across the codebase

Search: `rg "state:engine" packages/mapgen-core/src packages/mapgen-core/test docs/`

#### Code (`packages/mapgen-core/src/**`)

| File | Usage | Context |
| --- | --- | --- |
| `packages/mapgen-core/src/pipeline/tags.ts` | `M3_DEPENDENCY_TAGS.state.*` definitions | Defines the canonical `state:engine.*` tag strings. |
| `packages/mapgen-core/src/pipeline/tags.ts` | `M3_CANONICAL_DEPENDENCY_TAGS` (set) | Includes `state:engine.*` in the allowlist. |
| `packages/mapgen-core/src/pipeline/standard.ts` | `M3_STAGE_DEPENDENCY_SPINE` | Steps declare `provides: ["state:engine.*"]` for engine mutation assertions. |
| `packages/mapgen-core/src/pipeline/PipelineExecutor.ts` | Executor satisfaction tracking | Adds `state:engine.*` to the satisfied set after `step.run()`; no verification. |

#### Tests (`packages/mapgen-core/test/**`)

| File | Usage | Context |
| --- | --- | --- |
| `packages/mapgen-core/test/pipeline/artifacts.test.ts` | Imports `M3_STAGE_DEPENDENCY_SPINE` | Tests dependency spine invariants; asserts `state:engine.*` presence. |
| `packages/mapgen-core/test/pipeline/placement-gating.test.ts` | Imports `M3_STAGE_DEPENDENCY_SPINE` | Tests placement requires/provides; includes `state:engine.placementApplied`. |

#### Docs (`docs/projects/engine-refactor-v1/**`)

| File | Usage | Context |
| --- | --- | --- |
| `docs/projects/engine-refactor-v1/deferrals.md` | DEF-008 references `state:engine.*` as unverified | Deferral notes that `state:engine.*` is an assertion-only surface. |
| `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` | Mentions `state:*` as legacy | SPEC notes that `state:*` is migration-only and should be replaced by `effect:*`. |

### 2) Per-tag replacement map

| Current tag | Replacement | Verification strategy |
| --- | --- | --- |
| `state:engine.landmassApplied` | `effect:engine.landmassApplied` | **M4 decision:** keep the effect tag and verify minimally (e.g., assert the canonical foundation artifacts `artifact:foundation.*` exist for the run). Do not omit the effect tag. |
| `state:engine.coastlinesApplied` | `effect:engine.coastlinesApplied` | **M4 decision:** minimal structural verification only (no sampling). Treat as verified when the step completes and post-step contract checks pass for its declared outputs; do not add additional semantic sampling in M4. |
| `state:engine.riversModeled` | `effect:engine.riversModeled` | Verify `artifact:riverAdjacency` is non-empty. |
| `state:engine.biomesApplied` | `effect:engine.biomesApplied` | Structural: `field:biomeId` is provided and the reify-after-mutate loop completes (see Effects Verification‑2). |
| `state:engine.featuresApplied` | `effect:engine.featuresApplied` | Structural: `field:featureType` is provided and the reify-after-mutate loop completes (see Effects Verification‑2). |
| `state:engine.placementApplied` | `effect:engine.placementApplied` | `artifact:placementOutputs@v1` shape validation (ADR-ER1-020). |

### 3) Cleanup checklist (mechanical removal)

#### Tags / registry

- [ ] Remove `state:engine.*` entries from `M3_DEPENDENCY_TAGS` and `M3_CANONICAL_DEPENDENCY_TAGS` in `pipeline/tags.ts`.
- [ ] Update validation to reject the `state:*` namespace entirely (no transitional `state:*` acceptance in M4+).
- [ ] Ensure all steps that previously provided `state:engine.*` now provide the corresponding `effect:*` tag.

#### Standard dependency spine

- [ ] Update `M3_STAGE_DEPENDENCY_SPINE` in `pipeline/standard.ts` to replace `state:engine.*` with `effect:*` entries.

#### Executor verification

- [ ] Update `PipelineExecutor` to verify `effect:*` tags via the registry-driven verification strategy (no longer "trusted assertion").

#### Tests

- [ ] Update `packages/mapgen-core/test/pipeline/artifacts.test.ts` to expect `effect:*` instead of `state:engine.*`.
- [ ] Update `packages/mapgen-core/test/pipeline/placement-gating.test.ts` similarly.

#### Docs

- [ ] Update `docs/projects/engine-refactor-v1/deferrals.md` to mark DEF-008 as resolved with a pointer to the new `effect:*` surface.
- [ ] Update SPEC if any language still implies `state:*` is part of the runtime contract.
