---
system: mapgen
component: documentation
concern: adr-index
---

# Architecture Decision Records

> Significant architectural decisions made in this project.

---

## Format

Each decision follows this structure:

```
## ADR-XXX: Title

**Status:** Proposed | Accepted | Deprecated | Superseded
**Date:** YYYY-MM-DD
**Context:** What prompted this decision?
**Decision:** What was decided?
**Consequences:** What are the implications?
```

---

## Decisions

<!-- Example:
## ADR-001: Use pnpm Workspaces for Monorepo

**Status:** Accepted
**Date:** 2025-01-01
**Context:** Need to manage multiple packages with shared dependencies.
**Decision:** Use pnpm workspaces with Turbo for build orchestration.
**Consequences:**
- Fast installs via hard links
- Strict dependency resolution
- Requires pnpm knowledge from contributors
-->

## ADR-001: Contract schema defaults and unknown-key policy

**Status:** Accepted
**Date:** 2026-01-24
**Context:** Review comments requested “no schema defaults” and “no `additionalProperties` field” in MapGen op/step contracts, but existing project docs rely on schema defaults as the canonical baseline and prescribe `additionalProperties: false` for strict, typed configs.
**Decision:**
- Keep **author-facing defaults** in contract schemas (property defaults and/or a `defaultConfig` baseline), and keep **derived/scaled values** in normalize/compile steps.
- Use `additionalProperties: false` on object schemas by default to reject unknown keys, unless an interface is explicitly intended to be open-ended.
**Consequences:**
- Contracts remain self-documenting and can validate + default without requiring downstream “fill missing” logic.
- Unknown-key rejection becomes consistent (reduces silent drift from misspelled config keys).
- When an open-ended config is needed, it must be explicit and documented as an exception.
