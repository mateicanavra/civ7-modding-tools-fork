# Prework — `LOCAL-TBD-M4-TAG-REGISTRY-CUTOVER` (Registry-instantiated tag catalog)

Goal: replace regex/allowlist tag validation + hard-coded executor verification with a registry-instantiated catalog for `artifact:*`, `field:*`, and `effect:*` (and validate demo payloads when present).

## 1) Current state inventory (what exists today)

### Validation

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

### Satisfaction + verification

Files:
- `packages/mapgen-core/src/pipeline/tags.ts` (`isDependencyTagSatisfied`, `computeInitialSatisfiedTags`)
- `packages/mapgen-core/src/pipeline/PipelineExecutor.ts` (“missingProvides” hard-coded verification list)

Current behavior:
- Some tags have **concrete satisfaction checks**:
  - `artifact:foundation` checks `context.foundation`
  - `artifact:heightfield` checks `context.artifacts.get(tag)` shape (typed arrays)
  - `artifact:climateField` checks `context.artifacts.get(tag)` shape (typed arrays)
  - `artifact:storyOverlays` checks `context.overlays.size > 0`
  - `artifact:riverAdjacency` checks artifact mask size/type
  - `field:*` checks that the preallocated field buffer exists (or is non-null)
- Everything else falls back to `state.satisfied.has(tag)` (with the executor unconditionally adding every provided tag to `satisfied`).
- Executor verification (“missingProvides”) is hard-coded to only verify a small allowlist:
  - `artifact:foundation`, `artifact:heightfield`, `artifact:climateField`, `artifact:storyOverlays`, `artifact:riverAdjacency`, and any `field:*`
  - `state:engine.*` tags are treated as trusted assertions and are not verified.

## 2) Proposed registry-instantiated tag catalog (what we want)

Target model (SPEC/SPIKE):
- Tags exist iff registered in the mod’s instantiated registry.
- No collisions: duplicate tag IDs are hard errors.
- Unknown tags referenced in `requires`/`provides` are hard errors.
- Tags are typed by kind: `field:*`, `artifact:*`, `effect:*`.
- Demo payloads are optional; if provided they must validate against the tag’s schema at registry build time.

### Catalog table (seeded from current M3 tags)

This is the minimum catalog we can instantiate from existing M3 dependency language, with `state:engine.*` marked as transitional (to be replaced by `effect:*` in Effects Verification).

| Tag ID | Kind | Current source | Current verification | Proposed schema + demo (TypeBox sketch) | Notes |
| --- | --- | --- | --- | --- | --- |
| `artifact:foundation` | artifact | `M3_DEPENDENCY_TAGS.artifact.foundation` | `context.foundation != null` | Schema: (large) `FoundationContext`-like object; demo: `{ ...minimal }` or omit demo. | Long-term: split into discrete foundation artifacts; for M4 keep as-is for parity. |
| `artifact:heightfield` | artifact | `M3_DEPENDENCY_TAGS.artifact.heightfield` | typed-array shape check | Schema: `{ elevation: Int16Array; terrain: Uint8Array; landMask: Uint8Array }`; demo: empty arrays. | Used as a derived “published artifact” from buffers. |
| `artifact:climateField` | artifact | `M3_DEPENDENCY_TAGS.artifact.climateField` | typed-array shape check | Schema: `{ rainfall: Uint8Array; humidity: Uint8Array }`; demo: empty arrays. | Published from buffers. |
| `artifact:storyOverlays` | artifact | `M3_DEPENDENCY_TAGS.artifact.storyOverlays` | overlays size check | Schema: a snapshot map/record; demo: `{}` (or omit demo). | Narrative cleanup will replace StoryTags; overlays remain as artifacts in M3. |
| `artifact:riverAdjacency` | artifact | `M3_DEPENDENCY_TAGS.artifact.riverAdjacency` | Uint8Array size check | Schema: `Uint8Array` (or `{ mask: Uint8Array }`); demo: empty array. | Published by rivers step. |
| `field:terrainType` | field | `M3_DEPENDENCY_TAGS.field.terrainType` | `context.fields.terrainType != null` | Schema: `Uint8Array` (optional); demo: empty array. | Fields are preallocated; verification is “exists + correct length” when available. |
| `field:elevation` | field | `M3_DEPENDENCY_TAGS.field.elevation` | `context.fields.elevation != null` | Schema: `Int16Array` (optional); demo: empty array. | Same as above. |
| `field:rainfall` | field | `M3_DEPENDENCY_TAGS.field.rainfall` | `context.fields.rainfall != null` | Schema: `Uint8Array` (optional); demo: empty array. | Same as above. |
| `field:biomeId` | field | `M3_DEPENDENCY_TAGS.field.biomeId` | `context.fields.biomeId != null` | Schema: `Uint8Array` (optional); demo: empty array. | Same as above. |
| `field:featureType` | field | `M3_DEPENDENCY_TAGS.field.featureType` | `context.fields.featureType != null` | Schema: `Int16Array` (optional); demo: empty array. | Same as above. |
| `state:engine.landmassApplied` | transitional (→ effect) | `M3_DEPENDENCY_TAGS.state.landmassApplied` | unverified (satisfied-set) | Replace with `effect:*` in Effects Verification. | Candidate mapping: `effect:engine.landmassApplied` (coordinate with Effects‑1). |
| `state:engine.coastlinesApplied` | transitional (→ effect) | `M3_DEPENDENCY_TAGS.state.coastlinesApplied` | unverified (satisfied-set) | Replace with `effect:*` in Effects Verification. | Candidate mapping: `effect:engine.coastlinesApplied`. |
| `state:engine.riversModeled` | transitional (→ effect) | `M3_DEPENDENCY_TAGS.state.riversModeled` | unverified (satisfied-set) | Replace with `effect:*` in Effects Verification. | Candidate mapping: `effect:engine.riversModeled`. |
| `state:engine.biomesApplied` | transitional (→ effect) | `M3_DEPENDENCY_TAGS.state.biomesApplied` | unverified (satisfied-set) | Replace with `effect:*` in Effects Verification. | Candidate mapping: `effect:engine.biomesApplied`. |
| `state:engine.featuresApplied` | transitional (→ effect) | `M3_DEPENDENCY_TAGS.state.featuresApplied` | unverified (satisfied-set) | Replace with `effect:*` in Effects Verification. | Candidate mapping: `effect:engine.featuresApplied`. |
| `state:engine.placementApplied` | transitional (→ effect) | `M3_DEPENDENCY_TAGS.state.placementApplied` | unverified (satisfied-set) | Replace with `effect:*` in Effects Verification. | Candidate mapping: `effect:engine.placementApplied`. |

### Verification policy to move into the catalog (replacement plan)

Replace:
- `validateDependencyTag()` regex + allowlist
- executor’s hard-coded “missingProvides” allowlist

With registry-driven rules:
- **Existence:** every tag referenced by steps must exist in the instantiated registry catalog.
- **Kind:** only `field:*`, `artifact:*`, and `effect:*` are schedulable/expressible in `requires/provides` (no `state:*` in end-state).
- **Verification:** each tag kind has a verification strategy:
  - `field:*`: verify `ctx.fields` has the buffer (and length if applicable)
  - `artifact:*`: verify `ctx.artifacts.get(tag)` exists and (optionally) validates against schema
  - `effect:*`: verify via adapter postconditions (Effects Verification defines the postcondition surfaces and minimal checks)
- **Demo payload validation:** at registry build time, validate `demo` against the tag schema when present; fail fast on mismatch.

## 3) Demo payload inventory + validation placement

Current codebase has no explicit demo payloads for dependency tags. The “schema + demo” surfaces would be introduced alongside the registry-instantiated catalog.

Recommended placement:
- Validate demos when constructing the registry (the registry build step should:
  - enforce unique IDs,
  - validate demo payloads against schemas (if present),
  - and freeze the resulting catalog for execution-time use).

## 4) Coordination notes

- Effects Verification (LOCAL‑TBD‑M4‑EFFECTS‑1) should own the authoritative `effect:*` tag list + adapter postcondition API surface. This prework only seeds candidate mappings from current `state:engine.*` ids.
- PIPELINE cutover work should consume the registry-instantiated catalog for tag validation instead of `M3_CANONICAL_DEPENDENCY_TAGS`.

