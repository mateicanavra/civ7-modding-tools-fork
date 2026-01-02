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

## ADR-001: Strict `MapGenConfig` (no unknown keys)

**Status:** Accepted
**Date:** 2025-12-19
**Context:** `MapGenConfig` previously allowed arbitrary extra keys throughout the tree, which made it unclear where new config belonged and allowed typos/legacy fields to silently pass validation.
**Decision:** Make the schema strict (`additionalProperties: false`) and validate before cleaning so unknown keys fail fast. Provide a single explicit escape hatch at `config.extensions` for experimental/plugin-owned knobs.
**Consequences:**
- Misplaced/typoed config now throws early instead of being silently accepted.
- Experimental knobs must be routed via `config.extensions` (or formalized into the schema).
- Existing configs that relied on undocumented extra keys must be updated.

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
