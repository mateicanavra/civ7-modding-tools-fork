# Contributing to Civ7 Modding Tools

This repository is a Bun + Turborepo monorepo.

## Prerequisites
- Node 22.12+ (see `.nvmrc`)
- Bun (see `.bun-version`)

## Getting Started
```bash
bun install --frozen-lockfile
bun run build
bun run test
```

### Developing the CLI (@mateicanavra/civ7-cli)
- Local dev:
  ```bash
  bun run dev:cli
  ```
- Global link (optional):
  ```bash
  bun run link:cli
  civ7 --help
  ```

### Workspace apps/packages
- Docs:
  ```bash
  bun run dev:docs
  bun run --filter @civ7/docs fix:mdx-links
  ```
- CLI:
  ```bash
  bun run --filter @mateicanavra/civ7-cli build
  node packages/cli/bin/run.js --help
  ```
- SDK:
  ```bash
  bun run --filter @mateicanavra/civ7-sdk build
  ```
- Playground:
  ```bash
  bun run dev:playground
  ```

### Root convenience scripts
- Dev per package:
  ```bash
  bun run dev:cli
  bun run dev:sdk
  bun run dev:docs
  bun run dev:playground
  ```
- Run CLI from root:
  ```bash
  bun run dev:cli -- <civ7-command-and-args>
  # example
  bun run dev:cli -- data unzip default
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
  - One-time setup: `bun run setup:git-hooks`
  - Init on a fresh clone: `bun run resources:init` (or `git submodule update --init --recursive`)
  - `civ7 data unzip` writes into the submodule working tree; diffs show up in the submodule and are auto-committed/pushed on monorepo commit (via `scripts/git-hooks/pre-commit`).
- Docs: served directly from `apps/docs/site` (no build/dist by default)
- SDK: emits to `packages/sdk/dist`
- Playground: generated content remains under its app directory

## Publish readiness (Phase 9)
- SDK: `bun pm pack --cwd packages/sdk` (validation only; do not commit `.tgz`)
- CLI: `bun run link:cli && civ7 --help`

### Publishing via tags (CI)
Prerequisite: In GitHub → Settings → Secrets and variables → Actions, add secrets `NPM_TOKEN_SDK` and `NPM_TOKEN_CLI` (publish tokens for GitHub Packages).

From the repo root, create and push one of the following tags:

```bash
# Publish both SDK and CLI
git tag vX.Y.Z && git push origin vX.Y.Z

# Publish only SDK
git tag sdk-vX.Y.Z && git push origin sdk-vX.Y.Z

# Publish only CLI
git tag cli-vX.Y.Z && git push origin cli-vX.Y.Z
```

The publish workflow will build, lint, test, typecheck, then publish the targeted package(s).

### Local publish (optional)
From repo root:
```bash
bun run publish:sdk   # publish SDK
bun run publish:cli   # publish CLI
bun run publish:all   # SDK then CLI
```

## Coding style
- 2-space indentation (see `.editorconfig`)
- ESLint flat config at root (`eslint.config.js`)
- Prefer small, focused PRs

## Commit
```bash
git checkout -b feat/your-change
# make changes
bun run test
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
