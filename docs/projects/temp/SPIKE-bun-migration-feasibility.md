# SPIKE: Bun Migration Feasibility (Monorepo-wide)

## Objective

Evaluate what it would take to migrate this repo from `pnpm` to Bun’s package manager, prefer Bun for script execution, use Bun’s test runner where it’s a clear win (without ending up with an incoherent split), and default to Bun for CI publishing unless there’s a concrete blocker.

## Verdict + Intention (Decision)

**Feasible with caveats.** Bun is already used in-repo (`.bun-version` exists; multiple workspaces run TypeScript scripts via `bun run`/`bunx`), but there are real pnpm couplings that must be removed or replaced with Bun-native equivalents to meet the “Bun-only package manager” goal.

The main risks are not “Bun runtime incompatibility” so much as:

- Workspace definition drift (pnpm uses `pnpm-workspace.yaml`; Bun uses `package.json` workspaces)
- pnpm-only dependency controls (`pnpm.overrides`, `pnpm.onlyBuiltDependencies`, and `.npmrc` knobs)
- CI workflows and auth patterns that were pnpm-centric
- Repo runtime code that detects “workspace root” by looking for `pnpm-workspace.yaml`

**Intention (locked for future work):**
- Bun is the **only** package manager (no pnpm lockfile, no `pnpm-workspace.yaml`, no pnpm-root sentinel logic).
- Bun is the default script runner where possible; Node remains acceptable for built artifacts (tsup/tsc/Vitest) when needed.
- Test runner is **not** part of this decision: we can keep Vitest repo-wide (plus existing Bun-test “islands”) while changing the package manager.
- If we proceed, we should record a formal ADR that supersedes any “pnpm is the monorepo contract” language.

## Upstream Compatibility Check (Bun + Turborepo + Vite/Vitest) — 2026-01-27

This section verifies whether the **current** toolchain shape is supported by upstream docs, and calls out any adjustments needed to keep “Bun-only package manager” robust.

### Versions in this repo (current Bun stack)

- Bun: pinned via `.bun-version` (`1.3.7`)
- Turborepo: root `devDependencies.turbo` (`^2.7.6`)
- Vite (MapGen Studio): `apps/mapgen-studio` (`7.3.1`)
- Vitest: root `devDependencies.vitest` (`4.0.18`)
- Node: `>= 22.14.0` (repo-wide prerequisite)

### Sources consulted (upstream docs, checked 2026-01-27)

- Bun release + monorepo install behavior:
  - https://github.com/oven-sh/bun/releases/latest (latest stable as of 2026-01-27)
  - https://bun.com/blog/bun-v1.3.7
  - https://bun.com/blog/bun-v1.3.2 (isolated vs hoisted defaults clarified; `configVersion` behavior)
  - https://bun.com/docs/pm/isolated-installs
  - https://bun.com/docs/pm/lockfile
- Turborepo + Bun package manager support:
  - https://turborepo.dev/blog/turbo-2-6 (Bun package manager → stable; bun.lock v1 support)
  - https://turborepo.dev/docs/support-policy
- Vite + Bun runner interactions:
  - https://vite.dev/guide/env-and-mode (Bun `.env` auto-load caveat)
  - https://vite.dev/blog/announcing-vite7 (Node support for Vite 7)
  - https://www.npmjs.com/package/vite (latest stable version as of 2026-01-27)
  - https://www.npmjs.com/package/@vitejs/plugin-react (React plugin version alignment)
  - https://www.npmjs.com/package/vitest (Vitest version alignment)
  - https://www.npmjs.com/package/turbo (Turborepo version alignment)

### Findings

**Latest versions / constraints that matter to this repo:**
- Bun’s latest stable release is `1.3.7` (released 2026-01-26 / 2026-01-27 depending on timezone). Bun 1.3 introduced isolated installs as the default for workspaces, but Bun 1.3.2 restored *hoisted* installs as the default for existing workspaces unless you opt into isolated mode (or your lockfile `configVersion` indicates otherwise).
- Turborepo 2.6 marked “Bun as package manager” as stable and added support for Bun’s `bun.lock` v1 parsing for cache correctness.
- Vite’s latest stable major is 7.x (npm currently shows `7.3.1`) and Vite 7 requires Node `20.19+` / `22.12+`.
- Vitest’s latest stable major is 4.x (npm currently shows `4.0.18`) and is expected to track Vite 7 compatibility; the Vite 7 announcement states Vitest supports Vite 7 starting from Vitest 3.2.

**Turborepo + Bun (monorepo):**
- Turborepo documents Bun as a supported package manager, and treats Bun as “stable” in its support policy.
- Turborepo relies on a **workspace-aware** package manager and a **non-nested** workspace layout (avoid recursive globs like `packages/**`). Multiple explicit workspace globs are fine.
- Our workspace layout (`apps/*`, `packages/*`, `packages/plugins/*`, `mods/*`) matches the “explicit globs” model and avoids `**` recursion.

**Bun workspaces:**
- Bun supports npm-style workspaces via root `package.json` `workspaces` and `workspace:*` dependencies.
- Bun provides workspace filtering for installs and script execution (`--filter`) and directory scoping (`--cwd`), which matches the way this repo orchestrates builds/tests/publish from the root.
  - Workspaces are defined by the root `package.json`. This repo should treat the root as the single source of truth (don’t rely on per-package nested workspace definitions).

**Bun + Vite/Vitest (runtime):**
- Vite includes `bun.lock` in its dependency pre-bundling cache heuristics.
- Vite explicitly warns about Bun’s `.env` file auto-loading potentially interfering with Vite’s own `.env.*` loading semantics; workaround(s) are suggested in the Vite docs.

**Local sanity check (this stack):**
- `bun install --frozen-lockfile` from repo root is clean (no lock changes).
- `bun run --cwd apps/mapgen-studio build` succeeds (Vite build under Bun runner).

### Implications / Adjustments (if we want Bun to stay “everything”)

The core “Bun-only package manager” plan is compatible with Turborepo + Bun workspaces.

The only *tooling sharp edge* called out by upstream docs is **`.env` semantics** when running Vite (and, by extension, Vitest/Vite-node tooling) under Bun.

If we upgrade to **Vite 7**, we must raise the repo’s Node minimum to match Vite 7’s documented requirement (`20.19+` / `22.12+`).

Recommended options (pick one and make it explicit):

1) **Keep Bun as package manager + run Vite/Vitest under Node (most conservative)**
   - Keep `bun install` + Bun lockfile + Bun filters.
   - For Vite/Vitest scripts, invoke Node explicitly (so Bun does not pre-load `.env` files).
   - Pros: avoids env-loader mismatch entirely.
   - Cons: “Bun runs everything” becomes “Bun installs everything.”

2) **Keep Bun as runtime, but standardize env-loading to avoid conflicts (preferred if we want Bun runtime)**
   - Ensure Vite/Vitest are responsible for `.env` loading (and Bun doesn’t pre-load).
   - Prefer disabling Bun `.env` auto-loading at the repo level via `bunfig.toml` (`env = false`), or use `bun --no-env-file …` for one-off runs.
   - Bun 1.3+ also introduces/expands **isolated installs** behavior for workspaces (controlled by lockfile `configVersion` and `bunfig.toml [install].linker`):
     - If upgrading from Bun 1.2 → 1.3.2+, expect `bun.lock` to gain a `configVersion` field and possibly change default install structure if it ends up as `configVersion = 1`.
     - If this repo wants to avoid “surprise installs”, explicitly pin `[install] linker = "hoisted"` or `"isolated"` in `bunfig.toml`, then do one clean `bun install` + CI run to lock it in.

## Docs Hardball Sweep Plan (pnpm → Bun) — checklist

Goal: after merging the Bun stack, ensure there is **no contributor-facing “pnpm is required” drift** anywhere outside archived docs.

### Policy decisions (make explicit before editing)

- Do we allow docs aimed at *consumers* (not repo contributors) to mention npm/pnpm/yarn as alternatives, or do we hardball “Bun recommended everywhere”?
- Do we treat `docs/_archive/**` and `docs/projects/**/_archive/**` as exempt from cleanup (recommended), while keeping them historically accurate?

### Remediation phases (suggested)

1) **Contributor surface (highest priority)**
   - `README.md` (replace pnpm/Corepack setup and `pnpm refresh*` with Bun equivalents).
   - `docs/PROCESS.md`, `docs/process/CONTRIBUTING.md`, `docs/system/TESTING.md` (ensure Bun-only instructions; remove pnpm-only commands).

2) **Package-local instructions**
   - `*/TESTING.md` files under `apps/**`, `packages/**`, `mods/**` that still say `pnpm …`.
   - Package READMEs that instruct `pnpm add` or `pnpm -F …`.

3) **Templates + doc tooling**
   - `docs/_templates/**` (e.g. `docs/_templates/service.md`) should default to Bun (or be package-manager-neutral if that’s the chosen policy).
   - `apps/docs/**` community guides and code blocks that assume pnpm (decide: update vs keep as “any package manager” guidance).

### Execution checklist (when we choose to do it)

- Inventory:
  - `rg -n \"\\bpnpm\\b\" -S --glob '!**/node_modules/**' --glob '!docs/_archive/**'`
  - `rg -n \"\\bcorepack\\b\" -S --glob '!**/node_modules/**' --glob '!docs/_archive/**'`
- Edit + verify:
  - Replace repo-contributor commands with Bun equivalents (`bun install --frozen-lockfile`, `bun run …`, `bun --cwd …`, `bun run --filter …`).
  - Ensure docs don’t reference deleted artifacts (`pnpm-lock.yaml`, `pnpm-workspace.yaml`).
- Gate:
  - Fresh-clone path: `bun install --frozen-lockfile` then `bun run test:ci` from repo root.
  - Optional: `bun run --cwd apps/mapgen-studio build` (ensures Vite path works under Bun).

## Why “conflicts” matter (and what we’re choosing)

There are multiple historical directions in this repo:

- This spike’s target: **Bun-only package manager** (remove pnpm artifacts and pnpm assumptions).
- A different, older/archived direction: **pnpm as orchestrator + Bun as a tool** (bridge scripts / fallback), e.g. `docs/projects/engine-refactor-v1/issues/_archive/CIV-9-bun-pnpm-bridge.md`.

These are incompatible assumptions. If we “hardball Bun-only”, we can absolutely do the work — but we must delete/replace **every** pnpm dependency in:
- repo code that assumes pnpm (`packages/config/src/index.ts` root detection),
- repo scripts that call pnpm (root `package.json` and per-package scripts),
- CI workflows that install/cache/run pnpm (`.github/workflows/ci.yml`, `.github/workflows/publish.yml`),
- docs that treat pnpm as the contract (`docs/PROCESS.md`, `docs/process/CONTRIBUTING.md`, etc.).

So “conflict” here means “split-brain toolchain risk” (two different sources of truth), not “we can’t choose Bun-only.”

## Current State (Evidence)

### Workspaces (critical mismatch for Bun)

- Root `package.json` workspaces are:
  - `apps/*`
  - `packages/*`
  - `packages/plugins/*`
  - `mods/*`
- Multiple workspaces depend on plugins via `workspace:*` (e.g. `packages/cli` depends on `@civ7/plugin-*`).

Under Bun, workspace membership comes from root `package.json`. This repo’s workspaces list now includes plugins, so `workspace:*` dependencies resolve under Bun.

### pnpm-specific runtime logic (must be removed)

Historically, `@civ7/config` discovered the project root by scanning for `pnpm-workspace.yaml`. To support a Bun-only package manager, project-root detection must be pnpm-free (e.g. detect the nearest `package.json` that declares `workspaces`, or use a dedicated sentinel file).

### pnpm-only dependency controls (need Bun equivalents)

Historically this repo relied on pnpm-only config under `"pnpm"` (not supported by Bun).

This repo now uses:
- top-level `overrides` (npm-style), and
- `bunfig.toml` `trustedDependencies` (Bun’s secure-by-default lifecycle script allowlist).

### Tests (Vitest is repo standard; one Bun-test island exists)

- Root runs Vitest across multiple “projects” via `vitest.config.ts:7`.
- Most tests use Vitest APIs (`vi.mock`, `vi.importActual`, etc.) across `packages/cli`, `packages/sdk`, plugins, and apps.
- `packages/mapgen-core` is an exception: it uses `bun test` and imports from `bun:test` across its suite.

This is already a mixed model today (Vitest + Bun test).

### CI / Publishing (Bun-based)

CI installs and runs with Bun:

- `.github/workflows/ci.yml` uses `bun install --frozen-lockfile` and runs `bun run build/lint/test:ci`.

Publishing uses Bun and targets GitHub Packages:

- `.github/workflows/publish.yml` uses `bun publish` (and Bun-friendly auth wiring via `NPM_CONFIG_TOKEN`).

## Tradeoffs to choose explicitly (beyond “legacy directions”)

If we choose “Bun-only package manager”, the remaining tradeoffs are mostly about correctness/reproducibility and migration cost:

1) **Workspace source of truth**
   - Bun/npm-style workspaces come from root `package.json`.
   - Decision required: root `package.json` becomes authoritative for *all* workspaces (including plugins).

2) **Dependency resolution + override semantics**
   - Bun supports npm-style `overrides`, but parity is not guaranteed for pnpm-specific behaviors.
   - Decision required: define the minimal override policy we need, then express it in Bun-compatible config.

3) **Native dependency lifecycle scripts / security model**
   - Bun has a different model (`trustedDependencies`).
   - Decision required: declare which deps are trusted to run install scripts, and where that policy lives.

4) **CI caching + reproducibility contract**
   - Bun-only means a new lockfile + new caching strategy and a new “frozen lockfile” policy.

5) **Publishing mechanics + auth wiring**
   - Bun-only likely changes which env vars are used and how `.npmrc` is generated in CI.

None of these are reasons not to do Bun-only; they’re the “edges” that determine whether the migration is robust vs. brittle.

## Recommendation (Bun-first, pnpm-free / Bun-only package manager)

### Guiding Principles

1) Make Bun the only package manager contractually (no pnpm lockfile, no pnpm workspace file, no pnpm-root sentinel logic).
2) Keep the toolchain story coherent:
   - Prefer one test runner across most workspaces.
   - Use exceptions only when there’s a clear, durable advantage.
3) Keep Node as the runtime for built artifacts where appropriate (tsup/tsc/Vitest), but use Bun for installs and for executing scripts where it reduces friction.

## Proposed Migration Shape (Conceptual)

### Package management

- Canonical lockfile becomes `bun.lock*` (Bun).
- Delete `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and pnpm-specific root config (`packageManager`, `engines.pnpm`, `pnpm: { ... }`).

### Workspaces

- Root `package.json` becomes the single workspace membership source of truth (must include plugins).

### Root detection (repo runtime code)

- Replace `pnpm-workspace.yaml` scanning with Bun/Node-agnostic detection:
  - Prefer: traverse upward to the first `package.json` that declares `workspaces`.
  - Alternate: traverse upward to a new dedicated sentinel file (if you want “project root” to be stable even if `workspaces` change).

### Overrides / native build dependencies

- Migrate `pnpm.overrides` to top-level `overrides` in `package.json` (Bun supports this at top level).
- Migrate `pnpm.onlyBuiltDependencies` / `.npmrc only-built-dependencies[]` intent to Bun’s `trustedDependencies` (so lifecycle scripts for those deps run under Bun’s security model).

### Publishing

Default to Bun publishing, but keep Node/npm as a fallback only if there’s a concrete issue:

- Use `bun pm pack` + `bun publish` in CI.
- Prefer tarball-based publishing (`bun pm pack --ignore-scripts` then `bun publish <tgz>`) to reduce lifecycle-script variability during publish and ensure the build step is explicit and deterministic.
- Update CI secrets/env wiring to Bun-friendly auth (`NPM_CONFIG_TOKEN`) or add an explicit `.npmrc` auth line that maps an env var to the GitHub Packages registry token.

## Testing Tooling Recommendation (avoid incoherent mixes)

### Default: keep Vitest as the repo-wide test runner

Rationale:

- The repo already has a Vitest multi-project configuration (`vitest.config.ts`) and a central “run everything” workflow.
- Tests rely on Vitest-specific mocking patterns across multiple packages.
- Vitest provides ecosystem integrations (UI, Vite-powered transforms) that Bun test does not aim to replicate 1:1.

### Where Bun test is a clear win (and safe)

Adopt Bun test only if you intentionally decide that:

- the suite is “pure TS domain logic” (no Vite transforms, minimal framework integrations),
- speed and simplicity are a sustained priority,
- and you’re willing to standardize on Bun test repo-wide (or accept a documented exception).

Today, `packages/mapgen-core` fits the “pure TS domain logic” profile and already uses Bun test successfully.

### How to keep things coherent

Pick one of these strategies early:

**Strategy A (recommended): single runner = Vitest**
- Port `packages/mapgen-core` from `bun:test` → `vitest`.
- Outcome: one test runner, one command, fewer docs/CI branches.

**Strategy B: single runner = Bun test**
- Port Vitest suites to Bun test.
- Outcome: potentially faster tests, but higher migration cost and higher risk of losing Vitest capabilities or needing shims for `vi.*` patterns.

**Strategy C: allow exactly one exception**
- Keep Vitest as default.
- Keep `packages/mapgen-core` on Bun test (documented as an intentional exception).
- Ensure root scripts/CI explicitly run both so “green CI” remains a single concept.

Given your preference to avoid overlapping patterns without strong reason, Strategy A or C are the cleanest. Strategy A is the most coherent long-term if you’re trying to reduce tool variance.

## Sequencing / Parallelism (Complexity Estimate)

### Strictly sequenced (must happen early)

1) Make root `package.json` workspace globs include `packages/plugins/*` so Bun can resolve the full workspace graph.
2) Ensure Bun install works end-to-end (lockfile choice, workspace linking, dependency resolution).

### Can be parallelized after Bun install works

- Update scripts across packages/apps/mods from `pnpm` to `bun` equivalents (`--filter`, `--cwd`, `bunx`/`bun x`).
- Update CI workflows (install/cache/test/build/publish).
- Update docs that currently instruct `pnpm` (`docs/PROCESS.md`, `docs/process/CONTRIBUTING.md`, etc.).
- Replace pnpm-specific root detection in `packages/config` and any tests that mock `pnpm-workspace.yaml`.
- Migrate publish/link/pack scripts in `packages/cli` and `packages/sdk`.

### Rough size of effort (qualitative)

- **Medium** if keeping Vitest (and only changing package management + scripts + CI).
- **High** if trying to standardize everything on Bun test (test rewrites + feature gaps risk).

## Key Risks / Gotchas

- Bun’s lifecycle script model is different (trusted allowlist). If not configured, installs can fail subtly for native deps.
- `workspace:*` resolution will break if workspace globs are incomplete (plugins are currently the sharp edge).
- Publishing auth can be a footgun if CI sticks with `NODE_AUTH_TOKEN` but Bun expects `NPM_CONFIG_TOKEN` (or explicit `.npmrc` token wiring).
- `packages/config` (and by extension CLI defaults) must not assume pnpm workspace root discovery (this repo now uses pnpm-free root discovery).

## Minimum “implementable” prework checklist (what to harden first)

If the goal is to make this migration fully implementable with low ambiguity, the minimum prework is:

1) **Unify workspace membership**
   - Make root `package.json` workspaces include `packages/plugins/*` (or an equivalent glob that captures plugins).
   - Acceptance: `bun install` (or `bun pm install`) resolves `workspace:*` deps for plugin packages without special casing.

2) **Make “project root” pnpm-free**
   - Replace `pnpm-workspace.yaml` scanning in `packages/config/src/index.ts` with a pnpm-free rule:
     - either “nearest `package.json` that declares `workspaces`”,
     - or a dedicated sentinel file committed at repo root.
   - Acceptance: CLI/config resolution works even if `pnpm-workspace.yaml` is deleted.

3) **Define the Bun-native policy for native deps**
   - Translate “these deps are allowed to run install scripts” from pnpm settings to Bun’s model.
   - Acceptance: clean install works on CI and on macOS without manual intervention for `sharp`/`puppeteer`/etc.

4) **Rewrite CI install/cache to Bun**
   - Use Bun setup + `bun install --frozen-lockfile` + updated cache keys (lockfile changes).
   - Acceptance: CI can run the existing `build/lint/test` commands using Bun-only orchestration.

5) **Rewrite publishing to Bun (or explicitly keep Node/npm for publish)**
   - Decide whether “Bun-only package manager” also implies “Bun publishes”, or whether publish remains Node/npm for compatibility.
   - Acceptance: `@mateicanavra/civ7-sdk` and `@mateicanavra/civ7-cli` publish reliably to GitHub Packages with the chosen tool.

6) **Update docs to make Bun the contract**
   - `docs/process/CONTRIBUTING.md`, `docs/PROCESS.md`, and any “pnpm is required” notes.
   - Acceptance: new contributor can follow docs without installing pnpm at all.

## Relationship to Engine Refactor Work

- This SPIKE conflicts with the “Bun/pnpm bridge scripts” framing in `docs/projects/engine-refactor-v1/issues/CIV-9-bun-pnpm-bridge.md` if we decide to go pnpm-free. If the project goal is “no pnpm artifacts/logic”, then CIV-9’s contingency plan is either:
  - updated to a Bun-first plan (no pnpm bridge), or
  - explicitly re-scoped to “fallback to Node/npm only” (not pnpm), depending on the risk posture.
