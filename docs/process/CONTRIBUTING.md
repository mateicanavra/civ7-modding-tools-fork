# Contributing to Civ7 Modding Tools

This repository is a pnpm + Turborepo monorepo with a Bun-first developer experience.

## Prerequisites
- Node 20 (see `.nvmrc`)
- Optional: pin pnpm via Corepack for reproducibility
  ```bash
  pnpm run setup:corepack
  ```

## Getting Started
```bash
pnpm install
pnpm build
pnpm test
```

### Developing the CLI (@civ7/cli)
- Local dev (Bun):
  ```bash
  pnpm -F @civ7/cli dev
  ```
- Global link (Node):
  ```bash
  pnpm -F @civ7/cli run build
  pnpm -F @civ7/cli link --global
  civ7 --help
  ```
These are independent; local dev runs source via Bun; global link runs installed binary.

### Workspace apps/packages
- Docs (Docsify, Bun-first):
  ```bash
  pnpm -F @civ7/docs run dev
  pnpm -F @civ7/docs run fix:links
  ```
- CLI (@civ7/cli):
  ```bash
  pnpm -F @civ7/cli run build
  node packages/cli/bin/run.js --help
  ```
- SDK (@civ7/sdk):
  ```bash
  pnpm -F @civ7/sdk run build
  ```
- Playground (Bun):
  ```bash
  pnpm -F @civ7/playground run dev
  ```

### Root convenience scripts
- Dev per package:
  ```bash
  pnpm dev:cli
  pnpm dev:sdk
  pnpm dev:docs
  pnpm dev:playground
  ```
- Run CLI from root (Bun):
  ```bash
  pnpm cli -- <civ7-command-and-args>
  # example
  pnpm cli unzip default
  ```

## Outputs policy
- No outputs at repo root.
- Defaults and configuration live in `civ.config.jsonc`. All CLI commands write to a central `.civ7/outputs` directory by default.
- Apps like `docs` are responsible for pulling the resources they need from `.civ7/outputs` as part of their build/dev process. They should not be written to directly by the CLI.
- Defaults:
  - Base outputs: `.civ7/outputs`
  - Zip archives: `.civ7/outputs/archives`
  - Unzip directory: `.civ7/outputs/resources` (**git submodule**)
  - Graph exports: `.civ7/outputs/graph/<seed>`
- The unzip directory is a git submodule that publishes snapshots to `mateicanavra/civ7-official-resources`.
  - One-time setup: `pnpm setup:git-hooks`
  - Init on a fresh clone: `pnpm resources:init` (or `git submodule update --init --recursive`)
  - `civ7 data unzip` writes into the submodule working tree; diffs show up in the submodule and are auto-committed/pushed on monorepo commit (via `scripts/git-hooks/pre-commit`).
- Docs: served directly from `apps/docs/site` (no build/dist by default)
- SDK: emits to `packages/sdk/dist`
- Playground: generated content remains under its app directory

## Publish readiness (Phase 9)
- SDK: `pnpm -F @civ7/sdk pack` (validation only; do not commit `.tgz`)
- CLI: `pnpm -F @civ7/cli run build && pnpm -F @civ7/cli link --global && civ7 --help`

### Publishing via tags (CI)
Prerequisite: In GitHub → Settings → Secrets and variables → Actions, add secret `NPM_TOKEN` (npm automation token with publish permission).

From the repo root, create and push one of the following tags:

```bash
# Publish both SDK and CLI
git tag vX.Y.Z && git push origin vX.Y.Z

# Publish only SDK
git tag sdk-vX.Y.Z && git push origin sdk-vX.Y.Z

# Publish only CLI
git tag cli-vX.Y.Z && git push origin cli-vX.Y.Z
```

The `Publish Packages` workflow will build, lint, test, typecheck, then publish the targeted package(s). If `NPM_TOKEN` is missing, the publish steps are skipped.

### Local publish (optional)
From repo root:
```bash
pnpm publish:sdk   # publish SDK
pnpm publish:cli   # publish CLI
pnpm publish:all   # SDK then CLI
```

## Coding style
- 2-space indentation (see `.editorconfig`)
- ESLint flat config at root (`eslint.config.js`)
- Prefer small, focused PRs

## Commit
```bash
git checkout -b feat/your-change
# make changes
pnpm test
git commit
```

### Commit message conventions

Use Conventional Commits with an optional ticket prefix when a trackable ID exists (Linear or other):

```text
[LIN-123] feat(cli): add unzip progress output

Add a per-archive progress indicator and per-file counts so long extractions
are easier to monitor.

Notes:
- Default output stays stable for scripts; progress is opt-in via `--progress`.

References:
- Project: @civ7/cli
- Linear: LIN-123
- Docs: docs/system/sdk/overview.md
```

Rules:
- **Title:** `[TICKET] type(scope): summary` (ticket prefix optional if no ID).
- **Scope:** internal area of concern (package/app/subsystem), not the repo/project name.
- **Body:** explain intent + user-visible behavior and any operational/testing notes.
- **Footer references:** include the project/package being worked on and the ticket ID from the title (plus any other durable references).
