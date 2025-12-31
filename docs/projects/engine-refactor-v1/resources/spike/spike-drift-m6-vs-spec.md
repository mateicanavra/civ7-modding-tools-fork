# Spike (Drift): M6 Implementation vs Target Expectations

This file is a curated extraction of **drift observations** (where current implementation diverges from intended/expected target direction) from:
- SPIKE-m6-architecture-spec-prework-audit (archived)

It intentionally omits target directives/design decisions (see `spike-target.md`).

---

### Notable drift worth calling out

- ADR intent says “settings, not `ctx.config`” for cross-cutting directionality, but M6 still reads `ctx.config` in 2 places:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts`
  - `mods/mod-swooper-maps/src/domain/narrative/tagging/rifts.ts`



### Implications of the current shape

- Map authoring (today) is primarily “**MapGenConfig-shaped overrides**” (`StandardRecipeOverrides = DeepPartial<MapGenConfig>`), not recipe config.
  - `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts`
  - Example maps: `mods/mod-swooper-maps/src/maps/*.ts`
- The recipe config is **hand-mapped** from `MapGenConfig` into stage/step configs (`buildStandardRecipeConfig`).
- `ExtendedMapContext.config` is **not validated/defaulted** on the standard runtime path; it’s just the overrides object cast to `MapGenConfig`.
  - This is called out as triage:
    - triage (“Map overrides mapped directly to recipe config … pass overrides into ExtendedMapContext.config”)



### Why this is still a real question even though “context holds the world”

Today, “settings” exists as a validated run input and as part of plan identity, but it is **not attached to the runtime context**, so step code can’t read it even though it is conceptually “global for the run.” That gap is exactly why `ctx.config` reads survived (and why directionality was duplicated into step configs).



### Current state (M6 reality)

M6 uses `context.artifacts` as the only general-purpose cross-step registry for dependency satisfaction. As a result:

- “Artifact dependencies” are sometimes used as a proxy for “this buffer is ready”.
  - Example: the standard recipe publishes heightfield/climate buffers into `context.artifacts` (e.g. “artifact:heightfield”, “artifact:climateField”) by storing references to typed arrays.
- Foundation publishes large tensor buffers (`plates`, `dynamics`) into artifacts for downstream gating, even though they are typed arrays by nature.

### Why current state exists (cutover/transition reasons)

The dependency system has explicit dependency kinds (`artifact` / `field` / `effect`) and can validate satisfaction via `satisfies(context)`.

However, there is no first-class “buffer readiness” dependency surface for intermediate/staging buffers. The artifact store became the default place to put “things steps want to depend on”, even when those things are mutable buffers.

### Why this was a mistake (or, more precisely, a transitional hack)

Publishing buffers as artifacts creates a semantic collision:

- Artifacts are intended to be stable published products; buffers are intentionally mutable.
- Buffer-as-artifact makes immutability enforcement either impossible or expensive (deep cloning typed arrays would be a semantic and performance shift).
- It blurs boundaries and makes “what is safe to mutate?” unclear, increasing black-ice risk.


- Stage modules import steps via `steps/index.ts` re-export barrels (overhead with low value):
  - Example: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/index.ts`


- `@swooper/mapgen-core/engine` (2) — **leaks** (`RunSettings`, `DependencyTagDefinition`, `TagOwner`)
