# DX Rules (pinned)

This file captures **developer experience guardrails** that the architecture is intentionally optimizing for. These rules are normative and should be enforced via lint (see `lint-boundaries.md`) and by keeping examples consistent.

---

## 1) Import boundaries (hard)

### 1.1 Domain entrypoints only (no deep imports)

- Cross-module consumers must import domain content **only** via `@mapgen/domain/<domain>`.
- Forbidden in steps/recipes/tests: deep imports such as:
  - `@mapgen/domain/ecology/ops/*`
  - `@mapgen/domain/ecology/ops-by-id`
  - `@mapgen/domain/ecology/strategies/*`
  - `@mapgen/domain/ecology/rules/*`

Rationale:
- Prevents “accidental bundling” of op implementations into contracts and prevents brittle path coupling to domain internals.
- Keeps domains free to reorganize internal layout without forcing horizontal churn.

### 1.2 Steps import only the domain entrypoint (no deep imports)

**Pinned:** Step contracts and step modules may import the **domain entrypoint**, but must not deep-import op modules/strategies/rules.

Allowed:
- Step **contract** files importing **op contracts** via the domain entrypoint:
  - `import * as ecology from "@mapgen/domain/ecology";`
  - `ops: { trees: ecology.contracts.planTreeVegetation, ... }`
- Step modules importing the domain entrypoint to access the registry for binding:
  - `const ops = bindRuntimeOps(contract.ops, ecology.opsById);`

Forbidden:
- Deep imports into `@mapgen/domain/<domain>/ops/**`, `strategies/**`, `rules/**`.

Rationale:
- Keeps domains free to reorganize internal layout without forcing horizontal churn.
- Keeps step contracts cheap (no impl bundling) while allowing step modules to bind by id via a stable registry.

---

## 2) Authoring APIs (preferred)

### 2.1 Prefer the stable step authoring alias

When referencing the canonical step factory in examples:
- Prefer `import { createStep } from "@mapgen/authoring/steps";`

Rationale:
- Centralizes `ExtendedMapContext` typing and avoids forcing examples to pick a core package path.

---

## 3) Single-path ergonomics (avoid “two ways”)

Where the architecture offers multiple ways to achieve the same outcome (e.g., ops binding, schema derivation), the spec must:
- Select one canonical path,
- Make alternatives explicitly “deferred” or “forbidden for v1,”
- Ensure examples follow only the canonical path.
