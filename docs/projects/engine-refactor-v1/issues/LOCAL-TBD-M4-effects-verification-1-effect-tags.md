---
id: LOCAL-TBD-M4-EFFECTS-1
title: "[M4] Effects verification: define effect:* tags + adapter postcondition surfaces"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Architecture, Validation]
parent: LOCAL-TBD-M4-EFFECTS-VERIFICATION
children: []
blocked_by: []
blocked: [LOCAL-TBD-M4-EFFECTS-2, LOCAL-TBD-M4-EFFECTS-3]
related_to: [CIV-47]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Introduce canonical `effect:*` tags for engine-surface mutations and add minimal adapter-backed postcondition surfaces, without changing step scheduling yet.

## Deliverables

- Canonical `effect:*` tags for high-risk engine mutations (biomes/features/placement) in the registry surface.
- Minimal adapter-backed postcondition queries needed to verify those effects (stub + real adapter hooks).
- Documentation updates for DEF-008 / engine boundary policy references where these effects are defined.

## Acceptance Criteria

- `effect:engine.biomesApplied`, `effect:engine.featuresApplied`, and `effect:engine.placementApplied` are registered in the target registry surface with clear ownership metadata.
- Adapter surface exposes the minimal postcondition checks needed to validate those effects (stubbed where necessary for tests).
- No changes to step `requires`/`provides` yet (this is additive/scaffolding only).

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Add/extend a unit test that registers the new `effect:*` tags in the catalog and asserts a failing postcondition surfaces as a clear error (use a stub adapter hook or a forced verifier failure).

## Dependencies / Notes

- **Parent:** [LOCAL-TBD-M4-EFFECTS-VERIFICATION](LOCAL-TBD-M4-EFFECTS-VERIFICATION.md)
- **Blocks:** LOCAL-TBD-M4-EFFECTS-2, LOCAL-TBD-M4-EFFECTS-3
- **Related:** CIV-47 (adapter consolidation)
- **Coordination:** Effect tags must be schedulable via the registry-instantiated catalog owned by LOCAL-TBD-M4-TAG-REGISTRY-CUTOVER.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep this additive: do not alter step scheduling or remove `state:engine.*` in this issue.
- Define effects alongside existing tag registries or registry entries; do not introduce new global registries.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: define the effect tag catalog and the minimal adapter postcondition surfaces needed for verification.

Deliverables:
- A catalog of `effect:*` tags for biomes, features, and placement (ID, owner, providing step).
- A minimal adapter postcondition API sketch for verifying each effect (what query is needed, and where it would live).
- A note on where these effects should be registered (registry entries vs global tags).

Where to look:
- SPEC: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (Tag registry, Effects).
- SPIKE: `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.5, §2.8).
- Code: `packages/mapgen-core/src/pipeline/tags.ts`, `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`,
  `packages/mapgen-core/src/pipeline/ecology/**`, `packages/mapgen-core/src/pipeline/placement/**`.
- Adapter types: search for `EngineAdapter` or adapter interfaces under `packages/mapgen-core/src/**` and `packages/civ7-adapter/**`.

Constraints/notes:
- Effects must be verifiable (no "asserted but unverified" scheduling edges).
- Keep this additive; no scheduling changes in this prework.
- Do not implement code; return the catalog and API sketch as a markdown table/list.
- Coordinate with the tag registry cutover so effect tags land in the canonical registry surface.

## Pre-work

Goal: define the `effect:*` tag surface for engine mutations and the minimal adapter postcondition queries needed for verification (without changing step scheduling in this issue).

### 1) Current `state:engine.*` surface (what exists today)

Source: `packages/mapgen-core/src/pipeline/standard.ts` (`M3_STAGE_DEPENDENCY_SPINE`).

| Tag | Providing step(s) | Current verification | Notes |
| --- | --- | --- | --- |
| `state:engine.landmassApplied` | `landmassPlates` | None (trusted assertion) | Landmass step calls adapter; no postcondition check. |
| `state:engine.coastlinesApplied` | `coastlines` | None | Coastlines step calls adapter; no postcondition check. |
| `state:engine.riversModeled` | `rivers` | None | Rivers step calls adapter; no postcondition check. |
| `state:engine.biomesApplied` | `biomes` | None | Biomes step calls adapter; no postcondition check. |
| `state:engine.featuresApplied` | `features` | None | Features step calls adapter; no postcondition check. |
| `state:engine.placementApplied` | `placement` | None | Placement step calls adapter; no postcondition check. |

All `state:engine.*` are currently "trusted assertions": the executor adds them to the satisfied set after `step.run()` completes, with no adapter-backed verification.

### 2) Proposed `effect:*` catalog (seed for M4)

Goal: replace `state:engine.*` with **verified** `effect:*` tags. Each effect must have a postcondition that can be checked (via adapter or reified artifact).

#### Biomes/features/placement effect tags

| Effect tag | Providing step | Postcondition strategy | Notes |
| --- | --- | --- | --- |
| `effect:engine.biomesApplied` | `biomes` | Minimal adapter query: sample a few land tiles and confirm biomeId is set. Or: verify `field:biomeId` is published (reify-after-mutate). | Prefer sampled check + reified field. |
| `effect:engine.featuresApplied` | `features` | Minimal adapter query: sample a few tiles and confirm featureType is set (or explicit "no feature"). Or: verify `field:featureType` is published. | Prefer sampled check + reified field. |
| `effect:engine.placementApplied` | `placement` | **ADR-ER1-020 decision:** verify via `artifact:placementOutputs@v1` (minimal output artifact shape). No full-map scan; the artifact confirms required placement methods were called and returned successfully. | Placement is high-risk; use artifact-based verification. |

#### Other `state:engine.*` candidates (lower priority for M4)

| Current tag | Suggested effect tag | Postcondition strategy | Notes |
| --- | --- | --- | --- |
| `state:engine.landmassApplied` | `effect:engine.landmassApplied` | Sample or none (landmass is early; terrain mutation verification is lower-risk). | Could verify a few tiles are land vs ocean. |
| `state:engine.coastlinesApplied` | `effect:engine.coastlinesApplied` | Sample or none. | Coastline expansion is engine-owned; minimal postcondition. |
| `state:engine.riversModeled` | `effect:engine.riversModeled` | Sample: check that `artifact:riverAdjacency` is populated and/or a few river tiles exist. | Rivers step already publishes the adjacency artifact; could verify it's non-empty. |

### 3) Adapter postcondition API (minimal surface)

Goal: expose the minimal adapter surfaces needed to verify effects without full-map scans.

#### Proposed additions to `EngineAdapter`

```ts
interface EngineAdapter {
  // Existing surfaces...

  // Biomes verification (sample-based)
  sampleBiomeIds?(coords: Array<{ x: number; y: number }>): Array<number | undefined>;

  // Features verification (sample-based)
  sampleFeatureTypes?(coords: Array<{ x: number; y: number }>): Array<number | undefined>;

  // Placement verification (artifact-based; see ADR-ER1-020)
  // No adapter query needed; verification happens via artifact shape validation.
}
```

Note: For M4, prefer **artifact-based verification** (placement) or **reify-after-mutate + field check** (biomes/features) over new adapter surfaces. Sample queries are fallback or optional debugging aids.

### 4) Coordination notes

- **Tag Registry cutover (LOCAL-TBD-M4-TAG-REGISTRY-CUTOVER):** effect tags should be registered as first-class `effect:*` entries in the catalog (schedulable, verifiable).
- **Effects Verification‑2 (biomes/features reification):** reify-after-mutate pattern handles biomes/features; this issue only scaffolds the tag + adapter surface.
- **Placement Inputs (LOCAL-TBD-M4-PLACEMENT-INPUTS):** ADR-ER1-020 locks the placement verification strategy; this issue only registers `effect:engine.placementApplied` and points to the artifact-based verifier.

### 5) Where to register (placement in registry entries)

Recommended placement:
- Define effect tags in `packages/mapgen-core/src/pipeline/tags.ts` or the new registry catalog once Tag Registry cutover lands.
- Each step that provides an effect tag should import and declare it in its `provides` list.
- Effect verification wiring should live in `PipelineExecutor` (or a dedicated verifier module) and be catalog-driven.
