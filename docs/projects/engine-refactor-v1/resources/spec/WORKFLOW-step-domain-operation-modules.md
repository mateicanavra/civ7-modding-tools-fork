# WORKFLOW: Refactor a Domain to Operation Modules (Canonical)

This is the **canonical, end-to-end workflow** for refactoring **one MapGen domain** so it conforms to the target “step ↔ domain contracts via operation modules” architecture.

Ecology is the **golden reference** for final form; use it as proof of what “done” looks like.

---

## -1) Repo map + placeholders (this repo)

Use these as the **literal roots** when executing this workflow in `civ7-modding-tools`.

- Standard content package:
  - Package root: `mods/mod-swooper-maps/` (see `mods/mod-swooper-maps/AGENTS.md`)
  - Code root: `mods/mod-swooper-maps/src/`
  - Generated artifacts: `mods/mod-swooper-maps/mod/` (read-only; never hand-edit)
- Core SDK:
  - Package root: `packages/mapgen-core/`
  - Authoring contracts: `packages/mapgen-core/src/authoring/` (`createStep`, `createOp`)
  - Plan compilation (config canonicalization boundary): `packages/mapgen-core/src/engine/execution-plan.ts`
- Standard recipe (stage braid reality):
  - Recipe root: `mods/mod-swooper-maps/src/recipes/standard/`
  - Stage order source of truth: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`
- Domains:
  - Domain root: `mods/mod-swooper-maps/src/domain/<domain>/`
  - Domain ops: `mods/mod-swooper-maps/src/domain/<domain>/ops/**`
- Tracking docs:
  - Domain issue docs: `docs/projects/engine-refactor-v1/issues/**`
  - Cross-cutting decision log: `docs/projects/engine-refactor-v1/triage.md`

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

## 0) Mission + hard constraints (do not skip)

### Mission

Refactor a single domain so that:
- **All domain logic is behind operation contracts** (`mods/mod-swooper-maps/src/domain/<domain>/ops/**`).
- **Steps are orchestration only** (build inputs → call ops → apply/publish).
- **Configs are plan-truth canonicalized** at compile time (schema defaults + clean + `resolveConfig`), and runtime does not “fix up” config.
- **Legacy paths are removed** within the refactor scope (“scorched earth”).

Execution posture:
- Proceed **end-to-end without pausing for feedback**.
- Only stop if continuing would cause dangerous side effects (data loss, breaking public contracts without updating consumers, or violating the canonical spec/ADRs).

### Non-negotiable invariants (target architecture)

1) **Ops are the contract**
- Steps depend on operations, not on internal domain helpers/strategies/rules.
- Every op is schema-backed and exposes `run`, `validate`, and `runValidated` (see `SPEC-step-domain-operation-modules.md`).

2) **No runtime views cross the op boundary**
- Op inputs/outputs/config are **POJO / POJO-ish** only (plain objects + typed arrays).
- No adapters, callbacks, or runtime “views” in op contracts (ADR-ER1-030).

3) **Config colocation is mandatory**
- Op schemas, defaults, and config resolution live **with the op module** (domain-owned scaling semantics).
- Step schemas import op `config` and `defaultConfig` directly; steps do not re-author wrappers unless step-local options are genuinely step-owned.
- Do not centralize domain resolvers/schemas in recipe roots or “config registries” (see `SPEC-global-invariants.md`).

4) **Plan-truth config canonicalization**
- The compiler produces **final node configs** in the `ExecutionPlan` (ADR-ER1-035).
- Compile-time resolution happens via:
  - optional `step.resolveConfig(stepConfig, settings)` (composition point), and
  - optional `op.resolveConfig(opConfig, settings)` (domain-owned scaling semantics).
- Runtime steps treat `node.config` as “the config” and do not branch on “resolver existence”.

5) **Scorched earth within scope**
- No “old/new” dual paths, compatibility shims, translator layers, fallback behaviors, or DeepPartial override blobs.
- After each removal, do “around-the-block” cleanup: delete dead exports, imports, docs, tests, and helpers now made obsolete.

6) **Router compliance (AGENTS.md is law)**
- Before editing any file, read the closest `AGENTS.md` router that scopes that file.
- For this work you will always need at least:
  - repo root `AGENTS.md`,
  - `mods/mod-swooper-maps/AGENTS.md`,
  - and often `mods/mod-swooper-maps/src/config/AGENTS.md` when touching config exports.

### Decision discipline (no branching instructions)

If you hit an ambiguity:
- Prefer the **ecology pattern** and the **spec/ADR text** over local legacy precedent.
- Make a single choice, implement it, and update the issue/spike notes so the next domain doesn’t re-litigate it.
- Do not add “options” or “maybe paths” to workflow/issue instructions; the output must remain implementable without guessing.

### Where to record decisions (canonical locations)

- Domain-local decisions: append to the domain’s local issue doc under `## Implementation Decisions`.
  - Location: `docs/projects/engine-refactor-v1/issues/**`
- Cross-cutting decisions (affect other domains/stages): add an entry in `docs/projects/engine-refactor-v1/triage.md`.

---

## 1) Canonical references (read first; do not reinterpret)

Required:
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-034-operation-kind-semantics.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-030-operation-inputs-policy.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-global-invariants.md`
- `docs/projects/engine-refactor-v1/triage.md` (cross-cutting decisions and ongoing risk notes)
- `mods/mod-swooper-maps/AGENTS.md` and closest scoped routers for touched files
- `mods/mod-swooper-maps/src/config/AGENTS.md` when touching standard config exports

Code references (read when implementing; these are the “truth of behavior”):
- `packages/mapgen-core/src/engine/execution-plan.ts` (where `step.resolveConfig` is invoked at compile time)
- `packages/mapgen-core/src/authoring/op.ts` (op contract: `createOp`, `resolveConfig`, `defaultConfig`)
- `packages/mapgen-core/src/authoring/validation.ts` (error surface, `customValidate`, `validateOutput`)
- `packages/mapgen-core/src/authoring/typed-array-schemas.ts` (typed-array schema metadata used by validation)

Golden reference:
- Ecology domain (the post-U10, op-module refactor form is the template).

Sequencing helper (domain braid reality):
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-refactor-sequencing.md`
- Standard recipe stage order: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`

---

## 2) Tooling and investigation discipline

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

---

## 3) Graphite + worktree loop (repeat for each subissue)

This workflow is executed inside an **isolated git worktree**; the primary worktree stays clean.

### 3.1 Preflight (primary worktree)

Run and stop if dirty:
```bash
git status
gt ls
git worktree list
```

Sync trunk metadata without restacking:
```bash
gt sync --no-restack
```

### 3.2 Create a new layer branch + worktree (per subissue)

Create a new branch from the stack tip (parent is the current stack tip), then create a worktree:
```bash
git worktree add -b dev-<milestone>-<domain>-<subissue> ../wt-dev-<milestone>-<domain>-<subissue> <parent-branch>
cd ../wt-dev-<milestone>-<domain>-<subissue>
gt track
```

Patch-path guard (mandatory):
- Only edit files inside the worktree path.
- If your harness requires it, use **absolute paths** for patches.

Install dependencies (in the worktree) if needed for checks:
```bash
pnpm install
```

### 3.3 Commit rules (per subissue)

Each subissue must end in a clean, reviewable commit:
```bash
gt add -A
gt modify --commit -am "refactor(<domain>): <subissue summary>"
```

If you need an additional layer for the next subissue, repeat 3.2 to create a new stacked branch.

---

## 4) Domain inventory (required outputs; “black ice” elimination)

Before implementing, produce a domain inventory (in the issue doc or spike notes). This is not optional; it is the primary derisking artifact.

### Inventory command kit (copy/paste)

Locate all step callsites that import or call into the domain:
```bash
rg -n "@mapgen/domain/${DOMAIN}\\b" "${RECIPE_ROOT}" -S
```

Locate cross-domain imports (coupling) inside the domain library:
```bash
rg -n "@mapgen/domain/" "${DOMAIN_ROOT}" -S
```

Locate legacy step→domain boundary violations (adapter/context passed into domain functions):
```bash
rg -n "ExtendedMapContext|context\\.adapter|\\badapter\\b|@civ7/adapter" "${DOMAIN_ROOT}" -S
```

Locate legacy step config imports from the centralized schema bundle (refactor removes these from refactored steps):
```bash
rg -n "@mapgen/config\\b" "${STAGE_ROOTS[@]}" -S
```

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
- config schema location
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
- runtime config fixups/merges inside op/domain code.

---

## 5) Target op surface design (fixed rule set)

Define the target op catalog for the domain, with **no optionality**:
- Each op has an explicit `kind`: `plan | compute | score | select` (ADR-ER1-034).
- Each op lives in its own module under `mods/mod-swooper-maps/src/domain/<domain>/ops/**` (one op per module).
- Each op owns:
  - `input` schema
  - `output` schema
  - `config` schema
  - `defaultConfig` (derived from schema defaults)
  - optional `resolveConfig(config, settings)` (compile-time only)
- Steps call `op.runValidated(input, resolvedConfig)`; steps do not call internal rules directly.

Naming constraints:
- Op ids are stable and verb-forward (e.g., `compute*`, `plan*`, `score*`, `select*`).
- Strategy selection exists only when there are truly multiple implementations; otherwise keep config flat.

---

## 6) Config canonicalization rules (post-U10)

This is the mandatory pipeline; do not invent a parallel system.

### 6.1 Defaults and cleaning: TypeBox-native

Plan compilation defaults and cleans config via TypeBox `Value.*` utilities (ADR-ER1-035).

Rules:
- Put **local, unconditional defaults** in the schema (TypeBox `default`).
- Put **settings-derived defaults** in `resolveConfig` (op-level, composed by step-level `resolveConfig`).
- Do not implement meaning-level defaults in runtime step or op `run(...)` (`?? {}` merges and `Value.Default(...)` in runtime paths are migration smells).

### 6.2 Resolution location (colocation + composition)

Domain-owned scaling semantics live with the op:
- `mods/mod-swooper-maps/src/domain/<domain>/ops/**` exports `resolveConfig` (optional) next to `config` and `defaultConfig`.

Step-level composition is the only place ops are combined:
- `step.resolveConfig(stepConfig, settings)` fans out to each op’s `resolveConfig` and recomposes a step config that still validates against the step schema.

Hard rule:
- Resolvers and schemas are not centralized in recipe roots or shared “resolver registries”; they live with the domain operations that own the semantics.

### 6.3 Compile-time enforcement reality (must match engine behavior)

- `step.resolveConfig` is executed during plan compilation in `packages/mapgen-core/src/engine/execution-plan.ts`.
- If a step defines `resolveConfig` it must also define a schema (`createStep({ schema: ... })`), otherwise plan compilation produces `step.resolveConfig.failed` with message `resolveConfig requires configSchema`.
- The engine normalizes the resolver output through the same schema again (defaults/cleaning + unknown-key checks). Resolver output must remain schema-valid and must not add internal-only fields.

### 6.4 Allowed vs forbidden merges (resolver vs runtime)

- Allowed: object spread/merge inside `resolveConfig` (compile-time shaping).
- Forbidden: object spread/merge used to “default” config in runtime `run(...)` paths (step or op).

### 6.5 Standard content config exports (avoid duplication)

Standard config schema exports live under `mods/mod-swooper-maps/src/config/schema/**`.

Rule:
- When an op owns a config schema, the standard config schema module must **re-export** it from the domain op, not re-author it.

Reference example (thin re-export pattern):
- `mods/mod-swooper-maps/src/config/schema/ecology.ts`

Concrete expectation:
- Refactored steps import op config/defaults from the domain module (`@mapgen/domain/<domain>`, via `domain.ops.*`).
- The config schema bundle (`@mapgen/config`) remains the canonical author-facing schema surface, but it sources shapes from domain ops and domain config modules.

---

## 7) Implementation loop (subissue by subissue; no batching)

Refactor is executed as a series of subissues. Each subissue ends in:
- code complete,
- tests updated/added,
- dead weight removed,
- guardrails re-run,
- committed.

### Subissue template (repeat)

1) **Extract op module**
- Create a new op module under `mods/mod-swooper-maps/src/domain/<domain>/ops/**`.
- Use a directory-based module for every op (no re-export shim files):
  - `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/schema.ts` (TypeBox schemas + `Static` types)
  - `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/index.ts` (exports exactly one op via `createOp`)
  - internal helpers live under:
    - `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/rules/**` (pure rules)
    - `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/strategies/**` (strategy implementations)
- Move domain logic under `run(...)` (pure).
- Define `input`, `output`, `config` schemas and `defaultConfig`.
- Use `createOp` from `@swooper/mapgen-core/authoring` and wire any cheap semantic checks via `customValidate` (see `packages/mapgen-core/src/authoring/validation.ts`).

Illustrative skeleton (trimmed; do not invent extra surfaces):
```ts
export const myOp = createOp({
  kind: "compute",
  id: "<domain>/<area>/<verb>",
  input: Type.Object({ width: Type.Integer(), height: Type.Integer(), field: TypedArraySchemas.u8() }, { additionalProperties: false }),
  output: Type.Object({ out: TypedArraySchemas.u8() }, { additionalProperties: false }),
  config: Type.Object({ knob: Type.Optional(Type.Number({ default: 1 })) }, { additionalProperties: false, default: {} }),
  resolveConfig: (cfg, settings) => ({ ...cfg }), // compile-time only
  customValidate: (input, cfg) => [],             // optional, returns pathful errors
  run: (input, cfg) => ({ out: input.field }),
} as const);
```

2) **Wire step orchestration**
- Promote the refactored step into a step module directory (ecology is the reference pattern):
  - Example: `mods/mod-swooper-maps/src/recipes/standard/stages/<stage>/steps/<step>/index.ts`
- Create these modules inside the step directory (fixed structure):
  - `index.ts` (orchestration only)
  - `inputs.ts` (runtime binding: artifacts/adapters → POJO inputs)
  - `apply.ts` (runtime writes + artifact publication)
- Build POJO inputs in `inputs.ts`.
- Call `op.runValidated(input, config)` in runtime steps (input/config validation is required).
- Apply/publish in `apply.ts`.
- Ensure step schema imports op `config`/`defaultConfig` directly from the domain module (see ecology step patterns).
- Implement `step.resolveConfig` if the step composes multiple ops or requires settings-derived defaults.

Reference examples (copy the boundary discipline):
- Op module: `mods/mod-swooper-maps/src/domain/ecology/ops/classify-biomes/index.ts`
- Step directory + resolver composition: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`

3) **Delete legacy**
- Remove the old entrypoints for the extracted logic (no “compat exports”).
- Remove dead helpers, adapters, translators, and unused exports.

4) **Add tests**
- Add at least one domain-local unit test for the op contract.
  - Use `op.runValidated(input, config, { validateOutput: true })` to catch output-shape drift.
  - Location (mod): `mods/mod-swooper-maps/test/**` (bun test runner via `pnpm -C mods/mod-swooper-maps test`).
- If the subissue affects artifact contracts across steps, add one minimal pipeline/integration test for the braid edge.

5) **Run guardrails**
- Search for forbidden patterns in the touched scope and drive them to zero:
  - runtime config merges (`?? {}`, spread merges of config shells),
  - adapter/context crossing into domain logic,
  - old entrypoint imports.

6) **Commit**
- Conventional commit message, scoped to the domain + subissue.

### Guardrail searches (must go to zero in the touched scope)

Run these after each subissue and at the end; for every remaining hit, either delete the code path or move it back to the correct boundary.

Domain must not depend on adapter/runtime:
```bash
rg -n "ExtendedMapContext|context\\.adapter|\\badapter\\b|@civ7/adapter" "${DOMAIN_ROOT}" -S
```

Domain must not import engine/runtime values (type-only imports of `RunSettings` are allowed; runtime imports are forbidden):
```bash
rg -n "from \"@swooper/mapgen-core/engine\"|from \"@mapgen/engine\"" "${DOMAIN_ROOT}" -S
rg -n -P "import(?!\\s+type)\\s+.*from\\s+\"@swooper/mapgen-core/engine\"" "${DOMAIN_ROOT}" -S
rg -n -P "import(?!\\s+type)\\s+.*from\\s+\"@mapgen/engine\"" "${DOMAIN_ROOT}" -S
```

Refactored steps must not import legacy domain entrypoints or centralized config blobs:
```bash
rg -n "@mapgen/config\\b" "${STAGE_ROOTS[@]}" -S
rg -n "@mapgen/domain/${DOMAIN}/" "${STAGE_ROOTS[@]}" -S
```

Runtime config defaulting/merging must not exist in step/op `run(...)` paths:
```bash
rg -n "\\?\\?\\s*\\{\\}" "${DOMAIN_ROOT}" "${STAGE_ROOTS[@]}" -S
rg -n "\\bValue\\.Default\\(" "${DOMAIN_ROOT}" "${STAGE_ROOTS[@]}" -S
```

Refactored steps must not cast config to recover type safety (remove `as SomeConfig` and use schema-derived types):
```bash
rg -n "\\bas\\s+[A-Za-z0-9_]+Config\\b" "${STAGE_ROOTS[@]}" -S
```

---

## 8) Verification gates (must be green)

Run smallest-first, then widen:
```bash
pnpm -C packages/mapgen-core check
pnpm -C packages/mapgen-core test
pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build
pnpm check
pnpm test
pnpm build
```

If mod packaging is part of the touched surface:
```bash
pnpm deploy:mods
```

---

## 9) “Around-the-block” cleanup checklist (required at the end)

After the domain refactor lands:
- remove now-unused shared helpers that existed only to support legacy paths,
- remove duplicate map entrypoint wiring that is now redundant,
- remove obsolete exports/re-exports that bypass the op boundary,
- remove stale docs references and update any canonical docs that named legacy structures.

The domain is not “done” until the surrounding callsites are also cleaned.

---

## 10) Submission (Graphite)

Submit the stack as draft immediately after the final verification gates are green:
```bash
gt ss --draft
```

Include in the PR notes:
- what was deleted (scorched earth inventory),
- what contracts changed (requires/provides, artifact shapes, config keys),
- what tests were added and how to run them.

After submission:
- Remove only the worktrees you created for this refactor.
- Confirm `git worktree list` is clean and `gt ls` matches the expected stack state.
