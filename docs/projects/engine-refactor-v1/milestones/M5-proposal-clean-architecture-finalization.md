# Milestone 5 Proposal: Clean Architecture Finalization (Post‑M4)

**Status:** proposed  
**Baseline snapshot:** `dbfde2bc` (post‑M4 landed, including CIV‑70/73/74 + review fixes)  
**Spike (evidence + remaining design decisions):** `docs/projects/engine-refactor-v1/spikes/2025-12-26-m5-clean-architecture-finalization-scope.md`

## Executive summary

M4 gets us onto the new pipeline in a way that is materially real: mapgen runs through `RunRequest → ExecutionPlan → PipelineExecutor`, step enablement is recipe-driven, the registry/validation layer is present, StoryTags is no longer a correctness dependency, and the `state:engine.*` contract is gone in favor of `effect:*` tags.

But “new pipeline” is not yet “clean architecture.” The core package still embeds what the target architecture sketches as *mod-owned domain behavior*: the standard registry, standard recipes, the standard dependency spine, standard step implementations, and the domain libraries those steps execute. In other words, M4 makes the mechanism generic, but it does not yet make *ownership* generic.

M5 is the milestone where we make that ownership boundary true, then delete everything that exists only to support transitional legacy/compat states, and finish the remaining architectural deferrals so the system is clean by construction.

## What M4 (fully done) really buys us

This is the first point in the refactor where we can say: the old orchestration model is not “still there in parallel,” and the runtime contract is enforceable by code rather than by conventions and tribal knowledge.

What M4 does *not* buy us is the final package/ownership architecture. The largest remaining gap is structural: the core library still contains the standard pipeline’s domain behavior.

## M5 definition of done (“super clean”)

### Architecture + public surface

- One architecture, not two: no legacy entrypoints, no compatibility shims, no “best-effort” fallbacks that mask missing contracts, and no deprecated fields shipped “just in case.”
- If an API exists, it is real. If something is legacy-only, it is deleted (not parked behind “compat” packages).

### Ownership + packaging

- Core packages are generic pipeline + patterns + shared primitives only. They do not embed standard-mod domain behavior.
- The standard pipeline is a mod/plugin: it owns its steps, tag definitions, recipes, and domain helpers. Core doesn’t “know” narrative/morphology/ecology/placement exist.
- In this repo, the base pipeline mod is exported from `@swooper/mapgen-core/base` and is supplied to core via explicit injection (no built-in base import in core).

### Engine boundary (boring on purpose)

- Engine correctness dependencies are explicit: either verified `effect:*` contracts or reified `field:*`/`artifact:*` products—not implicit “read engine later” prerequisites.
- `@swooper/mapgen-core` remains runnable under `MockAdapter` without relying on ambient globals or implicit environment detection.

### Repo layout + navigability

- Step code, its schema, and its artifact/type definitions are colocated with the step/module that owns them; wiring-only indirections are reduced.

## The remaining gap after M4 (why M5 is still real work)

Post‑M4, what remains is not “more cutover.” It’s the work that makes the cutover *true* in structure:

- The mod boundary is still not real (standard mod still lives inside core and delegates to core-owned registrations).
- Core still ships dead/compat exports and deprecation-only surfaces (which keeps the repo in perpetual transition).
- Some contracts are still ambient (globals/fallbacks).
- The remaining deferrals (DEF‑010/011/014/016/017) are the unfinished portion of the target architecture, not cosmetic polish.

## Workstreams (problem framing)

These are the conceptual buckets of work. The next sections define the canonical units of work (issue candidates) and a separate sequencing “slices” layer for how to land them.

### 1) Make the mod boundary real (pluginize the standard pipeline; core becomes generic only)

Move “knowledge of the world” out of core. Core keeps the pipeline engine (registries, compiler, executor, tracing) and shared primitives; the standard mod owns its tags, recipes, steps, and domain helpers.

**Complexity × parallelism:** high complexity, medium parallelism (boundary decisions are serial; the moves are largely parallelizable).

### 2) Delete every compatibility surface (no dead code, no shims, no deprecation-only fields)

Remove legacy stubs/aliases/no-ops and tighten schemas so the repo stops shipping transitional affordances.

**Complexity × parallelism:** low–medium complexity, high parallelism (mostly mechanical once ownership boundaries are clear).

### 3) Make the engine boundary boring (no globals, no silent fallbacks)

Replace global detection/injection patterns and “best effort” adapter fallbacks with explicit wiring and explicit contracts.

**Complexity × parallelism:** medium complexity, medium parallelism (touches contract surfaces and adapters; benefits from disciplined test gates).

### 4) Close the remaining architectural deferrals (finish the target architecture)

DEF‑010/014/016/017 are the remainder of the refactor that makes the clean story credible (climate reification, foundation artifact inventory, schema ownership, stronger effect verification). DEF‑011 is still work, but it’s no longer an open question: we’ve locked the decision to remove the selector and delete the `"legacy"` branch.

**Complexity × parallelism:** mixed (schema split is highly parallel; foundation/climate/effects are more coupled and require serialized decisions).

### 5) Colocation + consolidation pass (make layout match ownership)

Once code is in the right packages, do the move-based cleanup that makes the repo navigable and reduces “fractal” scattering of types/artifacts/schemas.

**Complexity × parallelism:** low–medium complexity, high parallelism.

## Reconciliation: deferrals + triage (paper trail)

This milestone proposal is “post‑M4,” but it still inherits a paper trail: deferrals and “follow‑up” notes sprinkled across M4 issues and triage.

The core point: **the remaining gap after a fully landed M4 is not “more M4.”** The largest remaining work is structural (ownership/package boundaries), and the remaining deferrals are about making the target architecture *true by construction*, not just “true in behavior.”

### What’s already resolved (and should not leak into M5 scope)

- StoryTags compatibility and story caches are resolved (DEF‑002 / DEF‑012; closed by CIV‑74).
- Legacy ordering/enablement (`STAGE_ORDER` / `stageManifest`) is resolved (DEF‑004; closed by CIV‑59).
- Placement inputs are explicit and verified (DEF‑006; closed by CIV‑72).
- The `state:engine.*` contract surface is removed and replaced by verified `effect:*` tags (DEF‑008; closed by CIV‑70).

### What remains open and is intentionally pulled into M5

- DEF‑010 (climate prerequisite reification; eliminate hidden engine-read dependencies).
- DEF‑011 (delete behavior-mode fork; remove `crustMode` and the `"legacy"` algorithm branch).
- DEF‑014 (foundation inventory: split the monolithic foundation artifact into `artifact:foundation.*` and migrate consumers).
- DEF‑016 (schema ownership split + colocation).
- DEF‑017 (adapter read-back surfaces for stronger `effect:*` verification).

### What remains open but is not a “clean architecture blocker”

- DEF‑005 (river graph product): a richer product contract, not a legacy-architecture cleanup.
- DEF‑015 (RNG parity contract): only required if exact output parity becomes a hard requirement.

Triage follow-ups that *do* intersect with “super clean” end state (and are pulled into M5):

- Directionality settings migration (ADR‑ER1‑019 follow‑up from CIV‑56).
- Remove process‑wide “fallback constants + warnings” style patterns from adapter integration (risk noted in CIV‑67).
- Small consolidation moves that reduce wiring-only indirection (e.g., executor loop dedupe) where they materially improve maintainability post‑split.

## Canonical units of work (issue candidates)

The canonical unit definitions live as standalone issue docs under `docs/projects/engine-refactor-v1/issues/`. This milestone doc keeps only the index and the sequencing/grouping layer.

- [x] [M5-U01](../issues/M5-U01-DEF-011-delete-crust-mode.md) — DEF‑011: delete `crustMode` and the `"legacy"` behavior branch (branch: `m5-u01-def-011-delete-crust-mode`)
- [x] [M5-U02](../issues/M5-U02-standard-mod-boundary-skeleton.md) — introduce the standard-mod package boundary skeleton + invariants (branch: `m5-u02-standard-mod-boundary-skeleton`, review: `m5-u02-review-standard-mod-boundary-skeleton`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/244)
- [x] [M5-U03](../issues/M5-U03-standard-registry-recipes-tags-extraction.md) — move base registry + recipes + tags into the base mod (branch: `m5-u03-standard-registry-recipes-tags-extraction`, review: `m5-u03-review-standard-registry-recipes-tags-extraction`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/245)
- [x] [M5-U04](../issues/M5-U04-extract-standard-foundation-physics.md) — extract foundation & physics steps + helpers into the base mod (branch: `m5-u04-extract-standard-foundation-physics`, review: `m5-u04-review-extract-standard-foundation-physics`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/246)
- [x] [M5-U05](../issues/M5-U05-extract-standard-morphology-hydrology.md) — extract morphology & hydrology steps + helpers into the base mod (branch: `m5-u05-extract-standard-morphology-hydrology`, review: `m5-u05-review-extract-standard-morphology-hydrology`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/247)
- [x] [M5-U06](../issues/M5-U06-extract-standard-ecology-placement-narrative.md) — extract ecology, placement, narrative steps + helpers into the standard mod (branch: `m5-u06-extract-standard-ecology-placement-narrative`, review: `m5-u06-review-extract-standard-ecology-placement-narrative`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/248)
- [x] [M5-U07](../issues/M5-U07-delete-compat-deprecation-surfaces.md) — delete dead/compat/deprecation-only surfaces (“no dead code” true) (branch: `m5-u07-delete-compat-deprecation-surfaces`, review: `m5-u07-review-delete-compat-deprecation-surfaces`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/249)
- [x] [M5-U08](../issues/M5-U08-remove-globals-fallbacks-engine-boundary.md) — remove ambient globals + silent fallbacks (boring engine boundary) (branch: `m5-u08-remove-globals-fallbacks-engine-boundary`, review: `m5-u08-review-remove-globals-fallbacks-engine-boundary`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/250)
- [x] [M5-U09](../issues/M5-U09-DEF-016-schema-ownership-split-settings.md) — DEF‑016 + follow-ups: schema ownership split + “settings” migration (branch: `m5-u09-def-016-schema-ownership-split-settings`, review: `m5-u09-review-def-016-schema-ownership-split-settings`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/251)
- [x] [M5-U10](../issues/M5-U10-colocation-consolidation-pass.md) — colocation + consolidation pass (reduce wiring-only indirection) (branch: `m5-u10-colocation-consolidation-pass`, review: `m5-u10-review-colocation-consolidation-pass`, PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/252)
- [x] [M5-U11](../issues/M5-U11-DEF-014-foundation-inventory.md) — DEF‑014: foundation artifact inventory + consumer migration (branch: `m5-u11-def-014-foundation-inventory`)
- [ ] [M5-U12](../issues/M5-U12-DEF-010-climate-prerequisite-reification.md) — DEF‑010: climate prerequisite reification (no hidden engine-read prereqs)
- [ ] [M5-U13](../issues/M5-U13-DEF-017-strong-effect-verification.md) — DEF‑017: stronger `effect:*` verification via adapter read-back APIs + tests

## Sequencing (slices)

The units above are canonical; slices are the “how we land it” grouping. Some slices can run in parallel, but the mod‑boundary work should lead because it determines where everything belongs.

Prework for the canonical units is complete and embedded directly in each unit doc (there are no remaining “prework prompt” sections to execute).

### Execution slices (recommended ordering)

```yaml
steps:
  - slice: 0
    mode: sequential
    units: [M5-U01]
    description: Implement DEF-011 early to avoid churn during moves.

  - slice: 1
    mode: sequential
    units: [M5-U02]
    description: Establish the standard-mod boundary + invariants.

  - slice: 2
    mode: sequential
    units: [M5-U03]
    description: Move standard registry/recipes/tags into the mod.

  - slice: 3
    mode: sequential
    units: [M5-U04, M5-U05, M5-U06]
    description: Extract standard steps + domain helpers out of core.

  - slice: 4
    mode: parallel
    after_slices: [2, 3]
    units: [M5-U07]
    description: Delete dead/compat/deprecation-only surfaces.

  - slice: 5
    mode: parallel
    after_slices: [3]
    units: [M5-U08]
    description: Remove globals/fallbacks; harden engine boundary.

  - slice: 6
    mode: parallel
    after_slices: [3]
    units: [M5-U09, M5-U10]
    description: Schema ownership split + colocation/consolidation pass.

  - slice: 7
    mode: parallel
    after_slices: [3, 5]
    units: [M5-U11, M5-U12, M5-U13]
    description: Close remaining architecture deferrals (foundation/climate/effects).
```

### Slice 0 — DEF‑011 behavior fork removal

**Contains:** M5-U01.

### Slice 1 — Standard mod boundary skeleton + invariants

**Contains:** M5-U02.

### Slice 2 — Standard registry/recipes/tags extraction

**Contains:** M5-U03.

### Slice 3 — Standard step + domain extraction (core becomes structurally generic)

**Contains:** M5-U04, M5-U05, M5-U06.

### Slice 4 — Dead/compat surface deletion

**Contains:** M5-U07.

### Slice 5 — Globals/fallback removal (boring engine boundary)

**Contains:** M5-U08.

### Slice 6 — Schema split + colocation/consolidation

**Contains:** M5-U09, M5-U10.

### Slice 7 — Close remaining deferrals (foundation inventory, climate reification, stronger verification)

**Contains:** M5-U11, M5-U12, M5-U13.

## Validation gates / acceptance checks

These are the bars we use to prevent “done-ish.” The final set can be tightened during issue breakdown, but M5 should not complete without explicitly meeting them.

### Build + test gates

- Core and standard pipeline run under `MockAdapter` (standard smoke test remains green).
- The mapgen packages’ unit tests remain green on the default workspace scripts.

Suggested checks (adjust package paths once the standard mod is moved out of core):

```bash
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core test test/pipeline/standard-smoke.test.ts
```

### “No legacy surface” invariants (examples)

These are intentionally simple “red flag” checks that should be **zero hits** in runtime source by end of M5:

- No StoryTags or `state:engine.*` in mapgen-core runtime sources.
- No legacy stub exports/no-op reset hooks/back-compat type aliases in the core public surface.
- No `globalThis`-based runtime detection in core.
- No deprecated/no-op config fields shipped in the config schema.

Suggested spot checks:

```bash
rg -n "state:engine\\." packages/mapgen-core/src
rg -n "StoryTags" packages/mapgen-core/src
rg -n "globalThis" packages/mapgen-core/src
rg -n "@deprecated|deprecated: true" packages/mapgen-core/src
test ! -d packages/mapgen-core/src/mods/standard
```

## Scope notes

### Does CIV‑70 landing change this M5 scope?

Yes, but in a healthy way: it removes an entire category of “still on the old contract” cleanup. With CIV‑70 complete, M5 no longer needs to do the `state:engine.* → effect:*` migration itself. What remains is the *quality* of the `effect:*` verification story (DEF‑017), not the existence of the new contract.
