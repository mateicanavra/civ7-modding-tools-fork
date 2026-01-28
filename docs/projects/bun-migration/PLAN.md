# PLAN: Bun-first, Bun-only, latest toolchain upgrade

**Last updated:** 2026-01-28

This plan assumes the repo contract is **Bun-only package manager**, and extends it to a **latest-deps, no-legacy** toolchain posture:

- Bun is the package manager everywhere (no pnpm artifacts, no pnpm docs).
- Upgrade to the latest stable Bun, Vite, Turborepo, and other dependencies.
- Prefer Bun runtime where it works well; use Node only where it is clearly the “native” runtime for a tool (e.g. Vite/Vitest edge cases), and record that explicitly.

Related context:
- Feasibility + rationale: `docs/projects/temp/SPIKE-bun-migration-feasibility.md`
- ADR (package manager contract): `docs/system/ADR.md` (`ADR-001`)

## Target versions (latest as of 2026-01-28)

**Decision:** Track latest stable releases for the following, updating pins when we do this work.

- Bun: `1.3.7` (released 2026-01-26/27, depending on timezone)
  - Source: https://github.com/oven-sh/bun/releases/latest
- Vite: `7.3.1` (npm latest)
  - Source: https://www.npmjs.com/package/vite
- Turborepo (`turbo`): `2.7.6` (npm latest)
  - Source: https://www.npmjs.com/package/turbo
- Vitest: `4.0.18` (npm latest)
  - Source: https://www.npmjs.com/package/vitest
- Node (repo prerequisite): **22.14+** (to satisfy Vite 7)
  - Source: Vite 7 announcement (Node support section): https://vite.dev/blog/announcing-vite7
- `@types/node`: track the **Node 22.x** line (don’t chase `@types/node@latest` across Node majors)

**Decision:** Pin Node in `.nvmrc` to the **major.minor line** (`22.14`) and let patch versions float.

- Rationale: least confusing for contributors (always “Node 22.14.x”), transparent (matches Vite 7’s requirement), and flexible (picks up security/bugfix patches without churn).
- CI still pins to the same major/minor line (see Phase 1) so local and CI stay aligned.

## Compatibility constraints (what upstream docs say)

### Turborepo + Bun package manager

- Turborepo 2.6 moved Bun package manager support to “stable” and supports Bun’s `bun.lock` v1 parsing.  
  Source: https://turborepo.dev/blog/turbo-2-6

### Bun workspaces + install strategy (isolated vs hoisted)

Bun 1.3 introduced isolated installs as default for workspaces; Bun 1.3.2 restored hoisted as default for existing workspaces unless configured (via lockfile `configVersion` and/or `bunfig.toml`).  
Sources:
- https://bun.com/blog/bun-v1.3.2
- https://bun.com/docs/pm/isolated-installs

**Decision (no-legacy):** Adopt **isolated installs** explicitly for this repo.

- Alternatives considered:
  - **Hoisted**: lower migration cost, but keeps “phantom dependency” behavior and makes the repo more fragile.
  - **Isolated (chosen)**: forces correctness (each workspace declares what it uses), aligns with modern monorepo hygiene.

**Implementation note:** In `bunfig.toml`, set:
```toml
[install]
linker = "isolated"
```
and re-lock once under the upgraded Bun.

### Vite + Bun `.env` auto-loading

Vite docs warn that Bun auto-loads `.env` files into `process.env` before Vite runs, which can interfere with Vite’s own env loading (because Vite respects already-set `process.env` values).  
Source: https://vite.dev/guide/env-and-mode

**Decision:** Keep running Vite/Vitest via `bun run`, but make env-loading deterministic.

- Alternatives considered:
  - Run Vite/Vitest via **Node** to avoid Bun `.env` behavior entirely.
  - Disable Bun’s `.env` auto-loading at the repo level (chosen).

**Implementation note:** disable Bun `.env` auto-loading in `bunfig.toml` (Bun supports `env = false`) so Vite/Vitest control env semantics consistently.

Source: https://bun.com/docs/runtime/env

## Execution plan (no-legacy cutover)

### Phase 0 — Preflight (baseline)

- Confirm current `main` is clean.
- Confirm the Bun stack (already in-flight) is merged or ready-to-merge.
- Capture a baseline run on the current Bun stack:
  - `bun install --frozen-lockfile`
  - `bun run test:ci`
  - `bun run lint`
  - `bun run build`
  - `bun run --cwd apps/mapgen-studio build`

### Phase 1 — Toolchain pins (Bun + Node)

- Update Bun pin everywhere:
  - `.bun-version` → `1.3.7`
  - root `package.json#packageManager` → `bun@1.3.7`
  - any workspace `packageManager` fields that disagree → align or remove (prefer align)
- Update Node pin everywhere:
  - `.nvmrc` → `22.14`
  - root `package.json#engines.node` → `>=22.14.0`
  - CI: `actions/setup-node` → `22.14.x`

**Decision:** CI uses the same Node major/minor as `.nvmrc` (no legacy Node fallback).

### Phase 2 — Bun install strategy (isolated) + lockfile regeneration

- Update `bunfig.toml`:
  - add `linker = "isolated"`
  - keep `trustedDependencies` as needed
- Re-run `bun install` under the upgraded Bun to regenerate `bun.lock` (expect a `configVersion` field to appear).
- Fix all “phantom dependency” fallout surfaced by isolation:
  - Add missing dependencies to the correct workspace `package.json`.
  - Prefer workspace-local deps over relying on root hoisting.

### Phase 3 — Upgrade deps (latest)

- Upgrade core repo deps:
  - `turbo` → `2.7.6`
  - `vitest` → `4.0.18` (+ update vitest UI if needed)
  - update TypeScript-related tooling if it moved (if not, keep latest = current)
  - upgrade ESLint ecosystem deps if needed
- Upgrade app deps:
  - `apps/mapgen-studio`: `vite` → `7.3.1`, `@vitejs/plugin-react` → latest compatible, TypeScript as needed

**Decision:** Use Bun-native workflows for upgrades (`bun update`, `bun outdated`) unless we hit a concrete limitation; avoid `bunx npm-check-updates` unless necessary.

### Phase 4 — Vite/Vitest “Bun everywhere” hardening

- Ensure Bun does not auto-load `.env` files for this repo (use `env = false` in `bunfig.toml`).
- Validate:
  - `bun run test:ci` (Vitest 4)
  - `bun run --cwd apps/mapgen-studio dev` smoke (manual) and `build`

**Decision:** Disable Bun `.env` auto-loading globally for this repo.

- Rationale: most transparent (one repo-level rule), least surprising for Vite/Vitest mode semantics, still consistent across local + CI.

### Phase 5 — Docs hardball sweep (pnpm removal, Bun-only)

Do not begin until Phases 1–4 are green (otherwise docs drift is guaranteed).

- Inventory pnpm/Corepack mentions (excluding archived docs).
- Update docs to Bun-only instructions; keep consumer docs consistent with “Bun-first” messaging (no “pnpm recommended”).
- Add lightweight guardrails to prevent pnpm artifacts from reappearing.
- Decide how to treat legacy package-manager instructions in time-bound project docs under `docs/projects/**`:
  - Option A: sweep non-archived project docs to Bun (mechanical replacements + spot checks).
  - Option B: add a prominent “historical (pnpm-era)” banner at the project root and link to Bun equivalents, leaving details unchanged.

## Validation gates (what “done” means)

- Fresh clone path:
  - `bun install --frozen-lockfile` (no lock changes)
  - `bun run test:ci`
  - `bun run build`
  - `bun run lint`
- App sanity:
  - `bun run --cwd apps/mapgen-studio build`
  - manual `bun run --cwd apps/mapgen-studio dev` and confirm it loads
- CI:
  - CI green on `main` with upgraded Bun + Node + lockfile
