# DX Cleanup Playbook (Recipe Compile / Engine Refactor)

This playbook is a reusable operating guide for DX-focused refactors in this repository—especially work that reshapes authoring surfaces for steps/domains/operations used by recipe compile.

It is intentionally grounded in the kinds of problems we keep encountering here: partially-wired architecture, noisy export routers, redundant manifests, and boundary leaks between contract-time and runtime.

## What This Playbook Covers

- Taking places where a “target architecture” exists but is only partially wired, and finishing the wiring so authors don’t have to.
- Collapsing noisy “export routers” and manual schema/contract plumbing into a small number of authoring helpers with strong types (in the same spirit as `defineStep/createStep`).
- Enforcing a hard boundary between contract-time (safe to import widely, especially from step contracts) and runtime (implementations, recipe compilation, execution), without shims/fallbacks.
- Replacing “import 30 things and stitch them by hand” with “import one obvious entrypoint and get correct IntelliSense + type safety”.

## Goals & Constraints (Non‑Negotiables)

- Contract-first is the anchor: contracts must be easy to author and safe to import without pulling runtime code.
- No codegen for wiring.
- No “legacy compatibility layers”; migrate callsites to the new shape.
- “Single obvious place” imports: external consumers should import step/domain surfaces from a small number of supported entrypoints (avoid deep paths).
- Type ergonomics matter as much as runtime correctness: inference, completion, and discoverability are part of “done”.
- Specs are not the source of truth; the codebase is. Specs must be reconciled to reality.

## Operating Mental Model (Steps / Domains / Ops Wiring)

### 1) Separate “describe” from “execute”

- Describe layer (contracts): identifiers, schemas, config shapes, allowed surface area.
- Execute layer (runtime bindings): attach implementations and produce a runtime-callable surface.

If module evaluation boundaries make it unsafe to import runtime code from contract files, keep separate contract/runtime entrypoints.

### 2) A “thing” should be representable as one object

- If authors think “this step uses ops A/B/C”, the system should accept an object/tuple of those ops and derive the rest.
- If authors think “this is the ecology domain”, it should be definable as one module-level definition object (not `contract.ts + ops.ts + index.ts + exports.ts + …`).

### 3) Wiring should be structural, not ceremonial

- If the compiler already knows the list of ops (from the contract object), don’t re-list them in schemas, registries, or “manual contract injection” paths.
- Prefer derivation (bind from a contract object) over re-declaration (rewrite the same list in three places).

## Smells & Failure Modes

### Smells

- Manual manifest duplication: the same op list appears in contract, schema, registry, and implementation wiring.
- Index file as a graveyard: `index.ts` exporting 40 symbols with no opinionated authoring surface.
- Deep import tax: callers reaching into `.../ops/contracts/<op>` just to use an op.
- Config passed as code: passing `normalize`/`run` as “config” indicates the boundary between contract and runtime got muddled.
- Type-safe but author-hostile: everything technically checks, but authoring requires too many imports and too much ceremony.

### Failure modes

- Accidental runtime imports in contract files (causes hard-to-debug evaluation order issues and breaks the contract-first promise).
- “Looks architected” but has no enforcement (no lint rules, no tests, no compile-time constraints), so entropy returns immediately.
- “Refactor-only commits”: moving imports around without removing the underlying duplication or improving the authoring surface.

## Concrete Principles & Patterns (For This Class of Cleanup)

### A) Provide an explicit authoring API, don’t rely on conventions

- If we want `define* / create*`-style DX for a concept, we must ship a `defineX/createX` authoring surface and route usage through it.
- Conventions (“put ops in ops.ts”) don’t scale unless the API makes the convention the easiest path.

### B) Prefer “object registries” as the unit of composition

- Authors list ops once; the contract/runtime layers derive schema extensions, config envelopes, and call surfaces.
- Use `satisfies` to validate registries without widening.
- Prefer `const` generics + `typeof` return patterns to preserve inference.

### C) One import per concept

- Contract import: `domainContract.ops.foo` (or equivalent) should be the standard way to reference contracts.
- Runtime import: `domainModule.ops.foo(...)` (or equivalent) should be the standard way to call implementations.
- If a caller needs more than one import to “use the thing”, the “thing” is not well-shaped yet.

### D) Enforce boundaries mechanically

- Lint rules should prevent runtime entrypoints (and runtime implementations) from being imported in contract locations.
- If a boundary is important, encode it: path-based linting + build/test checks.

### E) Delete layers aggressively when they only restate information

- If a file exists only to re-export other files one-by-one, that’s a smell unless it is a deliberate, stable public entrypoint.
- Keep “barrels” only when they are the supported import surface; otherwise, collapse them.

## How to Approach This Work (Repeatable Procedure)

### Inside-the-box steps (surgical)

- Find the author pain point: count imports, count “lists of ops”, count redundant config/schema plumbing.
- Identify the real “source of truth object” that should exist (step contract object, domain definition object).
- Move wiring behind a helper so authors supply only that object once.
- Update callsites immediately (no shims): break loudly, then fix forward.

### Outside/around-the-box steps (systemic)

- Check for “architecture present but unenforced”: if it’s not in lint/tests/types, it will regress.
- Audit import surfaces: if there are multiple “blessed” ways to import the same thing, DX will fragment.
- Walk author journeys end-to-end:
  - “I’m adding a new operation to a domain”
  - “I’m using that op in a step contract”
  - “I’m executing it at runtime”
  If any step requires ceremony, the API is not done.

## Verification (What “Done” Means Here)

- Typecheck proves authoring inference works (not just that types exist): the author should see completions on `domain.ops.<…>` / `step.ops.<…>`.
- Lint enforces contract/runtime import boundaries (no accidental runtime imports in contract files).
- Runtime tests validate binding correctness: a contract op missing an implementation should fail clearly and early.
- “Wiring tests” are often higher ROI than “algorithm tests” for this work: most regressions are misbinding, wrong entrypoints, or schema/config drift.

## Balancing Cleanup vs Light Re‑Architecture (Without Over‑Engineering)

- If the pain is ceremony and duplication, the fix is usually a new authoring surface + deleting glue—not a new subsystem.
- A small re-architecture is justified when:
  - There is no single source of truth object today.
  - The contract/runtime boundary is repeatedly violated because the current shape makes it too easy.
  - The only way to improve DX is to change module entrypoints/import surfaces.
- Keep the re-architecture narrow: one new helper + one new canonical import path + enforced boundaries, then migrate callsites.

