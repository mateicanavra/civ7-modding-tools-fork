---
id: M5-U03
title: "[M5] Move standard registry + recipes + tags into the standard mod"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Packaging]
parent: null
children: []
blocked_by: [M5-U02]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Move “standard defaults” (registry, tags, recipes) out of core so the mod boundary becomes real at the registration layer.

## Goal

Core stops owning the standard pipeline’s identity. The standard mod owns its tags/recipes/registrations; core provides only the mechanism.

## Deliverables

- Move standard-domain tag definitions and recipe definitions into the standard mod package.
- Move standard registry instantiation/registration into the standard mod package.
- Invert remaining import edges so core no longer depends on standard-domain registration modules.

## Acceptance Criteria

- Core no longer exports or instantiates the standard registry as a built-in default.
- Standard recipes live in the standard mod package and are selected via mod-owned wiring.
- Tags that represent standard-domain concepts are mod-owned; core retains only generic tag infrastructure.

## Testing / Verification

- Standard pipeline can still compile and execute via the mod boundary.
- Standard smoke test remains green under `MockAdapter`.

## Dependencies / Notes

- **Blocked by:** M5-U02 (standard mod boundary skeleton).
- **Paper trail:** M4 packaging precedent (CIV-57) + M5 spike.
- **Complexity × parallelism:** high complexity, medium parallelism (large surface move, but mostly mechanical once boundaries are explicit).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Treat this as “standard ownership lives with the mod.” If a tag/recipe is about domain semantics, it should not live in core.
- Be careful not to accidentally re-encode standard ownership by leaving “default registry” helpers in core.

## Prework Prompt (Agent Brief)

Goal: identify everything that is truly “standard-owned” at the registration layer and enumerate the import inversions required.

Deliverables:
- An inventory of all standard-owned registry/tag/recipe modules.
- A list of remaining “core depends on standard” import edges (direct and transitive) that must be inverted.
- A short note flagging any modules that look “core-ish” but are actually standard-domain concepts (so they must move).

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

Goal: enumerate what is truly “standard-owned” at the registration layer (tags/recipes/registry/phase ids) and list the import edges that keep core coupled to standard today.

### 1) Inventory: standard-owned modules (current locations)

#### Standard mod object + recipes

| Module | What it owns today | Notes |
| --- | --- | --- |
| `packages/mapgen-core/src/mods/standard/mod.ts` | `standardMod` object (`id`, `registry`, `recipes.default`) | This is the “built-in standard mod” surface. |
| `packages/mapgen-core/src/mods/standard/recipes/default.ts` | `defaultRecipe: RecipeV1` with `id: "core.standard"` | Standard recipe identity + ordering. |
| `packages/mapgen-core/src/mods/standard/registry/index.ts` | `registry.register(...)` → `registerStandardLibrary(...)` | Binds “standard mod registry” to the standard library registration wiring. |

#### Standard registration wiring (layer registration)

| Module | What it owns today | Notes |
| --- | --- | --- |
| `packages/mapgen-core/src/pipeline/standard-library.ts` | `registerStandardLibrary(...)` | Hard-codes that “standard == these layers”. Should move into the standard mod package. |
| `packages/mapgen-core/src/pipeline/foundation/index.ts` (and `morphology/`, `hydrology/`, `narrative/`, `ecology/`, `placement/`) | `register*Layer(...)` wiring | These are “standard pipeline composition” modules; after extraction they should be mod-owned. |

#### Standard phases + dependency spine

| Module | What it owns today | Notes |
| --- | --- | --- |
| `packages/mapgen-core/src/pipeline/standard.ts` | `M3_STANDARD_STAGE_PHASE` and `M3_STAGE_DEPENDENCY_SPINE` | Standard-stage naming, phases, and requires/provides descriptors are standard-owned concepts. |

#### Standard tags + effect definitions

| Module | What it owns today | Notes |
| --- | --- | --- |
| `packages/mapgen-core/src/pipeline/tags.ts` | `M3_DEPENDENCY_TAGS` + `M4_EFFECT_TAGS` + `DEFAULT_TAG_DEFINITIONS` | Contains domain-specific tags (narrative motifs, placement artifacts, engine effects). Tag *infrastructure* (`TagRegistry`) can remain core, but the “default tag catalog” is standard-owned. |

### 2) Core → standard coupling edges to invert (direct + “looks core-ish”)

Direct imports that encode “standard is built-in”:
- `packages/mapgen-core/src/orchestrator/task-graph.ts` imports:
  - `standardMod` (`@mapgen/mods/standard/mod.js`)
  - `M3_STAGE_DEPENDENCY_SPINE` (`@mapgen/pipeline/standard.js`)
- `packages/mapgen-core/src/index.ts` re-exports `standardMod`.
- `packages/mapgen-core/src/pipeline/index.ts` re-exports `M3_STANDARD_STAGE_PHASE` and `M3_STAGE_DEPENDENCY_SPINE` from `pipeline/standard.ts`.

Transitive / “fractal” couplings that will surface during extraction:
- Step implementations are phase-stamped with `M3_STANDARD_STAGE_PHASE.*`:
  - All `packages/mapgen-core/src/pipeline/**/*Step.ts` imports `M3_STANDARD_STAGE_PHASE` (standard-owned once the boundary is real).
- Domain code publishes standard-owned artifacts by importing standard tags:
  - Example: `packages/mapgen-core/src/domain/narrative/orogeny/belts.ts` imports `M3_DEPENDENCY_TAGS` to publish `artifact:narrative.motifs.*@v1`.
  - Similar pattern exists in other narrative/placement artifacts writers.

Implication for implementation (what must change when tags move):
- Standard-domain code needs either:
  - a mod-owned tag catalog module (imported only by standard mod code), or
  - tag IDs passed in / imported from a “standard contract” package (owned by the standard mod, not by core).

### 3) “Core-ish but standard” callouts (easy to accidentally keep in core)

These *look* like generic pipeline infra, but are standard ownership:
- `packages/mapgen-core/src/pipeline/standard.ts` (stage names/phases/spine)
- `packages/mapgen-core/src/pipeline/standard-library.ts` (register standard layers)
- `packages/mapgen-core/src/pipeline/tags.ts` (default tag ids + standard artifact/effect catalog)
- `packages/mapgen-core/src/orchestrator/task-graph.ts` `buildStandardStepConfig(...)` (step-id → config wiring is standard-specific)
