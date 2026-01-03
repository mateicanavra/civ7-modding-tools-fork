# WORKFLOW: Refactor a Domain to Operation Modules (Canonical)

This is the **canonical, end-to-end workflow** for refactoring **one MapGen domain** so it conforms to the target “step ↔ domain contracts via operation modules” architecture.

Ecology is the **golden reference** for final form; use it as proof of what “done” looks like.

---

## 0) Mission + hard constraints (do not skip)

### Mission

Refactor a single domain so that:
- **All domain logic is behind operation contracts** (`domain/<name>/ops/**`).
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

### Decision discipline (no branching instructions)

If you hit an ambiguity:
- Prefer the **ecology pattern** and the **spec/ADR text** over local legacy precedent.
- Make a single choice, implement it, and update the issue/spike notes so the next domain doesn’t re-litigate it.
- Do not add “options” or “maybe paths” to workflow/issue instructions; the output must remain implementable without guessing.

---

## 1) Canonical references (read first; do not reinterpret)

Required:
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-034-operation-kind-semantics.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-030-operation-inputs-policy.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-global-invariants.md`

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
- Each op lives in its own module under `domain/<domain>/ops/**` (one op per module).
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
- `domain/<domain>/ops/<op>.ts` exports `resolveConfig` (optional) next to `config` and `defaultConfig`.

Step-level composition is the only place ops are combined:
- `step.resolveConfig(stepConfig, settings)` fans out to each op’s `resolveConfig` and recomposes a step config that still validates against the step schema.

Hard rule:
- Resolvers and schemas are not centralized in recipe roots or shared “resolver registries”; they live with the domain operations that own the semantics.

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
- Create `domain/<domain>/ops/<op>.ts`.
- Move domain logic under `run(...)` (pure).
- Define `input`, `output`, `config` schemas and `defaultConfig`.
- Add/port typed-array validators and any cheap semantic checks via op validation hooks.

2) **Wire step orchestration**
- Build POJO inputs in step-local `inputs.ts` (or equivalent).
- Call `op.runValidated(...)`.
- Apply/publish in step-local `apply.ts` (or equivalent).
- Ensure step config schema imports op `config`/`defaultConfig`.
- Implement `step.resolveConfig` if the step composes multiple ops or requires settings-derived defaults.

3) **Delete legacy**
- Remove the old entrypoints for the extracted logic (no “compat exports”).
- Remove dead helpers, adapters, translators, and unused exports.

4) **Add tests**
- Add at least one domain-local unit test for the op contract (prefer `op.runValidated(..., { validateOutput: true })` when available).
- If the subissue affects artifact contracts across steps, add one minimal pipeline/integration test for the braid edge.

5) **Run guardrails**
- Search for forbidden patterns in the touched scope and drive them to zero:
  - runtime config merges (`?? {}`, spread merges of config shells),
  - adapter/context crossing into domain logic,
  - old entrypoint imports.

6) **Commit**
- Conventional commit message, scoped to the domain + subissue.

---

## 8) Verification gates (must be green)

Run smallest-first, then widen:
```bash
pnpm -C packages/mapgen-core test
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build
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
