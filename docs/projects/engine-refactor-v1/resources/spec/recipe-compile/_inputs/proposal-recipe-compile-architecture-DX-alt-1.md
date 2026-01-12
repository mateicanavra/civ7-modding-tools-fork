Some earlier uploads in this project have expired, but the **legacy SPEC files you just attached are present** in the repo snapshot I can read. I used those as the source of truth for the “baseline DX rules,” then reconciled them with the new canonical architecture (without changing architecture decisions).

Below is the result in two parts:

1. **Baseline DX rules extracted from the legacy spec** (what we must preserve).
2. **Updated conventions compatible with the new architecture**, with **unambiguous file layout + import rules**, including the “domain-level import” correction you called out.

---

# 1) Baseline DX rules extracted from the legacy spec

## 1.1 Packaging boundaries and allowed imports

* `src/domain/**` is **recipe-independent**; it may be imported by `recipes/**` and `maps/**`, but must not import from them.
* `src/recipes/**` owns wiring and may import from `domain/**` and core SDK, but must not import from `maps/**`. 
* Use **stable aliases** for cross-module imports:

  * `@mapgen/domain/*` → `src/domain/*`
  * Authoring imports use `@swooper/mapgen-core/authoring` (no content-local authoring alias).
  * Keep **relative imports inside a single op or step directory**.

## 1.2 Colocation and “no mega-modules”

* “Centralized mega-modules are forbidden”: no mod-wide config loader, no recipe-root tag/artifact catalogs, no cross-stage god files.
* Barrels (`index.ts`) must be **thin explicit re-exports only**—no side-effect registration, no hidden aggregation.
* Shared schema/type-only fragments can live in `src/domain/config.ts` and be imported via `@mapgen/domain/config`, but must remain **schema/type-only** (not a runtime config blob).

## 1.3 Canonical operation module structure

Legacy spec is explicit that an operation module lives under `domain/<domain>/ops/<op>/` and exports exactly one op. Canonical files: `contract.ts`, `types.ts`, `rules/**` (+ `rules/index.ts`), `strategies/**` (+ `strategies/index.ts`), `index.ts`.

Rules:

* Rules are op-local and imported via `rules/index.ts`. 
* Strategies are internal; steps select via config, not by importing strategies.
* `rules/**` never import `contract.ts` and never export types; shared types live in `types.ts` only.

## 1.4 Canonical step module structure

Steps are directories under `stages/<stageId>/steps/<stepId>/` with:

* `contract.ts` — step-owned contract surface (schema + tags/ids/helpers/validators)
* `index.ts` — orchestration via `createStep(contract, { ... })`
* `lib/**` — step-local helpers (pure or orchestration helpers)

Critically: **contract.ts is the ownership surface**, implementation is orchestration only.

## 1.5 Import convention that your new proposal violated

The legacy spec explicitly says:

> Cross-module consumers (steps/tests/other domains) import ops through the **domain public surface** `@mapgen/domain/<domain>`.

This is the key DX rule we must preserve: **no deep imports into `ops/<op>/contract` from steps** as the normal pattern.

---

# 2) Updated conventions compatible with the new canonical architecture

This section is the “final pass” DX guideline set: same legacy structure/aliases, but updated to match the new composition-first compiler architecture (stage `knobs` field, compile vs normalize semantics, runtime-vs-compile op surfaces, etc.).

## 2.1 Domain modeling: canonical files and exports

### Domain directory layout (unchanged, but with an explicit domain-level API)

Keep the legacy domain layout (exactly as specified) and add **one domain-level API surface** that steps and recipes import from.

```
src/domain/<domain>/
  index.ts                 # domain public surface (contracts + ops registries)
  ops/
    <op-slug>/
      contract.ts
      types.ts
      rules/
        *.ts
        index.ts
      strategies/
        default.ts
        *.ts
        index.ts
      index.ts            # op module entry
```

### Domain-level export contract (NEW, required by new architecture + legacy DX)

`src/domain/<domain>/index.ts` must export:

* `contracts`: stable bag of op contracts (for step contracts to reference)
* `opsById`: registry keyed by op.id returning **compile-surface ops** (used by compiler + bindRuntimeOps stripping)
* Optional: `ops`: stable bag of ops by friendly name (developer convenience), but **binding must use opsById** to avoid name/id drift.

**Why:** This satisfies both:

* legacy DX: import from `@mapgen/domain/<domain>` only (no deep imports),
* new architecture: step contracts declare ops by contracts; binding helpers bind by id; compiler uses compile ops for normalization.

### Canonical domain-level import pattern

In step contracts and step implementations:

```ts
import { ecology } from "@mapgen/domain/ecology";

// step.contract.ts
ops: {
  trees: ecology.contracts.planTreeVegetation,
  shrubs: ecology.contracts.planShrubVegetation,
}

// step/index.ts (runtime binding)
const ops = bindRuntimeOps(contract.ops, ecology.opsById);
```

This replaces the deep import pattern you flagged.

### Lint-style rule (explicit)

* **Allowed (canonical):** `import { ecology } from "@mapgen/domain/ecology"`
* **Forbidden (in steps/recipes):** `import { PlanTreeVegetationContract } from "@mapgen/domain/ecology/ops/plan-tree-vegetation/contract"`
* **Allowed (inside the op module itself):** relative imports (`./rules/*`, `./strategies/*`).

This preserves the “domain public surface” rule while keeping op internals clean.

---

## 2.2 Operation module structure and authoring rules (aligned with new compiler)

### Op module exports

Each `ops/<op-slug>/index.ts` should export:

* `contract` (defineOp)
* `types` (OpTypeBag)
* `op` (createOp(contract, strategies)) — this is the **compile-surface op**, not the runtime op

This matches the legacy operation module definition (contract-first op module) while enabling the new compiler pipeline (compile ops are available).

### Strategy authoring DX rule (preserve old “pinning” guidance)

The legacy spec/notes warn about breaking TS contextual typing for strategies; keep this rule:

* Prefer inline POJO strategies passed into `createOp` for best inference.
* If a strategy is out-of-line, it must be typed via `createStrategy(contract, "id", impl)` or `satisfies`.

### Runtime-vs-compile op surfaces (new architecture, aligned with legacy module shape)

* `createOp` returns a **compile-surface op** (has `normalize`, `defaultConfig`, etc.)
* `bindRuntimeOps` structurally strips to **runtime-surface op** before exposing to `step.run`

This preserves legacy mental model (“op is public contract”) while enforcing the new invariant (“runtime can’t normalize”).

---

## 2.3 Step module structure and imports (aligned)

### Step directories remain exactly as legacy spec

Keep:

```
stages/<stageId>/steps/<stepId>/
  contract.ts
  index.ts
  lib/**
```

and keep the rule:

* contract owns schema + metadata
* index is orchestration only

### Updated step contract import pattern

In `contract.ts`:

* import op contracts from `@mapgen/domain/<domain>` (domain public surface), not deep op paths.
* compose schemas explicitly in the step contract (no “implicit inference” from calls), consistent with ADR-ER1-033.

### Updated step implementation import pattern

In `index.ts`:

* bind runtime ops via `bindRuntimeOps(contract.ops, domain.opsById)`
* use `createStep(contract, { normalize?, run })`
* do not import strategies; never call compiler helpers

---

## 2.4 Stage-level files and “knobs live in stageConfig.knobs”

The legacy spec already puts stage wiring in `stages/<stageId>/` and steps under that.

Update the stage directory to include (optionally):

```
stages/<stageId>/
  index.ts           # stage module assembly
  public.ts          # optional: stage public schema + compile
  knobs.ts           # optional: stage knobs schema
  shared/**          # stage-scoped helpers/types (allowed, but stay stage-local)
  steps/**           # as above
```

Rules:

* Knobs are a **field inside stage config** (`stageConfig.knobs`). This is part of the stage’s single author surface.
* Do not create recipe-root catalogs (`recipes/standard/tags.ts`, `artifacts.ts`, etc.).

---

## 2.5 Domain-level config fragments (`@mapgen/domain/config`)

Preserve the legacy DX rule:

* `@mapgen/domain/config` is **schema/type-only** and is allowed for truly cross-domain fragments.
* It must not become a global runtime config blob.

This remains compatible with the new compiler architecture; it’s purely about where reusable schema fragments live.

---

## 2.6 Import style rules (explicit, unambiguous)

### Cross-module imports (canonical)

* Domain consumers (steps, tests, other domains): `@mapgen/domain/<domain>` only.
* Authoring SDK: `@swooper/mapgen-core/authoring` (single entrypoint, no content-local alias).
* Shared schema fragments: `@mapgen/domain/config` (type/schema only). 

### Intra-module imports (canonical)

* Inside a step or op folder: use relative imports only.

### Forbidden import patterns (DX guardrails)

* Steps importing deep op files (contract/strategies/rules) directly.
* Recipes importing `maps/**` modules. 
* Domains importing from `recipes/**` or `maps/**`.
* “Central config” modules or recipe-root catalogs.

---

# 3) Concrete corrections to apply to the target architecture proposal

These are the minimal changes you should make to the canonical architecture doc/examples so it respects legacy DX:

1. **Replace deep op-contract imports in step examples**
   Before (bad):

```ts
import { PlanTreeVegetationContract } from "@mapgen/domain/ecology/ops/plan-tree-vegetation/contract";
```

After (canonical):

```ts
import { ecology } from "@mapgen/domain/ecology";
const { planTreeVegetation } = ecology.contracts;
```

Grounding: “Cross-module consumers import ops through domain public surface.”

2. **Make domain public surface explicit in the doc**
   Add a small section: “Domain index.ts exports `contracts`, `opsById`” and explain that steps never deep import ops. This aligns with the legacy “thin barrel” rule.

3. **Align step module shape with legacy contract/index split**
   Ensure examples keep:

* `steps/<stepId>/contract.ts` owns schema/ops decl
* `steps/<stepId>/index.ts` binds runtime ops and defines run
  This exactly matches the legacy step module invariants.

---

# 4) Final guideline summary (copy/paste)

* **Domains** are recipe-independent libs under `src/domain/**` and expose ops via operation modules.
* **Operation modules** live at `domain/<domain>/ops/<op>/` with `contract.ts`, `types.ts`, `rules/**`, `strategies/**`, and `index.ts`.
* **Steps** are directories under `stages/<stageId>/steps/<stepId>/` with `contract.ts` (ownership) and `index.ts` (orchestration).
* **Import ops/contracts only from `@mapgen/domain/<domain>`** in steps/recipes/tests; deep op imports are forbidden outside the op folder itself.
* **Barrels are thin re-exports only**; no side-effect registration and no centralized catalogs.
* **`@mapgen/domain/config` is schema/type-only** and may be used for cross-domain fragments.

---

If you want, paste the specific example snippets from your canonical proposal doc that currently deep-import op contracts, and I’ll rewrite them into the **domain-level import** form (including an explicit suggested `src/domain/<domain>/index.ts` export layout) so you can apply the fix mechanically across the doc and the codebase.
