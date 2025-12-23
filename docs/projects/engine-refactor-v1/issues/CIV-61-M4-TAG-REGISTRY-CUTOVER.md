---
id: CIV-61
title: "[M4] Tag registry cutover: registry-instantiated catalog + validation (effect:* schedulable)"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Validation]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make the registry-instantiated tag catalog canonical for validation and verification, and make `effect:*` a first-class schedulable namespace (with demo payload validation when present).

## Why This Exists

M3 still relies on regex/allowlist tag validation and hard-coded verification lists in the executor. The accepted target model is registry-instantiated tags (fields/artifacts/effects) with registry-driven validation and verification, including schedulable `effect:*` tags.

## Recommended Target Scope

### In scope

- Replace regex/allowlist tag validation with registry-instantiated catalog validation (fail-fast on unknown tags).
- Replace executor hard-coded verification lists with registry-driven verification rules.
- Ensure `effect:*` is first-class and schedulable in the registry catalog.
- Validate demo payloads when present (fail-fast on invalid demo shape).

### Out of scope

- Expanding tag semantics beyond the accepted SPEC/SPIKE.
- Algorithm changes inside steps.
- New registry systems unrelated to tag validation/verification.

## Acceptance Criteria

- Regex/allowlist tag validation and executor hard-coded verification lists are replaced by registry-driven validation/verification.
- `effect:*` is a first-class, schedulable namespace.
- Demo payload validation lives here (fail-fast on invalid demo payload shape when present).

## Primary Touchpoints (Expected)

- Tag validation and executor verification:
  - `packages/mapgen-core/src/pipeline/tags.ts`
  - `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`
  - `packages/mapgen-core/src/pipeline/artifacts.ts`
- Registry catalog sources:
  - `packages/mapgen-core/src/pipeline/StepRegistry.ts`
  - registry entries under `packages/mapgen-core/src/pipeline/**`
- Deferrals and policy:
  - `docs/projects/engine-refactor-v1/deferrals.md`
  - `docs/system/libs/mapgen/architecture.md`

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Add/extend a unit test that fails fast when a step references an unknown tag and when a demo payload fails schema validation.

## Dependencies / Notes

- Phase B work; blocks effects verification and narrative producers that rely on the canonical tag catalog.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Plan (Concrete)

### 1) Inventory current tag validation and verification

- List current regex/allowlist validation rules.
- Identify hard-coded verification lists in the executor.

### 2) Define the registry-instantiated catalog

- Establish the canonical catalog for fields/artifacts/effects from registry entries.
- Ensure catalog enforces collisions and unknown tags as errors.

### 3) Wire registry-driven validation and verification

- Replace regex/allowlist validation with catalog-driven checks.
- Replace hard-coded verification with registry-driven verification rules.

### 4) Support demo payload validation

- Validate demo payload shapes when present; ensure failures are explicit.

## Prework Prompt (Agent Brief)

Goal: define the registry-driven tag catalog and validation/verification rules so implementation is mechanical.

Deliverables:
- An inventory of current tag validation rules (regex/allowlists) and executor verification lists.
- A proposed registry-instantiated tag catalog table (tag ID, namespace, owner, demo payload shape if any).
- A replacement plan for validation/verification (what moves from hard-coded lists to registry-driven rules).
- A list of demo payload shapes and where they should be validated.

Where to look:
- Tag validation: `packages/mapgen-core/src/pipeline/tags.ts`.
- Executor verification: `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`.
- Registry entries and artifacts: `packages/mapgen-core/src/pipeline/**` (search for `register` or tag definitions).
- SPEC/SPIKE: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (Tag registry),
  `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.5).
- Milestone notes: `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

Constraints/notes:
- Keep behavior stable; this is validation/verification wiring, not algorithm change.
- `effect:*` must be schedulable and verifiable via the registry catalog.
- Do not implement code; return the inventory and catalog plan as markdown tables/lists.

## Pre-work

Goal: replace regex/allowlist tag validation + hard-coded executor verification with a registry-instantiated catalog for `artifact:*`, `field:*`, and `effect:*` (and validate demo payloads when present).

### 1) Current state inventory (what exists today)

#### Validation

File: `packages/mapgen-core/src/pipeline/tags.ts`

Current behavior:
- Tag ID validity is enforced by regex:
  - `artifact:<alpha><alnum*>`
  - `field:<alpha><alnum*>`
  - `state:engine.<alpha><alnum*>`
- Tag ID existence is enforced by allowlist:
  - `M3_DEPENDENCY_TAGS` defines canonical tag strings
  - `M3_CANONICAL_DEPENDENCY_TAGS` is a set; unknown tags throw `UnknownDependencyTagError`
- `StepRegistry.register(step)` calls `validateDependencyTags(step.requires/provides)` (so validation happens at registration time, but only against the hard-coded allowlist).

#### Satisfaction + verification

Files:
- `packages/mapgen-core/src/pipeline/tags.ts` (`isDependencyTagSatisfied`, `computeInitialSatisfiedTags`)
- `packages/mapgen-core/src/pipeline/PipelineExecutor.ts` ("missingProvides" hard-coded verification list)

Current behavior:
- Some tags have **concrete satisfaction checks**:
  - `artifact:foundation` checks `context.foundation`
    - **M4 target:** remove this special-case; `artifact:foundation` must be satisfied/verified via `ctx.artifacts` (see LOCAL-TBD-M4-FOUNDATION-SURFACE-CUTOVER).
  - `artifact:heightfield` checks `context.artifacts.get(tag)` shape (typed arrays)
  - `artifact:climateField` checks `context.artifacts.get(tag)` shape (typed arrays)
  - `artifact:storyOverlays` checks `context.overlays.size > 0`
  - `artifact:riverAdjacency` checks artifact mask size/type
  - `field:*` checks that the preallocated field buffer exists (or is non-null)
- Everything else falls back to `state.satisfied.has(tag)` (with the executor unconditionally adding every provided tag to `satisfied`).
- Executor verification ("missingProvides") is hard-coded to only verify a small allowlist:
  - `artifact:foundation`, `artifact:heightfield`, `artifact:climateField`, `artifact:storyOverlays`, `artifact:riverAdjacency`, and any `field:*`
  - `state:engine.*` tags are treated as trusted assertions and are not verified.

### 2) Proposed registry-instantiated tag catalog (what we want)

Target model (SPEC/SPIKE):
- Tags exist iff registered in the mod's instantiated registry.
- No collisions: duplicate tag IDs are hard errors.
- Unknown tags referenced in `requires`/`provides` are hard errors.
- Tags are typed by kind: `field:*`, `artifact:*`, `effect:*`.
- **M4 decision:** demo payloads are provided for every tag in this seeded catalog **except** the Phase A compatibility foundation artifacts; demos must validate against the tag's schema at registry build time.

#### Catalog table (seeded from current M3 tags)

This is the minimum catalog we can instantiate from existing M3 dependency language, with `state:engine.*` marked as transitional (to be replaced by `effect:*` in Effects Verification).

Note: many `field:*` buffers are preallocated today, but **tag satisfaction** is not inferred from allocation; treat `field:*` as published via `provides` (SPEC satisfaction semantics).

| Tag ID | Kind | Current source | Current verification | Proposed schema + demo (TypeBox sketch) | Notes |
| --- | --- | --- | --- | --- | --- |
| `artifact:foundation.mesh` | artifact | SPEC 3.3 (new canonical) | `ctx.artifacts.foundation.mesh != null` | Schema: unknown/compat; demo: omit. | **Migration-only (DEF-014):** backed by a `FoundationContext`-like snapshot; surface must be `ctx.artifacts.foundation.*` (no new `ctx.foundation` deps). |
| `artifact:foundation.crust` | artifact | SPEC 3.3 (new canonical) | `ctx.artifacts.foundation.crust != null` | Schema: unknown/compat; demo: omit. | Same as above. |
| `artifact:foundation.plateGraph` | artifact | SPEC 3.3 (new canonical) | `ctx.artifacts.foundation.plateGraph != null` | Schema: unknown/compat; demo: omit. | Same as above. |
| `artifact:foundation.tectonics` | artifact | SPEC 3.3 (new canonical) | `ctx.artifacts.foundation.tectonics != null` | Schema: unknown/compat; demo: omit. | Same as above. |
| `artifact:heightfield` | artifact | `M3_DEPENDENCY_TAGS.artifact.heightfield` | typed-array shape check | Schema: `{ elevation: Int16Array; terrain: Uint8Array; landMask: Uint8Array }`; demo: empty arrays. | Used as a derived "published artifact" from buffers. |
| `artifact:climateField` | artifact | `M3_DEPENDENCY_TAGS.artifact.climateField` | typed-array shape check | Schema: `{ rainfall: Uint8Array; humidity: Uint8Array }`; demo: empty arrays. | Published from buffers. |
| `artifact:storyOverlays` | artifact | `M3_DEPENDENCY_TAGS.artifact.storyOverlays` | overlays size check | Schema: a snapshot map/record; demo: `{}`. | Narrative cleanup will remove StoryTags; overlays remain legacy/transitional in M4. |
| `artifact:riverAdjacency` | artifact | `M3_DEPENDENCY_TAGS.artifact.riverAdjacency` | Uint8Array size check | Schema: `Uint8Array`; demo: empty array. | Published by rivers step. |
| `field:terrainType` | field | `M3_DEPENDENCY_TAGS.field.terrainType` | `context.fields.terrainType != null` | Schema: `Uint8Array`; demo: empty array. | Fields are preallocated; verification is "exists + correct length" when available. |
| `field:elevation` | field | `M3_DEPENDENCY_TAGS.field.elevation` | `context.fields.elevation != null` | Schema: `Int16Array`; demo: empty array. | Same as above. |
| `field:rainfall` | field | `M3_DEPENDENCY_TAGS.field.rainfall` | `context.fields.rainfall != null` | Schema: `Uint8Array`; demo: empty array. | Same as above. |
| `field:biomeId` | field | `M3_DEPENDENCY_TAGS.field.biomeId` | `context.fields.biomeId != null` | Schema: `Uint8Array`; demo: empty array. | Same as above. |
| `field:featureType` | field | `M3_DEPENDENCY_TAGS.field.featureType` | `context.fields.featureType != null` | Schema: `Int16Array`; demo: empty array. | Same as above. |
| `state:engine.landmassApplied` | transitional (→ effect) | `M3_DEPENDENCY_TAGS.state.landmassApplied` | unverified (satisfied-set) | Replace with `effect:*` in Effects Verification. | Candidate mapping: `effect:engine.landmassApplied` (coordinate with Effects‑1). |
| `state:engine.coastlinesApplied` | transitional (→ effect) | `M3_DEPENDENCY_TAGS.state.coastlinesApplied` | unverified (satisfied-set) | Replace with `effect:*` in Effects Verification. | Candidate mapping: `effect:engine.coastlinesApplied`. |
| `state:engine.riversModeled` | transitional (→ effect) | `M3_DEPENDENCY_TAGS.state.riversModeled` | unverified (satisfied-set) | Replace with `effect:*` in Effects Verification. | Candidate mapping: `effect:engine.riversModeled`. |
| `state:engine.biomesApplied` | transitional (→ effect) | `M3_DEPENDENCY_TAGS.state.biomesApplied` | unverified (satisfied-set) | Replace with `effect:*` in Effects Verification. | Candidate mapping: `effect:engine.biomesApplied`. |
| `state:engine.featuresApplied` | transitional (→ effect) | `M3_DEPENDENCY_TAGS.state.featuresApplied` | unverified (satisfied-set) | Replace with `effect:*` in Effects Verification. | Candidate mapping: `effect:engine.featuresApplied`. |
| `state:engine.placementApplied` | transitional (→ effect) | `M3_DEPENDENCY_TAGS.state.placementApplied` | unverified (satisfied-set) | Replace with `effect:*` in Effects Verification. | Candidate mapping: `effect:engine.placementApplied`. |

Foundation tag note:
- **M4 contract:** register monolithic `artifact:foundation` as canonical and migrate all consumers to `ctx.artifacts.foundation` (remove `ctx.foundation` usage).
  - Allow and prefer `artifact:foundation` in new `requires`/`provides` as part of the surface cutover (LOCAL-TBD-M4-FOUNDATION-SURFACE-CUTOVER).
  - If you believe you must add new usage that **cannot** migrate to `ctx.artifacts.foundation`, stop and add a `triage` entry to `docs/projects/engine-refactor-v1/triage.md` documenting why, then ask for confirmation before proceeding.
- **Post-M4 (DEF-014):** split the monolith into discrete `artifact:foundation.*` artifacts and remove the monolithic tag once consumers are migrated.

#### Verification policy to move into the catalog (replacement plan)

Replace:
- `validateDependencyTag()` regex + allowlist
- executor's hard-coded "missingProvides" allowlist

With registry-driven rules:
- **Existence:** every tag referenced by steps must exist in the instantiated registry catalog.
- **Kind:** only `field:*`, `artifact:*`, and `effect:*` are schedulable/expressible in `requires/provides` (no `state:*` in end-state).
- **Verification:** each tag kind has a verification strategy:
  - `field:*`: verify `ctx.fields` has the buffer (and length if applicable); **do not** infer satisfaction from preallocation (SPEC: satisfaction comes from `provides` + explicit initial set)
  - `artifact:*`: verify the artifact exists at its canonical storage location (e.g., `ctx.artifacts.get(tag)` for map-backed artifacts; `ctx.artifacts.foundation.*` for structured foundation artifacts). **M4 decision:** do not add new runtime schema validation beyond the existing hard-coded checks we already rely on (e.g., heightfield/climate typed-array checks).
    - If you choose to add runtime schema validation anyway, immediately add a `triage` entry to `docs/projects/engine-refactor-v1/triage.md` documenting the scope + overhead + why it is worth it, then confirm you did so.
  - `effect:*`: verify via adapter postconditions (Effects Verification defines the postcondition surfaces and minimal checks)
- **Demo payload validation:** at registry build time, validate `demo` against the tag schema for every tag that includes a demo (all tags except the Phase A compatibility foundation artifacts); fail fast on mismatch.

### 3) Demo payload inventory + validation placement

Current codebase has no explicit demo payloads for dependency tags. The "schema + demo" surfaces would be introduced alongside the registry-instantiated catalog.

Recommended placement:
- Validate demos when constructing the registry (the registry build step should:
  - enforce unique IDs,
  - validate demo payloads against schemas for every tag that includes a demo,
  - and freeze the resulting catalog for execution-time use).

### 4) Coordination notes

- Effects Verification (LOCAL‑TBD‑M4‑EFFECTS‑1) should own the authoritative `effect:*` tag list + adapter postcondition API surface. This prework only seeds candidate mappings from current `state:engine.*` ids.
- PIPELINE cutover work should consume the registry-instantiated catalog for tag validation instead of `M3_CANONICAL_DEPENDENCY_TAGS`.
