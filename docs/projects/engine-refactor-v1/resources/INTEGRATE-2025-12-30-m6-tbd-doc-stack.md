# INTEGRATE: 2025-12-30 (m6-tbd docs stack)

This doc records real spec/design conflicts surfaced while integrating the `m6-tbd-*` documentation stack.

It is intentionally lightweight: each entry captures **what conflicted**, **where it came from**, and **what decision is needed** (or what choice was made during integration).

---

## Resolved During Integration (Needs Review)

### Step module standardization: “contract module” vs “model module”

- **Context:** `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (Terminology + 2.4 Colocation rules)
- **Conflicting texts:**
  - **Variant A:** “Step contract module” as a flexible bundle (single file or colocated module set) with optional directory-based or `<stepId>.*` file splits.
  - **Variant B:** “Step model module” as a standardized `<stepId>.model.ts` contract file, paired with `<stepId>.ts` implementation.
- **Source metadata:**
  - Variant B explicitly cited during the merge as `c1426d3d` (`docs(spec): standardize step modules and core layout`).
- **Resolution applied in integration:**
  - Kept the **concept** (“step-owned contract bundle”) but standardized the **default shape** as a 2-file pair:
    - `<stepId>.model.ts` (contract model: schema + types + tag arrays + optional step-owned helpers)
    - `<stepId>.ts` (step definition + `run`; orchestration only)
  - Allowed additional colocated `<stepId>.*.ts` files only when needed for readability, but kept ownership under `stages/<stageId>/steps/**`.
- **Design decision still worth confirming:** do we want to allow per-step directories (`steps/<stepId>/**`) as a first-class pattern, or prefer “files only” as the canonical standard?

### Dependency tag prefix: `field:*` vs `buffer:*` (and Recipe schema version)

- **Context:** `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-m6-standard-mod-feature-sliced-content-ownership.md` (4.6 Packaging overlay)
- **Conflicting texts:**
  - **Variant A:** `RecipeV1` + `buffer:*` terminology.
  - **Variant B:** `RecipeV2` + `field:*` terminology (explicitly cited as `523905b4`, `engine: lock recipe schema v2 (remove instanceId)`).
- **Resolution applied in integration:**
  - Standardized to **`RecipeV2` + `buffer:*`** in that section.
- **Design decision still worth confirming:** `field:*` remains present throughout older milestone/docs as historical terminology; confirm that **target** SSOTs should use `buffer:*` and older milestone docs remain as-is (or are archived).

### Core naming conventions: kebab-case vs strict runtime surface naming

- **Context:** `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (4.3 Naming and organization conventions)
- **Conflicting texts:**
  - **Variant A:** “Prefer kebab-case for new files across `src/**`”, tolerate existing PascalCase.
  - **Variant B:** “Strict, intention-revealing names for `src/engine/**` + `src/core/**`”, explicitly forbidding kebab-case in runtime surfaces.
- **Resolution applied in integration:**
  - Adopted the stricter convention for `engine/**` + `core/**` **for new files**, while treating the current mixed naming as legacy to normalize later when useful.
- **Design decision still worth confirming:** do we want an explicit M7 task to mechanically normalize runtime filenames, or keep it as “only when touching”?

---

## Open Design Conflicts (Needs Decision)

None captured yet beyond the “confirmations” above. Add new entries here when merges reveal true design drift (not just wording).
