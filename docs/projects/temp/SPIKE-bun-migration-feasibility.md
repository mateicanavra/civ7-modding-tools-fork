# SPIKE: Bun Migration Feasibility (Monorepo-wide)

## Objective

Evaluate what it would take to migrate this repo from `pnpm` to Bun’s package manager, prefer Bun for script execution, use Bun’s test runner where it’s a clear win (without ending up with an incoherent split), and default to Bun for CI publishing unless there’s a concrete blocker.

## Summary Verdict

**Feasible with caveats.** Bun is already used in-repo (`.bun-version` exists; multiple workspaces run TypeScript scripts via `bun run`), but there are real pnpm couplings that must be removed or replaced with Bun-native equivalents to meet the “no pnpm artifacts/logic” goal.

The main risks are not “Bun runtime incompatibility” so much as:

- Workspace definition drift (pnpm uses `pnpm-workspace.yaml`; Bun uses `package.json` workspaces)
- pnpm-only dependency controls (`pnpm.overrides`, `pnpm.onlyBuiltDependencies`, and `.npmrc` knobs)
- CI workflows and auth patterns that are currently pnpm-centric
- Repo runtime code that detects “workspace root” by looking for `pnpm-workspace.yaml`

## Current State (Evidence)

### Workspaces (critical mismatch for Bun)

- Root `package.json` workspaces omit `packages/plugins/*` (`package.json:35`).
- pnpm includes plugins via `pnpm-workspace.yaml:1`.
- Multiple workspaces depend on plugins via `workspace:*` (e.g. `packages/cli/package.json` depends on `@civ7/plugin-*`).

Under Bun, workspace membership comes from root `package.json`. As-is, Bun would likely fail to resolve those plugin `workspace:*` deps unless the root workspaces list is corrected first.

### pnpm-specific runtime logic (must be removed)

`packages/config/src/index.ts:24` finds the project root by scanning upwards for `pnpm-workspace.yaml`, and throws:

> “Could not find project root. Are you in a pnpm workspace?”

If we remove pnpm artifacts, this logic must be rewritten to detect the repo root using pnpm-free markers (e.g. `package.json` with `workspaces`, or a dedicated project sentinel file).

### pnpm-only dependency controls (need Bun equivalents)

Root `package.json` contains pnpm-only config (`package.json:80`):

- `pnpm.overrides` (pins `typescript`, `@types/node`, `rimraf`)
- `pnpm.onlyBuiltDependencies` (includes `docsify`, `esbuild`, `puppeteer`, `sharp`)

Bun supports top-level `overrides` (npm-style) but not pnpm’s nested override semantics. For “only built dependencies”, Bun uses a different concept: `trustedDependencies` (Bun’s secure-by-default lifecycle script allowlist).

Also note root `.npmrc` includes pnpm-only settings (e.g. `only-built-dependencies[]=`) and would likely be replaced or migrated to Bun’s `bunfig.toml` for Bun-native config (Bun docs recommend this).

### Tests (Vitest is repo standard; one Bun-test island exists)

- Root runs Vitest across multiple “projects” via `vitest.config.ts:7`.
- Most tests use Vitest APIs (`vi.mock`, `vi.importActual`, etc.) across `packages/cli`, `packages/sdk`, plugins, and apps.
- `packages/mapgen-core` is an exception: it uses `bun test` and imports from `bun:test` across its suite.

This is already a mixed model today (Vitest + Bun test).

### CI / Publishing (currently pnpm-centric)

CI installs and runs with pnpm:

- `.github/workflows/ci.yml` uses Corepack + pnpm, caches pnpm store keyed off `pnpm-lock.yaml`, then runs `pnpm build/lint/test`.

Publishing is pnpm-based and targets GitHub Packages:

- `.github/workflows/publish.yml:139` uses `pnpm -F … publish` with `NODE_AUTH_TOKEN` and `NPM_CONFIG_REGISTRY`.

Bun supports publishing and `.npmrc`, but the expected auth environment variable is typically `NPM_CONFIG_TOKEN` (per Bun docs for `bun publish`). This is solvable, but it’s a deliberate change in CI conventions.

## Recommendation (Bun-first, pnpm-free)

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
- `packages/config` (and by extension CLI defaults) currently assume pnpm workspace root discovery and will need to be rewritten once pnpm artifacts are removed.

## Relationship to Engine Refactor Work

- This SPIKE conflicts with the “Bun/pnpm bridge scripts” framing in `docs/projects/engine-refactor-v1/issues/CIV-9-bun-pnpm-bridge.md` if we decide to go pnpm-free. If the project goal is “no pnpm artifacts/logic”, then CIV-9’s contingency plan is either:
  - updated to a Bun-first plan (no pnpm bridge), or
  - explicitly re-scoped to “fallback to Node/npm only” (not pnpm), depending on the risk posture.

