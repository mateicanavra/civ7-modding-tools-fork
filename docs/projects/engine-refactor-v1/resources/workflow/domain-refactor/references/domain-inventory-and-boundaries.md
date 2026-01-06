# Domain Inventory + Boundaries (Reference)

Before implementing, produce a domain inventory (in the issue doc or spike notes). This is not optional; it is the primary derisking artifact.

This doc contains:
- the **inventory outputs** you must produce before coding,
- the **search/command kit** for finding callsites and boundary violations,
- and the **boundary violations** you must drive to zero inside scope.

Canonical references:
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-030-operation-inputs-policy.md`

## Tooling and investigation discipline

Use the code-intel MCP server for codebase understanding:
- symbol discovery, reference tracing, call/import graphs, and intent search.

Use native tools only when semantics don’t matter:
- raw file inspection, quick greps, and local checks in the active worktree.

You must ground any decision in **repo evidence**:
- a file path + symbol + callsite reference (no “I think” refactors).

Minimum investigation outputs (you must produce these artifacts in the issue doc before coding):
- A complete step map for the domain (all callsites).
- A complete dependency contract list (requires/provides keys, ownership, validators, producers/consumers).
- A complete config map (schemas, defaults, resolvers, and any runtime fixups to delete).
- A typed-array inventory (ctor + length coupling + where validation occurs).
- A deletion list with “around-the-block” references (symbols + file paths that must go to zero).

## Repo map + placeholders (this repo)

Copy/paste shell variables for searches:
```bash
DOMAIN="<domain>" # e.g. foundation | morphology | narrative | hydrology | placement
DOMAIN_ROOT="mods/mod-swooper-maps/src/domain/${DOMAIN}"
RECIPE_ROOT="mods/mod-swooper-maps/src/recipes/standard"

# Domain → stage roots (standard recipe)
case "${DOMAIN}" in
  foundation) STAGE_ROOTS=("${RECIPE_ROOT}/stages/foundation") ;;
  morphology) STAGE_ROOTS=("${RECIPE_ROOT}/stages/morphology-pre" "${RECIPE_ROOT}/stages/morphology-mid" "${RECIPE_ROOT}/stages/morphology-post") ;;
  narrative) STAGE_ROOTS=("${RECIPE_ROOT}/stages/narrative-pre" "${RECIPE_ROOT}/stages/narrative-mid" "${RECIPE_ROOT}/stages/narrative-swatches" "${RECIPE_ROOT}/stages/narrative-post") ;;
  hydrology) STAGE_ROOTS=("${RECIPE_ROOT}/stages/hydrology-pre" "${RECIPE_ROOT}/stages/hydrology-core" "${RECIPE_ROOT}/stages/hydrology-post") ;;
  placement) STAGE_ROOTS=("${RECIPE_ROOT}/stages/placement") ;;
  *) echo "Unknown DOMAIN: ${DOMAIN}" >&2; exit 1 ;;
esac
```

## Inventory search starter kit

Use `scripts/lint/lint-domain-refactor-guardrails.sh` as the canonical gate after each slice. Avoid copying static `rg` lists into workflow docs.

If you need ad-hoc searches during inventory work, keep them in the issue/spike notes (so they can be tailored to the domain’s reality). Common starting points:
- Step callsites that import the domain:
  ```bash
  rg -n "@mapgen/domain/${DOMAIN}\\b" "${RECIPE_ROOT}" -S
  ```
- Cross-domain imports (coupling) inside the domain library:
  ```bash
  rg -n "@mapgen/domain/" "${DOMAIN_ROOT}" -S
  ```
- Legacy config bundle imports in steps (pre-refactor surface; should disappear for migrated steps):
  ```bash
  rg -n "@mapgen/domain/config\\b" "${STAGE_ROOTS[@]}" -S
  ```

## Required inventory outputs (no skipping)

### A) Step map (all callsites)

For every step that touches the domain:
- step id (`<recipe>.<stage>.<step>`)
- file path
- `requires: [...]`
- `provides: [...]`
- which domain logic it currently calls (functions/modules)

### B) Dependency contracts (keys + ownership)

For each `requires`/`provides` key:
- key string
- kind (`artifact:` / `buffer:` / `effect:` / `field:`)
- owner (step/stage/domain)
- runtime satisfaction/validators (if any)
- producer step(s) and consumer step(s)

### C) Config surfaces (all schemas + defaults)

For each step and each candidate op:
- config schema location (op `contract.ts`, step `contract.ts`)
- schema defaults (TypeBox defaults)
- any runtime merges/defaulting (must be eliminated)
- any scaling semantics (must move into `resolveConfig`)

### D) Typed arrays + invariants

Inventory every typed array used in the domain boundary:
- ctor (`Uint8Array`, `Int16Array`, `Float32Array`, etc.)
- expected length invariants (e.g. `width * height`)
- where validation currently happens (or is missing)

Policy:
- typed arrays in op schemas use `TypedArraySchemas.*` and are validated via canonical validators (ADR-ER1-030).

### E) Boundary violations to eliminate

List and link every instance of:
- adapter/context crossing into domain logic,
- callback “views” passed into domain functions,
- RNG callbacks/state crossing into domain logic (e.g. `options.rng`, `ctx.rng`),
- runtime config fixups/merges inside op/domain code.

## Slicing plan (required before implementation)

Based on the inventory, define agent-chosen slices (A/B/C…).

For each slice, record:
- step(s) included (ids + file paths),
- op(s) to create/modify (ids + kinds),
- legacy entrypoints to delete in that slice,
- tests to add/update,
- which domains to run guardrails for (`REFRACTOR_DOMAINS=...`).
