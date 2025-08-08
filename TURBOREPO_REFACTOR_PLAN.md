
# Issue: Phase 0 — Prep & Guardrails (migration branch, toolchain, base configs)

## Goal

Create a safe branch for the monorepo migration, pin Node/pnpm via Corepack, remove npm lockfile, and add base config.

## Scope

- Create migration branch
- Enable Corepack and pin pnpm
- Remove `package-lock.json`
- Add root dev tooling minimal for monorepo
- Establish root TS base config and repo-level dotfiles

## Tasks

- [ ] Create branch: `git checkout -b chore/monorepo-turbo`
- [ ] Enable Corepack & pin pnpm: `corepack enable` (Node 20 LTS)
- [ ] Remove npm lockfile: `git rm -f package-lock.json`
- [ ] Add root `.npmrc`:
  ```
  shared-workspace-lockfile=true
  ```
- [ ] Add root `tsconfig.base.json`:
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
- [ ] Add minimal root `.eslintrc.cjs` and `.prettierrc` (can be replaced by shared config in Phase 6)
- [ ] Add root dev deps (workspace): `pnpm add -D -w turbo typescript vitest @types/node eslint prettier rimraf`

## Acceptance Criteria

- Corepack-enabled pnpm works; Node 20 in use
- No `package-lock.json` in repo
- `tsconfig.base.json` present and valid

## Out of Scope

- Moving code
- CI config

## Complexity

Low

---

# Issue: Phase 1 — Introduce Turborepo & Root Scripts

## Goal

Adopt Turborepo for orchestration/caching; route scripts through Turbo.

## Scope

- Add `turbo.json` pipeline
- Normalize root scripts (rename docs script)
- Normalize workspace globs

## Tasks

- [ ] Create `turbo.json`:
  ```json
  {
    "$schema": "https://turbo.build/schema.json",
    "pipeline": {
      "build": { "dependsOn": ["^build"], "outputs": ["dist/**", "types/**"] },
      "dev":   { "cache": false, "persistent": true },
      "lint":  {},
      "test":  { "dependsOn": ["^build"] },
      "docs":  { "cache": false },
      "clean": {}
    }
  }
  ```
- [ ] Update root `package.json` scripts:
  ```json
  {
    "scripts": {
      "build": "turbo run build",
      "dev": "turbo run dev --parallel",
      "lint": "turbo run lint",
      "test": "turbo run test",
      "docs:dev": "turbo run docs",
      "clean": "turbo run clean"
    }
  }
  ```
- [ ] Replace `pnpm-workspace.yaml` contents with:
  ```yaml
  packages:
    - "apps/*"
    - "packages/*"
  ```
- [ ] Remove root `docs:community` and `docs:official` scripts; keep only `docs:dev`

## Acceptance Criteria

- `pnpm build` → `turbo run build`
- `pnpm docs:dev` can serve docs via the docs app (Phase 4)
- Turbo cache directory `.turbo/` appears after runs

## Complexity

Low

---

# Issue: Phase 2 — Extract SDK into `packages/sdk`

## Goal

Move reusable library code to `@civ7/sdk` with ESM+CJS builds and types.

## Scope

- Move `/src/**` → `packages/sdk/src/**`
- Add package manifest, tsconfig, `tsup` build
- Define `exports` and `files`

## Tasks

- [ ] Create `packages/sdk/` and move current root `src/**` there
- [ ] Add `packages/sdk/package.json`:
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
- [ ] Add `packages/sdk/tsconfig.json`:
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
- [ ] Ensure `packages/sdk/src/index.ts` re-exports the public API
- [ ] Update imports throughout repo (including examples/build scripts) to `@civ7/sdk`

## Acceptance Criteria

- `pnpm -w -F @civ7/sdk build` emits ESM, CJS, `.d.ts`
- No references remain to old `root/src/*`

## Complexity

Medium

---

# Issue: Phase 3 — Refactor CLI to consume `@civ7/sdk`

## Goal

Point CLI to the SDK, ensure build order and bin resolution.

## Scope

- Add workspace dependency `@civ7/sdk`
- Replace imports to use `@civ7/sdk`
- Keep oclif + tsc pipeline

## Tasks

- [ ] Add dependency: `pnpm -w -F @civ7/cli add @civ7/sdk@workspace:*`
- [ ] Replace intra-repo imports to `@civ7/sdk`
- [ ] Ensure CLI `package.json`:
  - `"name": "@civ7/cli"`, `"private": false`
  - `"bin": { "civ7": "./bin/run.js" }` (existing pattern) and oclif `commands: "./dist/commands"`
  - `"prepublishOnly": "pnpm build"`
- [ ] Build uses `tsc` + `oclif manifest` (keep current approach)
- [ ] Validate: `pnpm -w build` then `pnpm -w -F @civ7/cli exec node ./bin/run.js --help`

## Acceptance Criteria

- CLI builds after SDK and runs
- No references to removed root `src/*`

## Complexity

Low–Medium

---

# Issue: Phase 4 — Docs App as Workspace (single service)

## Goal

Provide a docs app that serves both docs collections from one server; keep Markdown content at repo root.

## Scope

- Create `apps/docs/` (Docsify) that reads from `../../docs`
- Replace root scripts with `docs:dev` that runs this app
- Support loading the docs plugin (moved in Phase 4.1)

## Tasks

- [ ] Create `apps/docs/package.json`:
  ```json
  {
    "name": "@civ7/docs",
    "private": true,
    "scripts": {
      "dev": "docsify serve ./site -p 4000",
      "docs": "docsify serve ./site -p 4000",
      "build": "cp -R site dist",
      "clean": "rimraf dist"
    },
    "devDependencies": {
      "docsify-cli": "^4",
      "rimraf": "^6"
    }
  }
  ```
- [ ] Create `apps/docs/site/` minimal `index.html` that:
  - renders content from `../../docs` (root docs host both official/community)
  - loads plugin from `./plugins/code-slicer.js` (copied in Phase 4.1)
- [ ] Wire root `docs:dev` to this app (Turbo pipeline `docs` already present)

## Acceptance Criteria

- `pnpm -w docs:dev` serves all docs on one port (4000)
- No content moved out of `docs/`

## Complexity

Low

---

# Issue: Phase 4.1 — Package Docs Plugin and Copy Step

## Goal

Package the local docs plugin and copy it into the served site.

## Scope

- Create `packages/docs-plugins/` with `code-slicer.js`
- Add copy steps in docs app

## Tasks

- [ ] Create `packages/docs-plugins/package.json`:
  ```json
  {
    "name": "@civ7/docs-plugins",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "files": ["code-slicer.js"]
  }
  ```
- [ ] Move plugin to `packages/docs-plugins/code-slicer.js`
- [ ] Update `apps/docs/package.json`:
  ```json
  {
    "scripts": {
      "predev": "mkdir -p site/plugins && cp ../../packages/docs-plugins/code-slicer.js site/plugins/",
      "prebuild": "mkdir -p site/plugins && cp ../../packages/docs-plugins/code-slicer.js site/plugins/"
    },
    "dependencies": {
      "@civ7/docs-plugins": "workspace:*"
    }
  }
  ```
- [ ] Ensure docs site loads `./plugins/code-slicer.js`

## Acceptance Criteria

- Starting docs copies plugin; plugin works
- Plugin lives in its own package

## Complexity

Low

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

# Issue: Phase 5 — Playground App for Examples & Scripts

## Goal

Move demos/scripts into `apps/playground` that consumes `@civ7/sdk`.

## Scope

- Create `apps/playground/` with a runner
- Move `build.ts` and example scripts here
- Keep generated outputs separate from examples

## Tasks

- [ ] Create `apps/playground/package.json`:
  ```json
  {
    "name": "@civ7/playground",
    "private": true,
    "scripts": {
      "dev": "tsx src/build.ts",
      "build": "tsx src/build.ts",
      "clean": "rimraf dist"
    },
    "dependencies": { "@civ7/sdk": "workspace:*" },
    "devDependencies": { "tsx": "^4", "typescript": "^5", "rimraf": "^6" }
  }
  ```
- [ ] Move `build.ts` → `apps/playground/src/build.ts`
- [ ] Move `examples/**` → `apps/playground/src/examples/**` (update imports to `@civ7/sdk`)
- [ ] Keep generated outputs under `apps/playground/dist/` (or continue using `example-generated-mod/` but document it)
- [ ] Validate: `pnpm -w -F @civ7/playground dev` runs end-to-end

## Acceptance Criteria

- Playground runs builds using the SDK
- No root-level example/build scripts remain

## Complexity

Low

---

# Issue: Phase 6 — Shared Config Package (`@civ7/config`)

## Goal

Centralize reusable config (TS/ESLint/Prettier).

## Scope

- Add `packages/config/` with TS/Eslint/Prettier presets
- Point all workspaces to use them

## Tasks

- [ ] Create `packages/config/package.json`:
  ```json
  {
    "name": "@civ7/config",
    "private": true,
    "files": ["tsconfig", "eslint", "prettier"],
    "exports": {
      "./tsconfig/base": "./tsconfig/tsconfig.base.json",
      "./eslint": "./eslint/index.cjs",
      "./prettier": "./prettier/index.json"
    }
  }
  ```
- [ ] Add `packages/config/tsconfig/tsconfig.base.json` (copy/trim root base)
- [ ] Add `packages/config/eslint/index.cjs`
- [ ] Add `packages/config/prettier/index.json`
- [ ] Update each workspace `tsconfig.json` to `extends: "@civ7/config/tsconfig/base"`

## Acceptance Criteria

- All workspaces build/lint with shared config
- Root `tsconfig.base.json` remains no-emit base

## Complexity

Low

---

# Issue: Phase 7 — CI with Turbo Cache (Build/Lint/Test)

## Goal

Add GitHub Actions CI with pnpm + Turbo caching, Node 20.

## Scope

- One workflow `.github/workflows/ci.yml`
- Cache pnpm store and Turbo cache
- Run `build`, `lint`, `test`

## Tasks

- [ ] Create workflow:
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
- [ ] Ensure each workspace has `build`, `lint`, `test` (test may be no-op initially)

## Acceptance Criteria

- CI green on PRs and `main`
- Turbo cache hits visible on PRs

## Complexity

Low

---

# Issue: Phase 8 — Repo Cleanup & Contributor Docs

## Goal

Remove stale root code paths and document the monorepo layout.

## Scope

- Delete/relocate obsolete root scripts (`src` references)
- Update `README.md`; add `CONTRIBUTING.md`
- Consider `CODEOWNERS`

## Tasks

- [ ] Remove root imports/scripts to old `src/*`
- [ ] Update `README.md` with: monorepo structure; how to run SDK, CLI, docs, playground; editing docs in `/docs`
- [ ] Add `CONTRIBUTING.md` with two paths:
  - Docs/content: edit `/docs` Markdown
  - Code: standard pnpm + Turbo commands
- [ ] (Optional) Add `CODEOWNERS`

## Acceptance Criteria

- No dead paths
- New contributors can run locally following docs

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
- [ ] Verify: `pnpm -w -F @civ7/cli link --global` → `civ7 --help`

## Acceptance Criteria

- Both packages can be packed/linked successfully