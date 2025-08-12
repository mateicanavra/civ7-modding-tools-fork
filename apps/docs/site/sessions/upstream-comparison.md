# Upstream Comparison

Compared the fork against the latest [izica/civ7-modding-tools](https://github.com/izica/civ7-modding-tools).

## Repository structure
- This fork adds `AGENTS.md`, a `docs/` tree of community guides, and session notes.
- Includes `scripts/zip-civ-resources.sh`, `scripts/unzip-civ-resources.sh`, and `scripts/civ-zip-config.json` for archiving official resources.
- Ships `civ7-official-resources/` as a workspace for extracted game data.

## Functional differences
- Resource scripts support selective extraction (default/full/assets) not present upstream.
- Additional builders and constants appear in `dist/` (e.g., `AbilityBuilder`, `UnlockBuilder`, `RESOURCE_CLASS`).
- Workspace uses `pnpm` instead of `npm`.

## Intent
- Upstream: a mod generation library.
- Fork: a broader SDK with embedded docs and tooling for exploring the official Civ7 resources.
