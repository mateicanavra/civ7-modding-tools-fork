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
## ADR-XXX: Example Decision Title

**Status:** Proposed | Accepted | Deprecated | Superseded
**Date:** YYYY-MM-DD
**Context:** What prompted this decision?
**Decision:** What was decided?
**Consequences:**
- What got easier?
- What got harder?
-->

## ADR-001: Bun is the monorepo package manager contract

**Status:** Accepted
**Date:** 2026-01-26
**Context:** This repo is a multi-package TypeScript monorepo. Maintaining split “pnpm for installs + Bun for scripts/tests” behavior created drift (two sources of truth for workspaces, pnpm-only config surface area, and pnpm-specific repo code and docs). We want a single, consistent package manager contract across local dev, CI, and publishing.
**Decision:** Bun is the only supported package manager for this repo. The workspace is defined by root `package.json` `workspaces`, the lockfile is `bun.lock`, and all workflows use `bun install --frozen-lockfile` and `bun run …` for orchestration.
**Consequences:**
- Contributors must install Bun (see `.bun-version`) and use Bun commands documented in `docs/PROCESS.md` and `docs/process/CONTRIBUTING.md`.
- pnpm artifacts and pnpm-specific repo logic should not be reintroduced (no `pnpm-lock.yaml`, no `pnpm-workspace.yaml`, no pnpm-only config knobs).
- Turbo remains the build orchestrator; root `packageManager` stays set to Bun to satisfy Turbo workspace detection.
- Dependency overrides use the standard `overrides` field instead of pnpm-only configuration.
- Migration analysis and roll-forward notes live in `docs/projects/temp/SPIKE-bun-migration-feasibility.md`.
