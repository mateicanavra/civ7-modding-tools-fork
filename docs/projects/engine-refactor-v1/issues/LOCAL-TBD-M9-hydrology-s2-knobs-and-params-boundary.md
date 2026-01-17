id: LOCAL-TBD-M9-hydrology-s2-knobs-and-params-boundary
title: "M9 / Slice 2 — Semantic knobs + normalized params boundary"
state: planned
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
- [ ] Hydrology public configuration surface exposes semantic knobs only (as defined in Phase 2 “Config semantics table”).
- [ ] The Hydrology stages (`hydrology-pre`, `hydrology-core`, `hydrology-post`) reject authored low-level config bags (baseline/refine/story/swatches); author input must be via knobs.
- [ ] Knob compilation is deterministic: same knobs + seed ⇒ identical compiled internal configs.
- [ ] Missing vs explicit defaults behave exactly as documented in Phase 2 semantics table.
- [ ] No runtime defaulting/cleaning occurs in steps or op implementations (defaults happen in compiler-only code paths).

## Testing / Verification
- `pnpm check`
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm lint:domain-refactor-guardrails`
- `rg -n "climate:\\s*\\{|baseline:\\s*\\{|refine:\\s*\\{|swatches:\\s*\\{|story:\\s*\\{" mods/mod-swooper-maps/src/maps` (expect zero hits in author-facing map configs after cutover)

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
  - path: /mods/mod-swooper-maps/src/domain/hydrology/config.ts
    notes: Replace/relocate public climate config bags; retain only what remains truly internal after compilation.
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

### Prework Prompt (Agent Brief)
**Purpose:** Validate how stage-level public schema + compile hooks are expressed in the current authoring API, and identify an existing exemplar.\n
**Expected Output:** A minimal example (file path + excerpt references) of a stage using a `public` view + compile hook, and the exact API surface to implement it for Hydrology.\n
**Sources to Check:**\n
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md`\n
- `packages/mapgen-core/src/authoring` (`createStage`, compilation pipeline)\n
- `rg -n \"public\" packages/mapgen-core/src/authoring -S`\n

### Open Questions

### Does Hydrology need one shared knobs surface or stage-local knobs?
- **Context:** Phase 2 treats knobs as Hydrology-owned. The recipe compiler architecture supports per-stage `public` + compile.\n
- **Options:**\n
  - (A) Expose the same knobs schema on each Hydrology stage (pre/core/post) and compile per-stage.\n
  - (B) Expose knobs on only one Hydrology stage (e.g., hydrology-pre) and treat the resulting compiled internal config as shared across the Hydrology stages.\n
- **Risk:** (A) can duplicate compile logic; (B) can create hidden coupling between stages.\n
- **Default (unless Phase 2 says otherwise):** (B) with an explicit shared internal artifact/config mapping, to keep author input single-source.

