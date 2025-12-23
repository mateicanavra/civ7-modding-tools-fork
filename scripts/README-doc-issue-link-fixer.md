# Doc Issue Link Fixer

Small, deterministic fixer for docs under a project (default: `docs/projects/engine-refactor-v1`).

What it does:
- Builds an issue ID -> filename index from frontmatter in `docs/projects/<project>/issues/*.md`.
- Rewrites markdown links (and `doc:` entries) that reference `CIV-###` to the canonical relative file path.
- Normalizes dependency lists by mirroring `blocked` from `blocked_by` (or vice versa).

## Usage

Dry-run (default):
```sh
node scripts/fix-doc-issue-links.mjs
```

Apply changes:
```sh
node scripts/fix-doc-issue-links.mjs --write
```

Different project root:
```sh
node scripts/fix-doc-issue-links.mjs --project docs/projects/engine-refactor-v1 --write
```

## Options

- `--write` apply edits (otherwise dry-run).
- `--project <path>` project root (default: `docs/projects/engine-refactor-v1`).
- `--ssot blocked_by|blocked` choose dependency source of truth (default: `blocked_by`).
- `--no-fix-links` skip link/doc path updates.
- `--no-normalize-blocked` skip dependency normalization.
- `--verbose` emit extra output (changed file list + warnings).
