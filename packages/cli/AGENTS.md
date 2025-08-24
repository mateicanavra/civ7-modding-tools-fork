### Civ7 CLI — Agents Guide

This document orients AI agents and contributors to the `@civ7-modding/cli` package. It summarizes intent, capabilities, code structure, setup, and usage patterns so agents can work productively without deep project ramp‑up.

### What this CLI does

- **Core purpose**: Explore and operate on Civilization‑style XML resources.
  - Build an index over XML, then breadth‑first crawl from a seed (e.g., `LEADER_*`, `TRAIT_*`, or `Table:ID`).
  - Produce a dependency graph in JSON and DOT, plus a file `manifest.txt` for slicing.
  - Render DOT to SVG via WebAssembly Graphviz and optionally emit an interactive HTML viewer.
  - Zip/unzip resource archives based on profiles defined in `civ.config.jsonc`.
  - Core crawl/render logic lives in `@civ7/plugin-graph` (`crawlGraph`, `exploreGraph`); file archiving lives in `@civ7/plugin-files`. The CLI focuses on argument parsing, configuration, and I/O, passing its logger to plugin workflows for progress messages.

### Tech stack

- **Runtime**: Node.js >= 18
- **CLI framework**: `@oclif/core`
- **Language**: TypeScript (strict), `tsc` build to CommonJS
- **Graph rendering**: `@hpcc-js/wasm` (Graphviz compiled to WebAssembly)
- **Graph logic & XML parsing**: `@civ7/plugin-graph` (uses `fast-xml-parser` internally)
- **Configuration**: `@civ7/config` (JSONC via `jsonc-parser`)
 - **Bundled plugins**: `@oclif/plugin-help`

### Commands (high level)

- **data crawl**: Crawl Civ XML resources and output graph + manifest.
  - Args: `seed` (required), `outDir` (optional)
  - Flags: `--config`, `--profile`, `--root`
  - Example: `civ7 data crawl LEADER_AMANITORE`

- **data explore**: One‑shot pipeline: crawl → render → open viewer.
  - Args: `seed` (required), `outDir` (optional)
  - Flags: `--config`, `--profile`, `--root`, `--engine`, `--open`, `--openOnline`, `--viz.html`/`--vizHtml`, `--serve`, `--port`, `--maxUrlLength`
  - Example: `civ7 data explore CIVILIZATION_ROME --serve`

- **data render**: Render a DOT file to SVG (no external Graphviz needed).
  - Args: `input` (DOT path or a seed), `output` (optional)
  - Flags: `--engine`, `--format=svg`, `--config`, `--profile`
  - Example: `civ7 data render ./out/rome/graph.dot ./out/rome/graph.svg`

- **data slice**: Copy files listed in a `manifest.txt` into a destination folder, preserving paths.
  - Args: `manifest`
  - Flags: `--config`, `--profile`, `--root`, `--dest`
  - Example: `civ7 data slice ./out/rome/manifest.txt --dest ./out/rome-slice`

- **data zip**: Create a zip archive of game resources based on a profile.
  - Args: `profile` (default `default`), `zipfile` (optional)
  - Flags: `--config`, `-v/--verbose`
  - Example: `civ7 data zip default ./resources.zip`

- **data unzip**: Extract a resource archive based on a profile.
  - Args: `profile` (default `default`), `zipfile` (optional), `extractpath` (optional)
  - Flags: `--config`
  - Example: `civ7 data unzip default ./resources.zip ./resources`

Tip: All commands support `--help` via oclif.
Status-style commands (e.g., `git status`, `mod status`) also accept `--json` for machine-readable output.

### Outputs

- `out/<seed>/graph.json` — graph model (nodes/edges) consumable by tools
- `out/<seed>/graph.dot` — Graphviz DOT representation with labels/tooltips/links
- `out/<seed>/graph.svg` — rendered SVG (via `render` or `explore`)
- `out/<seed>/graph.html` — local interactive viewer (if enabled)
- `out/<seed>/manifest.txt` — absolute file paths derived from node provenance

### Configuration

- The CLI can infer or override resource locations via `civ.config.jsonc` (JSON with comments).
- Common fields by convention (profiles under top‑level keys such as `default`):

```jsonc
{
  "inputs": {
    "installDir": "/absolute/path/to/resources"
  },
  "outputs": {
    "unzip": { "dir": "resources" }, // used as XML root if not overridden
    "zip": { "dir": "archives", "name": "civ7-resources.zip" }
  }
}
```

- The CLI discovers the workspace root using `pnpm-workspace.yaml` and resolves defaults like `out/<seed>` accordingly.
- You can always bypass config with explicit flags: `--root` for XML root, `--dest` for slice destination, etc.

### Development setup

- Prereqs: Node 18+, pnpm, optional Bun for `dev` script.
- Install from repo root: `pnpm i`
- Build this package:
  - `pnpm --filter @civ7-modding/cli run build`
  - Generates `dist/` and refreshes `oclif.manifest.json`.
- Local linking (optional): `pnpm --filter @civ7-modding/cli run publish:local` to expose the `civ7` binary.
- Dev run:
  - Via bin: `node packages/cli/bin/run.js <command>`
  - Via scripts: `pnpm --filter @civ7-modding/cli run data:crawl -- --help`

### Code structure (key paths)

 - `src/base/` & `src/subtree/` — abstract oclif commands for git subtree flows (configure, import, push, pull, setup). Domain commands extend these to supply prefixes and defaults.
 - `src/commands/` — oclif commands grouped by topic: `data/` (crawl, explore, render, slice, zip, unzip), `docs/`, `git/subtree/` for git subtree helpers, and `mod/` (`link/` for subtree operations with flat `config-*` commands and `manage/` for local utilities)
- `src/utils/` — config/path resolution helpers; generic git helpers (configureRemote, importSubtree, pushSubtree, pullSubtree, logRemotePushConfig, findRemoteNameForSlug/requireRemoteNameForSlug, resolveBranch/requireBranch, isNonEmptyDir) live in `utils/git.ts` and centralize logging, argument defaults, and remote/branch inference for git operations
- Subtree command classes expose only the flags they consume; `remoteUrl` is required only for `config`, `import`, and `setup` flows, while `push`/`pull` rely on saved config.
- Config management commands (`config list`, `config clear`, `config remove`) operate on stored git config and accept `--deleteLocal` to also remove imported directories.
- `repoUrl`, remote name, and default `branch` are stored during setup and always resolved from saved config; downstream commands no longer derive remote names at runtime.
- Use `@civ7/plugin-graph` for graph workflows (`crawlGraph`, `exploreGraph`); archive helpers are in `@civ7/plugin-files`.

### Conceptual model and traversal

- The CLI reads XML and normalizes gameplay structures into logical tables, e.g.:
  - `Modifiers`, `ModifierArguments`, `RequirementSets`, `RequirementSetRequirements`, `Requirements`, `RequirementArguments`.
- **BFS crawl** from a parsed seed adds nodes/edges while pruning non‑existent targets; each node records its source file (`__file`).
- Edges include labeled relationships (e.g., `LeaderTraits`, `TraitModifiers`, `Attach`, `Argument`, `SubjectRequirementSetId`).
- Deterministic processing: respects delete semantics, uses lexicographic file order, and prunes dangling links.

### Viewer and rendering

- DOT → SVG is rendered with `@hpcc-js/wasm` (no native Graphviz dependency).
- The HTML viewer embeds SVG and adds:
  - Mouse wheel zoom anchored to cursor, drag‑to‑pan, double‑click to fit
  - Keyboard panning (WASD/Arrows) with acceleration; `+`/`-` zoom; `0` reset
- Explore pipeline options:
  - `--viz.html`/`--vizHtml`: emit `graph.html`
  - `--serve` and optional `--port`: serve and open locally
  - `--openOnline`: open Graphviz Online with DOT in URL (guarded by `--maxUrlLength`)

### Error handling and UX

- Commands validate required args; missing `--root` or invalid paths fail with clear messages.
- Seed parsing failures early‑exit with actionable errors.
- Explore avoids opening browsers in CI or when stdout is not a TTY.

### Performance notes

- Crawler is in‑memory and breadth‑first; pruning strategies suppress self‑loops and non‑existent targets.
- Large graphs render via WASM; HTML viewer avoids external network calls.

### Testing

- A minimal [Vitest](https://vitest.dev/) suite lives in `test/` (`test/commands` for CLI surfaces, `test/utils` for helpers). Run `pnpm --filter @civ7/cli test`.
- Recommended strategy for expanding coverage:
  - Unit‑test seed parsing, index construction, and expander rules.
  - Snapshot DOT/JSON for a small sample seed.
  - CLI smoke tests via `bin/run.js` with fixtures.
  - Integration tests ensure `crawl` and `explore` commands call `@civ7/plugin-graph` workflows.

### CI/CD and publishing

- Scripts:
  - `build`: clean, type‑check/build, regenerate oclif manifest, ensure `bin/run.js` is executable
  - `prepack`: build + generate README via oclif
  - `publish:local`: build and link globally for local dev
  - `pack` / `publish`: package/publish with pnpm

### Extending the crawler

- To add new relationships:
1. Update or add expander functions in `@civ7/plugin-graph/src/crawler/expanders.ts`.
2. Adjust types in `@civ7/plugin-graph/src/types.ts` if new node/edge metadata is needed.
3. Optionally update `graphToDot` in `@civ7/plugin-graph/src/graph.ts` to style new tables/edges.

### Adding a new command

1. Create `src/commands/<name>.ts` and extend `@oclif/core` `Command`.
2. Define `static id`, `summary`, `description`, `flags`, `args`, and `examples`.
3. Import shared helpers from `src/utils/cli-helpers.ts` if you need workspace/config resolution.
4. Build to generate `dist` and refresh `oclif.manifest.json`.

### Troubleshooting

- “Could not determine XML root directory”: provide `--root` or define `outputs.unzip.dir` in `civ.config.jsonc`.
- DOT too large for `--openOnline`: increase `--maxUrlLength` or use local HTML viewer.
- Nothing renders: verify seed exists in indexed XML (`crawl` should log output folder with generated files).

### References

- Commands: see `src/commands/*`
- Crawler: see `@civ7/plugin-graph/src/crawler/*`
- Graph utilities: see `@civ7/plugin-graph/src/graph.ts` and `viewer.ts`
- Manifest: `oclif.manifest.json` (generated)

Maintainers keep a feature tracker in `FEATURES.md` for roadmap and implemented items.


