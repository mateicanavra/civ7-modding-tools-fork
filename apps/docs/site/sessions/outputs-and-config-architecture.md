## Outputs and Config Architecture

### Purpose
Define how configuration and output locations work across the monorepo (SDK, CLI, Docs, Playground) and for external users who consume only the CLI and/or SDK. Goals: predictable outputs, zero‑config defaults, no repo‑root pollution, clean separation between library and application responsibilities.

### Distribution Model
- **Published packages**
  - `@civ7/sdk` (library)
  - `@civ7/cli` (application)
- **Internal apps (not published)**
  - `apps/docs` (Docsify site)
  - `apps/playground` (examples, experiments)

### Design Principles (Why)
- **Separation of concerns**: Libraries don’t read global config; executables do. SDK remains pure and explicit; CLI handles discovery and defaults.
- **Predictable outputs**: Default to a contained dot‑directory under the current project—not repo root—so users don’t end up with stray files.
- **Zero‑config UX**: Reasonable defaults; discover `civ.config.jsonc` if present; flags override everything.
- **Portability**: Users can run CLI globally or inside a project; behavior consistent in both cases.
- **Safety**: Never write outside the working project by default; no writes to repository root in monorepo.

### Config Resolution (CLI only)
Precedence (highest → lowest):
1) CLI flags
2) Environment variables
3) Local config file (`civ.config.jsonc` resolved via find‑up starting at `process.cwd()`)
4) Built‑in defaults

SDK does not read global config. All SDK options are explicit parameters.

### Default Output Policy
- Base output directory: `.civ7/` under the caller’s current working directory (CWD)
  - Outputs: `.civ7/outputs/`
  - Temporary files: `.civ7/tmp/`
- Command‑specific defaults under the base:
  - unzip → `.civ7/outputs/resources/`
  - zip → `.civ7/outputs/archives/`
  - graph export → `.civ7/outputs/graph/`
  - (future) reports → `.civ7/outputs/reports/`

These defaults ensure no repo‑root writes and keep artifacts easy to ignore/share.

### Config Schema Additions (civ.config.jsonc)
```
{
  // existing keys …
  "outputDirs": {
    "base": ".civ7/outputs",
    "tmp": ".civ7/tmp",

    // command‑specific overrides (all relative to CWD unless absolute)
    "zip": "archives",
    "unzip": "resources",
    "graph": "graph"
  }
}
```

### CLI Flags and Env Vars
- Global flag: `--output-base <path>` sets the base outputs directory
- Command flags (examples):
  - `zip`: `--out <path>`
  - `unzip`: `--out <path>`
  - `explore graph`: `--out <path>`
- Environment variables (optional):
  - `CIV7_OUTPUT_BASE`
  - Command‑specific, e.g. `CIV7_OUT_ZIP`, `CIV7_OUT_UNZIP`, `CIV7_OUT_GRAPH`

### Implementation Plan (per package)

#### CLI (`@civ7/cli`)
1) Add `OutputResolver` utility
   - Inputs: flags, env, config, defaults
   - Output: resolved absolute paths for `base`, `tmp`, and the command’s `out`
   - Normalize and ensure directories are created as needed
2) Wire into file‑producing commands
   - `zip`: write archives to `out` (default `.civ7/outputs/archives`)
   - `unzip`: write resources to `out` (default `.civ7/outputs/resources`)
   - `explore graph`: export to `out` (default `.civ7/outputs/graph`)
3) Flags
   - Add `--output-base` to the top‑level where feasible (or per command for simplicity)
   - Add `--out` to each file‑producing command
4) Docs and help
   - Update command help and README
5) Git ignores
   - Ensure `.civ7/` is in project `.gitignore` templates and monorepo `.gitignore`

#### SDK (`@civ7/sdk`)
- No global config lookup
- Accept explicit parameters in APIs only (unchanged)
- Build output remains `packages/sdk/dist/` (monorepo internal)

#### Docs (`apps/docs`)
- Build emits to `apps/docs/dist/` (unchanged)
- No cross‑package writes

#### Playground (`apps/playground`)
- Keep generated mod outputs in the app (current: `apps/playground/example-generated-mod/`)
- Option (future): switch to `.civ7/outputs/playground/` for consistency

### Practical Reasons (this repo)
- Keeps root clean while enabling full local workflows
- Doesn’t require a shared config between CLI and SDK
- Works whether users install CLI globally, use it inside another project, or work in this monorepo

### Future: Playground scaffolding via CLI
- New command ideas:
  - `civ7 playground init` → scaffolds a minimal project with:
    - `package.json` with `@civ7/sdk`
    - `civ.config.jsonc` with `outputDirs` prefilled
    - example script(s) under `src/`
    - `.gitignore` including `.civ7/`
  - `civ7 playground run` → executes example build or user scripts
- Rationale: help users focus on content (mods), not wiring; single command to get a ready space

### End‑to‑End User Flow (example)
1) Install CLI globally: `pnpm add -g @civ7/cli`
2) Create a workspace folder and run:
   - `civ7 unzip` → extracts resources to `.civ7/outputs/resources/`
   - `civ7 explore graph --out ./graph` → exports a graph to `./graph` (flag override)
3) Scaffold a playground (future): `civ7 playground init`
   - Generates a project with SDK, config, examples, `.gitignore`
   - Run `pnpm dev` to build a sample mod using SDK
4) Customize outputs with `civ.config.jsonc` or flags as needed

### Compatibility and Safety
- If `civ.config.jsonc` is absent, CLI defaults are used (zero‑config)
- All default outputs live under `.civ7/` to avoid polluting a repo’s root
- SDK remains side‑effect free; no hidden reads/writes

### Acceptance Criteria (for implementation)
- CLI honors flags/env/config/defaults precedence
- No CLI command writes to repo root by default
- `.civ7/` is ignored by default in templates and monorepo
- SDK, docs, and playground outputs remain in their own scopes


