# Plugins Implementation Plan

## Objective
Create small, domain-scoped libraries under `packages/plugins/*` that expose reusable programmatic APIs and can later be wrapped by oclif command shims. Keep `@civ7/cli` thin, enable apps (docs/playground) to reuse features without importing the CLI, and retain `@civ7/config` as a framework-agnostic shared library.

## Scope (Phase 1, quick wins)
- Extract file operations (zip/unzip) into `@civ7/plugin-files` with a typed API.
- Wire CLI `zip`/`unzip` commands to call the new lib.
- Switch docs sync to use the lib’s unzip programmatically for speed.
- Establish common TS build config for plugin libs.

Out of scope (deferred): publishing oclif plugins.

## Assumptions
- Node 20+, pnpm workspace, Turbo v2, Bun available for dev.
- System utilities `zip` and `unzip` available on dev/CI. Fallbacks may copy or use a JS alternative where needed.
- `@civ7/config` remains a small, private, cross-cutting library used by CLI and apps.

## Deliverables
- `packages/plugins/plugin-files` (private):
  - Programmatic API: `zipResources(options)`, `unzipResources(options)` with typed options and summary outputs.
  - Tests and linting.
  - ESM+CJS+types build via `tsup`.
- CLI updated to call the lib for `zip`/`unzip` (no behavior change visible to users).
- Docs sync script updated to call `unzipResources` (faster than full directory copy).
- Shared `tsconfig.plugins.json` and workspace updated to include `packages/plugins/*`.

## Step-by-step plan

1) Workspace scaffolding (shared configs)
- Add `packages/plugins/*` to `pnpm-workspace.yaml`.
- Add root `tsconfig.plugins.json` for plugin libs (extends `tsconfig.base.json`):
  ```json
  {
    "extends": "./tsconfig.base.json",
    "compilerOptions": {
      "composite": true,
      "declaration": true,
      "outDir": "dist",
      "rootDir": "src",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "noEmit": false
    },
    "include": ["src"]
  }
  ```
- Update `vitest.config.ts` to include a project for `packages/plugins` when tests are added.

Acceptance
- `pnpm build`, `pnpm lint`, `pnpm test` still pass.

2) Create `@civ7/plugin-files` (library only)
- Files:
  - `packages/plugins/plugin-files/package.json` (private, `files: ["dist"]`, scripts for `build/dev/lint/test/clean`).
  - `packages/plugins/plugin-files/tsconfig.json` extends `../../tsconfig.plugins.json`.
  - `packages/plugins/plugin-files/src/index.ts` exporting:
    - `zipResources(options: { projectRoot: string; profile?: string; srcDir?: string; out?: string; verbose?: boolean; })`
    - `unzipResources(options: { projectRoot: string; profile?: string; zip?: string; dest?: string; })`
    - Utility: `hasSystemZip()`, `hasSystemUnzip()` (optional).
  - Internally prefer system `zip`/`unzip` via `spawn` for speed; provide clear error if unavailable.
  - Reuse `@civ7/config` for path/config resolution; no oclif dependency.
- Tests (Vitest):
  - Unit tests for deterministic error handling (missing inputs) with `node:fs` mocked for existence checks.
  - Success paths validated via existing e2e (refresh:data + docs run).
  - Type checks and lint pass.

Acceptance
- `pnpm -F @civ7/plugin-files build` emits ESM+CJS+d.ts.
- Tests pass locally and in CI.

3) Wire CLI `zip`/`unzip` to the plugin lib
- Replace direct spawn/logic in `packages/cli/src/commands/{zip,unzip}.ts` with calls to `@civ7/plugin-files` APIs (retain existing messages/summaries for UX stability).
- Keep `@civ7/config` usage for flags/config; the lib handles file operations.
- Do not create an oclif plugin package yet; we’re just importing the lib.

Acceptance
- `pnpm dev:cli -- zip default` and `unzip default` behave exactly as before (same outputs, messages, and summaries).
- Unit tests for CLI still pass.

4) Update docs sync to use plugin lib
- In `apps/docs/scripts/sync-resources.ts`, import `unzipResources` from `@civ7/plugin-files` and use it to extract into `site/civ7-official/resources`.
- Keep copying the archive for download if desired.
- Ensure `apps/docs` depends on `@civ7/plugin-files` and `predev` builds it (or rely on Turbo build when running dev via root scripts).

Acceptance
- `pnpm dev:docs` performs a fast sync (unzip) and then serves.
- Dev ergonomics preserved; logs are clear.

5) Documentation & hygiene
- Root `README.md` and `CONTRIBUTING.md`: add a brief “Plugins” section explaining the split and how to use `@civ7/plugin-files` programmatically.
- Add notes on system `zip/unzip` dependency; provide fallback instructions.
- Ensure no magic strings: keep defaults/constants at top-level of each plugin lib, with tests.

Acceptance
- Docs updated, CI green.

Future phases (deferred)
- Consider promoting libs to true oclif plugins when publishing the CLI (list under `oclif.plugins`), or keep embedded command shims.

## Risks & mitigations
- System zip/unzip availability: detect and report; document installation; optionally add JS fallback in a later iteration.
- Cross-platform path/process differences: covered via tests and `@civ7/config` path resolution.
- Build order: Turbo handles `dependsOn`; ensure `apps/docs` predev or root `dev` triggers builds as needed.

## Acceptance criteria (overall)
- Programmatic unzip used by docs; noticeably faster sync vs directory copy.
- CLI behavior unchanged for end users.
- All builds/lint/tests pass at root and CI.
- New plugin package(s) are private, typed, and documented.

## Status
- Completed: Phase 1
  - `@civ7/plugin-files` added and wired to CLI/docs.
  - Shared `tsconfig.plugins.json` and workspace updates.
  - Unit tests added for error handling; e2e validated via refresh/data and docs run.
- Completed: Phase 2 — `@civ7/plugin-graph`
  - Implemented `graphToDot`, `graphToJson`, `buildGraphViewerHtml`, `renderSvg`.
  - Extracted crawler/indexer from CLI into the plugin; CLI `render`, `crawl`, and `explore` are thin wrappers.
  - Added `crawlGraph` and `exploreGraph` pipelines under `src/pipelines` so CLI delegates all graph logic.
  - Added structured error handling and optional logging to graph pipelines.
  - Plugin now bundles `fast-xml-parser` and `@hpcc-js/wasm`; CLI no longer depends on XML parsing libraries.
  - Future: add unit tests for graph export edge cases and engine selection.
