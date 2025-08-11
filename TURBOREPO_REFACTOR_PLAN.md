
# Turborepo Migration Plan

## Current Status: Phase 7 Complete; Phase 8 partially complete

### Completed Phases
- ✅ Phase 0: Prep & Guardrails
- ✅ Phase 1: Turborepo & Root Scripts
- ✅ Phase 2: SDK Package Extraction
- ✅ Phase 3: CLI Refactoring (SDK integration deferred)
- ✅ Phase 4: Docs App (simplified architecture)
- ✅ Phase 5: Playground App
- ✅ Phase 5.1: SDK Documentation Organization
- ✅ Phase 8 (partial): Outputs Normalization & Config Refactor

### Next Immediate Step
**Phase 8: Repo Cleanup & Contributor Docs** - Plugin structure introduced; finalize remaining tasks; add workspace-wide type checks.

### Upcoming Phases (in order)
1. Phase 8: Repo Cleanup & Contributor Docs

### Deferred/Modified
- Phase 6: Shared Config Package — Scrapped. Reason: packages require divergent TS configs (SDK Bundler/ESNext with tsup, CLI CommonJS/Node with oclif, apps run with Bun and noEmit). Centralizing offered no net benefit and introduced breakage. Keep per-package tsconfig; consider shared ESLint/Prettier later only if they reduce duplication.
- Phase 4.1: Docs Plugin Package (not needed with simplified architecture)
- Phase 4.2: Game Resources Package (future consideration)

## Status audit and outstanding items (2025-08-11)

- Phase 7 — CI with Turbo Cache: Implemented in repo.
  - Doc updates: set "Next Immediate Step" to Phase 8 and mark Phase 7 tasks as done. CI lives at `.github/workflows/ci.yml` (Node 20, Corepack pnpm@10.10.0, Turbo cache on `.turbo`, Bun setup, runs build/lint/test).

- Phase 8 — Outputs normalization: ✅ **Completed**. The `civ.config.jsonc` has been refactored to a more modular `inputs`/`outputs`/`profiles` structure.
  - The new structure provides clear global defaults and allows for powerful per-profile overrides. Example:
    ```jsonc
    {
        "inputs": { "installDir": "..." },
        "outputs": {
            "baseDir": ".civ7/outputs",
            "zip": { "dir": "archives", "name": "..." }
        },
        "profiles": {
            "default": {
                "outputs": { "baseDir": "apps/docs/site/civ7-official" }
            }
        }
    }
    ```
  - The `docs` app continues to use a profile override to place resources directly in its source tree.
  - `README.md` and `CONTRIBUTING.md` have been updated to reflect this new policy.

- Script and config terminology alignment (doc-only):
  - Root scripts differ from examples: repo uses `dev:docs` (not `docs:dev`), and root `test` runs `vitest run` (not `turbo run test`). Update examples/text to reflect current scripts or add a note about acceptable variants.
  - Turbo config examples should use `"tasks"` (Turbo v2) instead of `"pipeline"`.

- Phase 8.1 — Plugins scaffold: ✅ **Completed**.
  - Introduced `packages/plugins/plugin-files` with programmatic `zipResources`/`unzipResources` APIs (typed, no logging) consuming `@civ7/config`.
  - CLI `zip`/`unzip` now call the plugin lib (thin command surface, same UX).
  - Docs sync optimized: uses plugin unzip from central archive (fallback to copy if archive missing).
- Phase 9 — Publication readiness: Implemented in repo.
  - Doc updates: mark Phase 9 checklist items as completed (SDK/CLI manifests, `files`, `bin`, `prepublishOnly`, `engines`) or move this phase to Completed.

---

# Issue: Phase 0 — Prep & Guardrails (migration branch, toolchain, base configs) — Completed

## Goal

Create a safe branch for the monorepo migration, pin Node/pnpm via Corepack, remove npm lockfile, and add base config.

## Scope

- Create migration branch
- Enable Corepack and pin pnpm
- Remove `package-lock.json`
- Add root dev tooling minimal for monorepo
- Establish root TS base config and repo-level dotfiles

## Tasks (Completed)

- [x] Create branch: `git checkout -b chore/monorepo-turbo`
- [ ] Enable Corepack & pin pnpm: `corepack enable` (Node 20 LTS) — Deferred (not executed now; revisit later to improve reproducibility)
- [x] Remove npm lockfile: `git rm -f package-lock.json`
- [x] Add root `.npmrc`:
  ```
  shared-workspace-lockfile=true
  only-built-dependencies[]=docsify
  only-built-dependencies[]=esbuild
  ```
- [x] Pin pnpm in root `package.json`: add `"packageManager": "pnpm@10.10.0"`
- [x] Add `.nvmrc` with `20` to standardize local Node to LTS
- [x] Add root `tsconfig.base.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "strict": true,
      "resolveJsonModule": true,
      "declaration": true,
      "sourceMap": true,
      "skipLibCheck": true,
      "noEmit": true
    }
  }
  ```
- [x] Add minimal root `.eslintrc.cjs` and `.prettierrc` (can be replaced by shared config in Phase 6)
- [x] Add root dev deps (workspace): `pnpm add -D -w turbo typescript vitest @types/node eslint prettier rimraf`

## Acceptance Criteria

- Corepack-enabled pnpm works; Node 20 in use
- No `package-lock.json` in repo
- `tsconfig.base.json` present and valid

Note: Corepack enabling is intentionally deferred to avoid potential impact on other local projects. Consider enabling in a follow-up once ready.

## Out of Scope

- Moving code
- CI config

## Complexity

Low

---
 
## Tooling Principles (Bun-first dev)

- We will use Bun for development/runtime where possible (fast TS execution, hot reload, bundler/runner), and minimize TS→JS build steps.
- SDK remains the only package that always builds JS artifacts (CJS/ESM + types) for Node consumption.
- CLI, docs, and playground run on Bun in dev; they do not emit JS in dev. The CLI will still have a targeted build step (tsc + oclif manifest) only for packaging/publish.
- Do not remove Bun-specific config (e.g., `bun-types`) from the CLI while we migrate to Bun-first workflows.
- Reduce duplicate TS toolchains (avoid mixing tsx/ts-node/custom bundlers) in favor of Bun for apps and `tsup` for the SDK.

### Final decisions (concise)

- CLI (dev): Bun runtime via `bin/dev.js` shebang; no JS emission in dev, per oclif Bin Scripts guidance [Templates → Bin Scripts](https://oclif.io/docs/templates/#bin-scripts).
- CLI (publish): Node runtime. Emit per-file CJS with `tsc` to `dist/`, then run `oclif manifest`; keep `bin/run.js` shebang as Node (broad compatibility). ESM is optional; follow oclif ESM guidance if needed [ESM](https://oclif.io/docs/esm).
- SDK: keep dual outputs ESM+CJS+`.d.ts` via `tsup` with `exports` map. Rationale: maximize consumer compatibility with negligible maintenance overhead. Most consumers are modern Node, but we keep CJS for now and can drop it in a future major release.
- Docs/Playground: Bun runtime for dev; no JS emission in dev.
- Minimize toolchains: only `tsup` (SDK) and `tsc` (CLI publish). All other workflows use Bun.

### Dependency policy (monorepo)

- Keep runtime dependencies local to each workspace (apps/packages) that use them.
- Keep shared dev toolchain (TypeScript, ESLint/Prettier, Turbo, rimraf) at the root; pin versions via `pnpm.overrides` to align across the repo.
- Avoid top-level runtime deps; only tooling at root. Remove unused root deps proactively.
- Only add test runners (e.g., Vitest) and docs runtime tooling (e.g., Docsify CLI) in the specific app/package that needs them.

# Issue: Phase 1 — Introduce Turborepo & Root Scripts — Completed (updated for Turbo v2)

## Goal

Adopt Turborepo for orchestration/caching; route scripts through Turbo.

## Scope

- Add `turbo.json` pipeline
- Normalize root scripts (rename docs script)
- Normalize workspace globs

## Tasks (Completed)

- [x] Create `turbo.json`:
  ```json
  {
    "$schema": "https://turbo.build/schema.json",
    "tasks": {
      "build": { "dependsOn": ["^build"], "outputs": ["dist/**", "types/**"] },
      "dev":   { "cache": false, "persistent": true },
      "lint":  {},
      "test":  { "dependsOn": ["^build"] },
      "clean": {}
    }
  }
  ```
- [x] Update root `package.json` scripts (pnpm:dev:* convention retained):
  ```json
  {
    "scripts": {
      "build": "turbo run build",
      "dev": "turbo run dev --parallel",
      "lint": "turbo run lint",
      "test": "vitest run",
      "dev:docs": "pnpm -F @civ7/docs dev",
      "clean": "turbo run clean"
    }
  }
  ```
- [x] Replace `pnpm-workspace.yaml` contents with:
  ```yaml
  packages:
    - "apps/*"
    - "packages/*"
  ```
- [x] Remove root `docs:community` and `docs:official` scripts; keep only `docs:dev`

## Acceptance Criteria

- `pnpm build` → `turbo run build`
- `pnpm docs:dev` can serve docs via the docs app (Phase 4)
- Turbo cache directory `.turbo/` appears after runs

## Complexity

Low

---

# Issue: Phase 2 — Extract SDK into `packages/sdk` — Completed

## Goal

Move reusable library code to `@civ7/sdk` with ESM+CJS builds and types.

## Scope

- Move `/src/**` → `packages/sdk/src/**`
- Add package manifest, tsconfig, `tsup` build
- Define `exports` and `files`

## Tasks (Completed)

- [x] Create `packages/sdk/` and move current root `src/**` there
- [x] Add `packages/sdk/package.json`:
  ```json
  {
    "name": "@civ7/sdk",
    "version": "0.0.0",
    "private": false,
    "type": "module",
    "main": "./dist/index.cjs",
    "module": "./dist/index.mjs",
    "types": "./dist/index.d.ts",
    "files": ["dist"],
    "exports": {
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.mjs",
        "require": "./dist/index.cjs"
      }
    },
    "scripts": {
      "build": "tsup src/index.ts --format esm,cjs --dts",
      "dev": "tsup src/index.ts --format esm,cjs --dts --watch",
      "test": "vitest run",
      "lint": "eslint .",
      "clean": "rimraf dist",
      "prepublishOnly": "pnpm build"
    },
    "devDependencies": {
      "tsup": "^7",
      "typescript": "^5",
      "vitest": "^2",
      "@types/node": "^20",
      "eslint": "^9"
    },
    "engines": { "node": ">=20" },
    "publishConfig": { "access": "public" }
  }
  ```
- [x] Add `packages/sdk/tsconfig.json`:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "composite": true,
      "declaration": true,
      "outDir": "dist",
      "rootDir": "src",
      "moduleResolution": "Bundler"
    },
    "include": ["src"]
  }
  ```
- [x] Ensure `packages/sdk/src/index.ts` re-exports the public API
- [x] Update imports throughout repo (including examples/build scripts) to `@civ7/sdk`

## Acceptance Criteria

- `pnpm -F @civ7/sdk build` emits ESM, CJS, `.d.ts`
- No references remain to old `root/src/*`

## Complexity

Medium

---

# Issue: Phase 3 — Refactor CLI to consume `@civ7/sdk` — Completed (deferred integration)

## Goal

Point CLI to the SDK, ensure build order and bin resolution.

## Scope

- Add workspace dependency `@civ7/sdk`
- Replace imports to use `@civ7/sdk`
- Keep oclif + tsc pipeline
 - Keep Bun as the dev runtime for the CLI. No JS outputs needed in dev; retain a build only for packaging/publishing.

## Tasks

- [x] Rename package to `@civ7/cli`
- [x] Defer SDK integration: remove unused `@civ7/sdk` dependency to keep CLI lean now; add a clear stub in `packages/cli/src/index.ts` documenting intent to import from `@civ7/sdk` later.
- [x] Ensure CLI `package.json`:
  - `"name": "@civ7/cli"`, `"private": false`
  - `"bin": { "civ7": "./bin/run.js" }` and oclif `commands: "./dist/commands"`
  - `"prepublishOnly": "pnpm build"`
- [x] Dev runs on Bun (`pnpm -F @civ7/cli dev` → `bun run src/index.ts`). Keep `bun-types`.
- [x] Build uses `tsc` + `oclif manifest` only for packaging/publish
- [x] Validate: `pnpm --filter @civ7/cli run build` then `node packages/cli/bin/run.js --help`

## Acceptance Criteria

- CLI builds and runs
- No references to removed root `src/*`
- Future: when integrating SDK, re-add `@civ7/sdk` dependency and replace imports

## Complexity

Low–Medium

---

# Issue: Phase 4 — Docs App as Workspace — Completed (simplified architecture)

## Goal

Provide a docs app that serves both docs collections from one server.

## Scope

- Create `apps/docs/` (Docsify) with self-contained content
- Replace root scripts with `docs:dev` that runs this app
- Include docs plugin directly in site

## Implementation Note

After extensive discussion, we chose a simplified architecture:
- Moved entire `docs/` tree into `apps/docs/site/` for self-contained serving
- Plugin (`code-slicer.js`) lives directly in `apps/docs/site/plugins/`
- No symlinks or complex copy operations needed
- Documented future migration path in `apps/docs/site/sessions/docs-architecture.md`

## Tasks (Completed)

- [x] Created `apps/docs/package.json` with simplified scripts
- [x] Moved all docs content to `apps/docs/site/`
- [x] Plugin included directly at `apps/docs/site/plugins/code-slicer.js`
- [x] Updated root `docs:dev` to serve from `apps/docs`
- [x] Created architecture documentation for future migration

## Acceptance Criteria

- `pnpm docs:dev` serves all docs on port 4000 ✓
- Single self-contained docs directory ✓

## Complexity

Low (simplified from original plan)

---

# Issue: Phase 4.1 — Package Docs Plugin — Deferred

## Goal

Package the local docs plugin as a separate package.

## Status: Deferred

Based on simplified docs architecture in Phase 4:
- Plugin currently lives at `apps/docs/site/plugins/code-slicer.js`
- Works without additional packaging or copy steps
- May revisit if/when docs architecture evolves to multi-package setup

See `apps/docs/site/sessions/docs-architecture.md` for future migration plans.

## Complexity

Low (when needed)

---

# Issue: Phase 4.2 — (Future) Game Resources Package

## Goal

Separate processed/official Civ7 resources as a distinct package, not mixed with docs Markdown.

## Scope

- Create `packages/resources/` (name TBD, e.g., `@civ7/resources`)
- Store zipped/indexed artifacts (crawler/graphics outputs), avoid committing raw large dumps
- Provide simple read API or static asset publishing strategy

## Out of Scope (now)

- Implementing the package; this is a placeholder for future work

---

# Issue: Phase 5 — Playground App for Examples & Scripts — Completed

## Goal

Move demos/scripts into `apps/playground` that consumes `@civ7/sdk`.

## Scope

- Create `apps/playground/` with a runner
- Move `build.ts` and example scripts here
- Keep generated outputs separate from examples

## Tasks (Completed)

- [x] Created `apps/playground/package.json`
- [x] Moved `build.ts` → `apps/playground/src/build.ts`
- [x] Moved `examples/**` → `apps/playground/src/examples/**`
- [x] Generated outputs in `apps/playground/example-generated-mod/`
- [x] All imports updated to use `@civ7/sdk`

## Acceptance Criteria

- Playground runs builds using the SDK ✓
- No root-level example/build scripts remain ✓

## Complexity

Low

---

# Issue: Phase 5.1 — SDK Documentation Organization — Completed

## Goal

Organize SDK-specific documentation within the SDK package.

## Tasks (Completed)

- [x] Moved `CHANGELOG.md` from root to `packages/sdk/`
- [x] Created comprehensive `packages/sdk/README.md` with SDK-specific content
- [x] Created `packages/sdk/AGENTS.md` for AI navigation
- [x] Moved `TECHNICAL_GUIDE.md` to `packages/sdk/`
- [x] Updated root README to be workspace-focused

## Acceptance Criteria

- SDK package is self-documenting ✓
- Root README describes overall workspace ✓

---

# Issue: Phase 6 — Shared Config Package — Scrapped

## Decision

Attempt to centralize TS/ESLint/Prettier configs showed minimal benefit and caused TS config conflicts/build errors. Packages have different compilation/runtime needs (SDK with Bundler + ESNext + tsup, CLI with CommonJS + Node + oclif, apps run with Bun and noEmit). We will keep per‑package `tsconfig.json`.

## Rationale

- Most settings needed overriding per package
- Centralization increased complexity without benefit
- Existing per-package configs are simple and stable

## Follow-ups

- Optional: shared ESLint/Prettier presets in the future only if they reduce duplication

---

# Issue: Phase 6 — Shared Config Package (`@civ7/config`) — Scrapped

Centralization abandoned. Keep per‑package `tsconfig.json`. Revisit only if package needs converge. ESLint/Prettier sharing is optional later.

---

---

# Issue: Phase 7 — CI with Turbo Cache (Build/Lint/Test) — Completed

## Goal

Add GitHub Actions CI with pnpm + Turbo caching, Node 20.

## Scope

- One workflow `.github/workflows/ci.yml`
- Cache pnpm store and Turbo cache
- Run `build`, `lint`, `test`

## Tasks (Completed)

- [x] Create workflow:
  ```yaml
  name: CI
  on:
    push: { branches: [ main ] }
    pull_request: { branches: [ main ] }
  jobs:
    ci:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: 'pnpm'
        - run: corepack enable
        - run: pnpm install --frozen-lockfile
        - name: Cache Turbo
          uses: actions/cache@v4
          with:
            path: .turbo
            key: turbo-${{ runner.os }}-${{ github.sha }}
            restore-keys: |
              turbo-${{ runner.os }}-
        - run: pnpm build
        - run: pnpm lint
        - run: pnpm test
  ```
- [x] Ensure each workspace has `build`, `lint`, `test` (test may be no-op initially)

## Acceptance Criteria

- CI green on PRs and `main`
- Turbo cache hits visible on PRs

## Complexity

Low

---

# Issue: Phase 8 — Repo Cleanup & Contributor Docs

## Goal

Remove stale root code paths and document the monorepo layout. Normalize all tool outputs so nothing writes to the repo root, and establish a consistent workspace output policy.

## Scope

- Delete/relocate obsolete root scripts (`src` references)
- Root hygiene: audit loose files at repo root and move/retire
- Normalize output destinations across all packages/apps
- Update `README.md`; add `CONTRIBUTING.md`
- Consider `CODEOWNERS`

## Tasks

### Root hygiene
- [ ] Audit and relocate `fix_links.sh` (move under `apps/docs/scripts/` or replace with a Node script invoked by docs app)
- [ ] Verify `tsconfig.base.json` usage; document inheritance or remove if no longer used
- [ ] Audit presence/need of `.editorconfig`; add/update to standardize editors if missing
- [ ] Review other loose root files (tools, helper scripts) and move into the owning package/app or delete
- [ ] Ensure `.gitignore` covers all generated outputs and large local artifacts

### Outputs normalization (policy + implementation)
- [x] Inventory current outputs and default locations.
- [x] Define workspace output policy: no outputs at repo root; default to `.civ7/outputs`.
- [x] Add configuration for outputs (`civ.config.jsonc` refactored to `inputs`/`outputs`/`profiles`).
- [x] Update CLI defaults to respect the output policy/config.
- [x] Extract zip/unzip core into `@civ7/plugin-files`; CLI uses plugin; docs use programmatic unzip.
- [ ] Confirm docs build emits only to `apps/docs/dist`
- [x] Confirm SDK build remains `packages/sdk/dist`.
- [x] Confirm Playground outputs stay under its app directory.
- [x] Update `.gitignore` to exclude all configured output paths (`.civ7/` was already present).

### Contributor docs
- [ ] Update `README.md` with: monorepo structure; how to run SDK, CLI, docs, playground; where outputs go and how to configure them
- [ ] Add `CONTRIBUTING.md` with clear guidance on running tasks and the output policy
- [ ] (Optional) Add `CODEOWNERS`

## Acceptance Criteria

- No dead paths
- New contributors can run locally following docs
- Running CLI commands (zip/unzip/graph), building docs, building SDK, and running playground examples do not write any files at repo root; outputs are confined to package-local `dist/` or the configured `outputs/` locations

---

# Cross-cutting follow-ups

- Script conventions and test runners
  - We have standardized on `pnpm:dev:*` naming (e.g., `dev:docs`). This supersedes earlier examples; keep this convention.
  - Note: root `test` currently uses `vitest run` directly rather than `turbo run test`. Either is acceptable; pick the one that fits local dev/CI best and document the rationale.

- Workspace-wide type checking
  - Add a root `check` script that runs type checks across all apps/packages via Turbo.
  - Suggestion:
    - In `turbo.json`, ensure a `check` task exists (e.g., `"check": {}`).
    - In each package/app, add a `check` script (`tsc -p tsconfig.json --noEmit` or equivalent).
    - In root `package.json`, add: `"check": "turbo run check"`.

- package.json audit
  - Review every workspace’s `package.json` to remove obsolete scripts, ensure `devDependencies` are local and minimal, and align scripts to the monorepo conventions (dev/build/lint/test/check/publish where applicable).
  - Verify publish settings for packages intended for npm (SDK/CLI), and that apps are private.

## Complexity

Low

---

# Issue: Phase 9 — Prepare Packages for Publication (SDK + CLI)

## Goal

Make `@civ7/sdk` and `@civ7/cli` publishable to npm.

## Scope

- `private:false`, `publishConfig.access: public`
- `prepublishOnly` builds; `files` whitelists outputs
- Verify CLI `bin`

## Tasks

- [ ] Confirm `packages/sdk/package.json`:
  - `"private": false`, `"files": ["dist"]`
  - `"publishConfig": { "access": "public" }`
  - `"prepublishOnly": "pnpm build"`
  - Valid `exports`/`types`, `engines.node: ">=20"`
- [ ] Confirm `packages/cli/package.json`:
  - `"private": false`, `"name": "@civ7/cli"`
  - `"bin": { "civ7": "./bin/run.js" }`
  - `"files": ["bin","dist","oclif.manifest.json"]`
  - `"publishConfig": { "access": "public" }`
  - `"prepublishOnly": "pnpm build"`
  - `engines.node: ">=20"`
- [ ] Verify: `pnpm -F @civ7/cli link --global` → `civ7 --help`

## Acceptance Criteria

- Both packages can be packed/linked successfully