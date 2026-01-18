# Civ7 Official Resources (Submodule Workflow)

This repo treats `.civ7/outputs/resources` as a git submodule pointing at the public snapshot repo:

- `https://github.com/mateicanavra/civ7-official-resources`

The intended flow is:

- `civ7 data unzip` writes into `.civ7/outputs/resources`
- Those changes are committed and pushed to the public resources repo
- The monorepo commits the updated submodule pointer

## One-time setup (per clone)

1. Initialize the submodule:
   - `pnpm resources:init`
   - Or: `git submodule update --init --recursive`

2. Enable auto-publish hooks:
   - `pnpm setup:git-hooks`

## Daily usage

- Refresh game data (zip then unzip):
  - `pnpm refresh:data`
- Check whether the resources submodule is clean:
  - `pnpm resources:status`
- Inspect diffs inside the resources repo:
  - `git -C .civ7/outputs/resources status`
  - `git -C .civ7/outputs/resources diff`

## Auto-publish behavior (source of truth = local)

When `core.hooksPath` is configured via `pnpm setup:git-hooks`, every monorepo commit runs:

- `scripts/civ7-resources/publish-submodule.sh`

If `.civ7/outputs/resources` is dirty, it will:

1. Commit changes directly to `main` in the resources repo
2. Push `main` to `origin` (`mateicanavra/civ7-official-resources`)
3. Stage the updated submodule pointer in the monorepo (so the subsequent monorepo commit records it)

## Cloning and updating

- Clone including submodules:
  - `git clone --recurse-submodules <repo-url>`
- After pulling monorepo changes, update the checked-out submodule commit:
  - `pnpm resources:init`
  - Or: `git submodule update --init --recursive`

## Temporarily disabling auto-publish (escape hatch)

- Disable hook routing:
  - `git config --unset core.hooksPath`

Re-enable with:

- `pnpm setup:git-hooks`

## Notes / risks

- Publishing extracted game resources publicly may be subject to licensing/ToS constraints; verify before distributing.
- Large updates can generate large commits in the resources repo; this is expected for snapshot-style publishing.
