id: LOCAL-TBD-M9-hydrology-s2-knobs-and-params-boundary
title: "M9 / Slice 2 — Semantic knobs + normalized params boundary"
state: done
priority: 1
estimate: 8
project: engine-refactor-v1
milestone: null
assignees: [codex]
labels: [hydrology, domain-refactor, slice-2]
parent: LOCAL-TBD-hydrology-vertical-domain-refactor
children: []
blocked_by:
  - LOCAL-TBD-M9-hydrology-s1-delete-authored-interventions
blocked:
  - LOCAL-TBD-M9-hydrology-s3-op-spine-climate-ocean
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Replace Hydrology’s public config “bags” with Phase 2’s semantic knobs only, compiled at a stable boundary into internal normalized parameters and internal step configs.

## Deliverables
- Public Hydrology knobs schema (semantic knobs only; no authored interventions).
- A stable “knobs → normalized params” boundary (compile + normalize semantics per recipe compiler architecture).
- Updated Hydrology stage configs so authors cannot supply low-level climate config bags directly.
- Determinism policy + tests for knob compilation semantics (missing/default/empty/null).

## Acceptance Criteria
- [x] Hydrology public configuration surface exposes semantic knobs only (as defined in Phase 2 “Config semantics table”).
- [x] The Hydrology stages (`hydrology-pre`, `hydrology-core`, `hydrology-post`) reject authored low-level config bags (baseline/refine/story/swatches); author input must be via knobs.
- [x] Knob compilation is deterministic: same knobs + seed ⇒ identical compiled internal configs.
- [x] Missing vs explicit defaults behave exactly as documented in Phase 2 semantics table.
- [x] No runtime defaulting/cleaning occurs for recipe config semantics in steps/ops (defaults happen in compiler-only code paths).

Completed on branch `agent-TURTLE-M9-LOCAL-TBD-M9-hydrology-s2-knobs-and-params-boundary` (PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/614).

## Testing / Verification
- `bun run check`
- `bun run --cwd mods/mod-swooper-maps test`
- `bun run lint:domain-refactor-guardrails`
- `rg -n "\\bclimate\\s*:" mods/mod-swooper-maps/src/maps` (expect zero hits; authored hydrology climate bags removed)
- `rg -n "\"climate-baseline\"\\s*:|\"climate-refine\"\\s*:|\\blakes\\s*:|\\brivers\\s*:" mods/mod-swooper-maps/src/maps` (expect zero hits; authored step-id bags removed)

## Dependencies / Notes
- Phase 2 authority (knobs + semantics): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md`
- Recipe compiler invariants (compile/normalize semantics): `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/00-fundamentals.md`
- Parent plan: `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-hydrology-vertical-domain-refactor.md`

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
mapgen-core = packages/mapgen-core

### What “semantic knobs” means here (Phase 2 authority)

Author input is scenario-level intent, not algorithm parameters:
- Allowed: `dryness: "wet"|"mix"|"dry"`, `temperature: "cold"|"temperate"|"hot"`, `seasonality: "low"|"normal"|"high"`, `oceanCoupling: "off"|"simple"|"earthlike"`, `cryosphere: "off"|"on"`, `riverDensity: "sparse"|"normal"|"dense"`, `lakeiness: "few"|"normal"|"many"`.
- Banned: any regional overrides (“paint”), story motifs/overlays as climate inputs, or anything that directly encodes latitude bands and per-band rainfall targets.

The authoritative semantics (missing/default/empty/null/determinism) live in Phase 2’s “Config semantics table”. This slice’s job is to make those semantics executable in code and tests, without changing the Phase 2 model.

### Stable fix anchors (where to put the boundary)

This slice must create a stable boundary where:
- **Compile** maps stage `public` knobs into the canonical internal step config map (shape-changing; compiler-only).
- **Normalize** canonicalizes values of internal configs (shape-preserving; compiler-only).

Anchors to prefer:
- Stage-level compile hook in `swooper-src/recipes/standard/stages/hydrology-pre/index.ts` (and `hydrology-core`, `hydrology-post` as needed) once the stage authoring supports a `public` schema + `compile` hook.
- Domain-owned normalize/compile helpers under `swooper-src/domain/hydrology/**` (pure, deterministic, no runtime context).

### Files (expected touchpoints)

```yaml
files:
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/index.ts
    notes: Introduce stage-level public knobs schema + compile hook (if supported) to produce internal step configs.
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core/index.ts
    notes: Same posture as hydrology-pre; keep author input knobs-only.
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/index.ts
    notes: Same posture as hydrology-pre; keep author input knobs-only.
  - path: /mods/mod-swooper-maps/src/domain/hydrology/knobs.ts
    notes: Author-facing semantic knobs (defaults + determinism contract).
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/steps/climateBaseline.ts
    notes: Knobs compile into internal op configs via step-level normalize (post-defaulting).
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core/steps/rivers.ts
    notes: Knobs compile into internal op configs via step-level normalize (post-defaulting).
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts
    notes: Knobs compile into internal op configs via step-level normalize (post-defaulting).
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/steps/climateBaseline.contract.ts
    notes: Schema should accept internal canonical config only (no author-facing bag).
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.contract.ts
    notes: Schema should accept internal canonical config only (no author-facing bag).
  - path: /mods/mod-swooper-maps/test
    notes: Add determinism tests for knob compilation (missing/default/empty/null) + golden-map assertions for monotonic knobs.
```

### Guardrails (prevent “bag config” regression)

Once cutover lands, “bag config” usage should be mechanically detectable:
- Map author configs under `swooper-src/maps/**` should not include `climate: { ... }` bags; they should specify hydrology knobs only.
- Runtime code (steps/ops) must not call `Value.Default` or `?? {}` to merge config (per recipe-compile invariants).

### Prework Results (Resolved)

The repo already supports the exact “single author-facing surface → compile to internal step configs” pattern this slice needs.

**Canonical docs (authoritative for patterns)**
- `/docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md` (“Canonical stage pattern”; `createStage({ id, knobsSchema, public?, compile?, steps })`)

**Actual API surface (ground truth)**
- Stage authoring API: `/packages/mapgen-core/src/authoring/stage.ts`
  - `createStage(...)` supports:
    - **internal-as-public** stages: omit `public` and `compile` (stage config keys are step ids + optional `knobs`)
    - **public surface** stages: must supply both `public` and `compile` (enforced by `createStage`)
  - Surface schema construction:
    - Always includes `knobs: Type.Optional(knobsSchema)` at the stage config level
    - If `public` is present, the rest of the stage config must match `public`’s object properties (no step-id keyed author input)
  - Compile hook shape:
    - `compile: ({ env, knobs, config }) => rawSteps`
      - `knobs` comes from `stageConfig.knobs` (validated against `knobsSchema`)
      - `config` is the rest of the stage config object **excluding** `knobs` (validated against `public`)
      - `rawSteps` must be a step-id keyed object for the stage; it **must not** return the reserved key `knobs`

**In-repo exemplar (copy pattern from here)**
- Ecology stage implements `public` + `compile` mapping (public fields → internal step ids):
  - `/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/index.ts`
    - `public`: object schema with “camelCase” public fields (e.g. `resourceBasins`, `featuresApply`)
    - `compile`: maps those public fields to the canonical kebab-case internal step ids (e.g. `"resource-basins"`, `"features-apply"`)

**Minimal test exemplar (shows toInternal mapping semantics)**
- `/packages/mapgen-core/test/authoring/authoring.test.ts` (`createStage supports public schema with compile mapping`)

**Implication for Hydrology knobs → normalized params boundary**
- Hydrology can use the same mechanism by:
  - defining `knobsSchema` as the Phase 2 semantic knobs schema (author input lives only under `stageConfig.knobs`)
  - defining `public` as a strict empty object schema (so authors cannot pass step-id keyed bags)
  - implementing `compile` to deterministically expand knobs into internal step configs (step-id keyed), which are then strictly normalized by the recipe compiler before any runtime execution

### Open Questions

### Does Hydrology need one shared knobs surface or stage-local knobs?
- **Context:** Phase 2 treats knobs as Hydrology-owned. The recipe compiler architecture supports per-stage `public` + compile.\n
- **Options:**\n
  - (A) Expose the same knobs schema on each Hydrology stage (pre/core/post) and compile per-stage.\n
  - (B) Expose knobs on only one Hydrology stage (e.g., hydrology-pre) and treat the resulting compiled internal config as shared across the Hydrology stages.\n
- **Risk:** (A) can duplicate compile logic; (B) can create hidden coupling between stages.\n
- **Default (unless Phase 2 says otherwise):** (B) with an explicit shared internal artifact/config mapping, to keep author input single-source.

## Implementation Decisions
- Use stage `public` + `compile` with an empty public schema for all Hydrology stages so authored step-id config bags are rejected by the compiler.
- Reuse the same `HydrologyKnobsSchema` on `hydrology-pre`, `hydrology-core`, and `hydrology-post` because the compiler’s `compile` hook is stage-local (no supported cross-stage compile surface).
- Map semantic knobs to legacy internal step configs via deterministic “preset” compilation (Phase 3 locked model still lands in Slice 3+; this slice only establishes the stable boundary).
