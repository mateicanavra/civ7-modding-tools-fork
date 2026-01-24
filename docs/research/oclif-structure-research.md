# OCLIF Structure Research: Plugins vs Packages Analysis

## Executive Summary

**Your intuition is correct.** The current `@civ7/plugin-*` packages are **not OCLIF plugins** — they are standard npm packages (pure logic libraries) that are misleadingly named. The only actual OCLIF plugin in use is `@oclif/plugin-help`.

---

## Part 1: OCLIF Terminology Clarified

### What Is an OCLIF Plugin?

An OCLIF plugin is a **specific architectural construct** with these defining characteristics:

| Characteristic | Required? | Description |
|---------------|-----------|-------------|
| `oclif` config in package.json | **Yes** | Must have `"oclif": { "commands": "..." }` |
| Exports commands | **Yes** | Must provide command classes extending `Command` |
| Registered in CLI's plugins array | **Yes** | Listed in `oclif.plugins` of parent CLI |
| Discoverable by OCLIF loader | **Yes** | OCLIF's plugin loader must find and load it |
| Can have hooks | Optional | Can tap into CLI lifecycle |
| Can be user-installable at runtime | Optional | Via `@oclif/plugin-plugins` |

### What Is a Package (Library)?

A regular npm package/library:
- Exports functions, classes, utilities
- Imported via standard `import { foo } from 'package'`
- **No OCLIF config**
- **No commands or hooks**
- Framework-agnostic (works with any CLI, not just OCLIF)

### The Critical Difference

```
┌──────────────────────────────────────────────────────────────────┐
│                     OCLIF Plugin                                 │
│  package.json:                                                   │
│    "oclif": {                                                    │
│      "commands": "./dist/commands",    ← Has commands            │
│      "hooks": { ... }                  ← May have hooks          │
│    }                                                             │
│  Exports: Command classes                                        │
│  Usage: Registered in CLI's oclif.plugins array                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     Regular Package                              │
│  package.json:                                                   │
│    (no oclif config)                                             │
│  Exports: Functions, utilities, types                            │
│  Usage: import { fn } from 'package'                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Your Current Codebase Analysis

### Current Structure

```
packages/
├── cli/                          ← OCLIF CLI (the actual CLI)
│   └── package.json
│       └── oclif.plugins: ["@oclif/plugin-help"]  ← Only plugin!
│
├── plugins/                      ← Misnamed directory
│   ├── plugin-files/             ← NOT a plugin (no oclif config)
│   ├── plugin-git/               ← NOT a plugin (no oclif config)
│   ├── plugin-graph/             ← NOT a plugin (no oclif config)
│   └── plugin-mods/              ← NOT a plugin (no oclif config)
│
├── sdk/                          ← Regular package
├── config/                       ← Regular package
└── ...
```

### Evidence: Your "Plugins" Are Not OCLIF Plugins

**1. No OCLIF Configuration**

Looking at `@civ7/plugin-files/package.json`:
```json
{
  "name": "@civ7/plugin-files",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js"
  // Notice: NO "oclif" key at all
}
```

Compare to `@oclif/plugin-help` (a real plugin):
```json
{
  "name": "@oclif/plugin-help",
  "oclif": {
    "commands": "./dist/commands",
    "default": "."
  }
}
```

**2. Not Registered as Plugins**

Your CLI's `package.json`:
```json
"oclif": {
  "plugins": [
    "@oclif/plugin-help"    // ← Only this is a plugin
  ]
}
```

Notice `@civ7/plugin-files` is NOT in the plugins array — it's in `dependencies` and imported directly.

**3. Used as Regular Imports**

Your commands import them as standard libraries:
```typescript
// packages/cli/src/commands/data/zip.ts
import { zipResources } from "@civ7/plugin-files";  // ← Regular import

export default class Zip extends Command {
  async run() {
    const summary = await zipResources(options);  // ← Function call
  }
}
```

This is **not** how OCLIF plugins work. Real plugins contribute commands that OCLIF auto-discovers.

---

## Part 3: Answering Your Questions

### Q1: Are we even using plugins right now?

**No.** You are using **zero custom OCLIF plugins**.

The only OCLIF plugin is `@oclif/plugin-help` (official help command). Your `@civ7/plugin-*` packages are regular TypeScript libraries being imported as dependencies — they just have a misleading name.

### Q2: Do we even need plugins for our use case?

**Probably not.** Here's the decision framework:

#### When OCLIF Plugins Make Sense

| Use Case | Plugin Appropriate? |
|----------|---------------------|
| Users need to install/uninstall features at runtime | Yes |
| Enterprise teams need different command sets | Yes |
| Community-contributed extensions | Yes |
| Optional features users can choose | Yes |
| Very large CLI (50+ commands) needing code splitting | Maybe |
| Internal code organization | **No** |
| Sharing logic between commands | **No** |
| Reusable utilities | **No** |

#### Heuristics for Plugin Decision

1. **"Can a user operate without this?"** → If yes, consider plugin
2. **"Do different users need different command sets?"** → If yes, consider plugin
3. **"Is this just shared code for our commands?"** → If yes, use package

#### Your Use Case Analysis

Your CLI appears to serve Civ7 modders. Key questions:

| Question | Likely Answer | Implication |
|----------|---------------|-------------|
| Do users need `data zip/unzip` without `mod` commands? | No | Same CLI |
| Do users install features at runtime? | No | No plugin system needed |
| Are there different user personas needing different CLIs? | No | Single CLI sufficient |
| Is this for internal organization? | Yes | Packages are the right choice |

**Verdict:** You don't need OCLIF plugins. Standard packages are the correct pattern for your use case.

### Q3: Should any of these be consolidated?

Here's my assessment of each current "plugin":

| Package | Purpose | Recommendation |
|---------|---------|----------------|
| `plugin-files` | Zip/unzip utilities | Keep, rename to `@civ7/files` |
| `plugin-git` | Git operations | Keep, rename to `@civ7/git` |
| `plugin-graph` | XML graph analysis | Keep, rename to `@civ7/graph` |
| `plugin-mods` | Mod management | Keep, rename to `@civ7/mods` |
| `config` | Configuration loading | Keep as-is |

**Consolidation Considerations:**

- `plugin-mods` depends on both `plugin-files` and `plugin-git` — could merge them into a single `@civ7/core` package, but keeping them separate is also fine for clarity
- The current separation is logical and reflects domain boundaries
- Don't consolidate just to reduce package count — the overhead is minimal in a monorepo

---

## Part 4: Recommended Restructure

### Option A: Minimal Rename (Recommended)

Just rename to remove the misleading "plugin-" prefix:

```
packages/
├── cli/                     ← Keep as-is (the OCLIF CLI)
├── libs/                    ← Rename from "plugins/"
│   ├── files/               ← Rename from "plugin-files"
│   ├── git/                 ← Rename from "plugin-git"
│   ├── graph/               ← Rename from "plugin-graph"
│   └── mods/                ← Rename from "plugin-mods"
├── sdk/                     ← Keep as-is
├── config/                  ← Keep as-is
└── ...
```

Package names:
- `@civ7/plugin-files` → `@civ7/files`
- `@civ7/plugin-git` → `@civ7/git`
- `@civ7/plugin-graph` → `@civ7/graph`
- `@civ7/plugin-mods` → `@civ7/mods`

### Option B: Category-Based Organization

Group by purpose:

```
packages/
├── cli/                     ← OCLIF CLI application
├── core/                    ← Core libraries
│   ├── config/              ← Configuration
│   ├── files/               ← File operations
│   ├── git/                 ← Git utilities
│   └── types/               ← TypeScript types
├── features/                ← Feature-specific libraries
│   ├── graph/               ← XML graph analysis
│   └── mods/                ← Mod management
├── sdk/                     ← Public SDK for mod developers
└── adapters/                ← External integrations
    └── civ7-adapter/        ← Civ7 engine adapter
```

### Option C: If You Actually Wanted Plugins (Not Recommended)

If you did want to make these true OCLIF plugins (for user-installable optional features):

```
packages/
├── cli/                     ← Core CLI (minimal commands)
│   └── package.json
│       └── oclif.plugins: [
│             "@oclif/plugin-help",
│             "@civ7/plugin-data",    ← User can uninstall
│             "@civ7/plugin-mods"     ← User can uninstall
│           ]
├── plugin-data/             ← Real OCLIF plugin
│   ├── src/commands/        ← Has commands
│   │   ├── zip.ts
│   │   ├── unzip.ts
│   │   └── crawl.ts
│   └── package.json
│       └── oclif: { commands: "./dist/commands" }
├── plugin-mods/             ← Real OCLIF plugin
│   ├── src/commands/
│   │   ├── list.ts
│   │   └── deploy.ts
│   └── package.json
│       └── oclif: { commands: "./dist/commands" }
└── libs/                    ← Pure logic (no commands)
    ├── files/
    ├── git/
    └── graph/
```

**This is overkill for your use case** — but shown for completeness.

---

## Part 5: Summary of Findings

### Your Intuition Was Correct

| Your Statement | Assessment |
|----------------|------------|
| "Pure logic libraries belong as packages, not plugins" | **Correct** |
| "Plugins are optional wrappers around pure logic" | **Correct** |
| "Plugins make CLI composable for users to install what they need" | **Correct** |

### Current State

- You have **0 custom OCLIF plugins**
- You have **4 regular packages** misnamed as "plugins"
- The architecture is actually correct — only the naming is wrong

### Recommended Actions

1. **Rename** `packages/plugins/` to `packages/libs/` (or just move to `packages/`)
2. **Rename packages** from `@civ7/plugin-*` to `@civ7/*`
3. **Update imports** across the codebase
4. **Don't add actual OCLIF plugins** unless you need user-installable optional features

---

## Appendix: OCLIF Plugin Architecture (For Reference)

### How Real OCLIF Plugins Work

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Startup                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  OCLIF Core reads package.json oclif.plugins array          │
│  plugins: ["@oclif/plugin-help", "@custom/plugin-foo"]      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  For each plugin, OCLIF:                                    │
│  1. Loads the plugin's package.json                         │
│  2. Reads its oclif.commands path                           │
│  3. Auto-discovers all Command classes                      │
│  4. Registers them in the command tree                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  User runs: mycli some-command                              │
│  OCLIF looks up command from all registered plugins         │
└─────────────────────────────────────────────────────────────┘
```

### Plugin Override Hierarchy

```
Priority (highest to lowest):
1. Linked plugins (development)     ← plugins:link
2. User-installed plugins           ← plugins:install
3. Core plugins (in oclif.plugins)  ← Bundled with CLI
```

---

## Part 6: Full Package Organization & Versioning Analysis

### Current Package Inventory

```
packages/
├── civ7-adapter/      @civ7/adapter           (publishable)
├── civ7-types/        @civ7/types             (publishable)
├── cli/               @mateicanavra/civ7-cli  (published)
├── config/            @civ7/config            (private)
├── mapgen-core/       @swooper/mapgen-core    (publishable)
├── sdk/               @mateicanavra/civ7-sdk  (published)
└── plugins/
    ├── plugin-files/  @civ7/plugin-files      (private)
    ├── plugin-git/    @civ7/plugin-git        (private)
    ├── plugin-graph/  @civ7/plugin-graph      (private)
    └── plugin-mods/   @civ7/plugin-mods       (private)
```

### Game-Version Coupling Analysis

**Critical insight:** Some packages are **tied to the Civ7 game version** and must be updated when the game updates. Others are **version-independent utilities**.

#### Game-Version Dependent (Must Update Together)

| Package | Why It's Version-Dependent |
|---------|---------------------------|
| `@civ7/adapter` | Imports directly from `/base-standard/...` game engine paths |
| `@civ7/types` | TypeScript definitions for game runtime types |
| `@mateicanavra/civ7-sdk` | Hardcoded game constants (UNIT, ABILITY, TERRAIN, etc.) |

These three packages are **implicitly coupled** — when the game updates:
1. Resources are re-extracted (from game files)
2. Types must be regenerated/updated
3. Adapter imports may change
4. SDK constants may need updates

#### Game-Version Independent (Utilities)

| Package | Why It's Independent |
|---------|---------------------|
| `@civ7/config` | Generic JSONC config loader |
| `@civ7/plugin-files` | Generic zip/unzip, file copy |
| `@civ7/plugin-git` | Generic git operations |
| `@civ7/plugin-graph` | XML parsing algorithms (content-agnostic) |
| `@civ7/plugin-mods` | Mod orchestration logic |
| `@mateicanavra/civ7-cli` | Command orchestrator |
| `@swooper/mapgen-core` | Map algorithms (uses adapter, but algorithms are stable) |

### Should Types + Adapter Be Merged?

**Analysis:**

| Factor | Merge? | Reasoning |
|--------|--------|-----------|
| Versioning | **Yes** | Always update together when game updates |
| Dependencies | **Yes** | Adapter depends on types; no consumer needs types without adapter |
| Separation of concerns | No | Types are declarations, adapter has runtime code |
| Consumer patterns | **Yes** | Nobody imports types alone in practice |

**Recommendation: Merge `@civ7/types` into `@civ7/adapter`**

The adapter becomes the single "game engine interface" package:
- Exports types (re-exported from internal types)
- Exports adapter functions
- Single version tied to game version

```typescript
// Before (two packages)
import type { EngineAdapter } from "@civ7/types";
import { createCiv7Adapter } from "@civ7/adapter";

// After (merged)
import { createCiv7Adapter, type EngineAdapter } from "@civ7/engine";
```

### Should We Nest Under `packages/civ7/`?

**Arguments For Nesting:**
- Groups related packages visually
- Makes domain boundaries clear
- Matches the `@civ7/` scope in package names

**Arguments Against:**
- Adds directory depth without functional benefit
- pnpm workspaces work fine with flat structure
- More typing in paths

**Verdict:** Optional. If you value visual organization, do it. If not, flat is fine.

### Recommended Final Structure

#### Option A: Flat with Logical Grouping (Minimal Change)

```
packages/
├── cli/                        @mateicanavra/civ7-cli
├── sdk/                        @mateicanavra/civ7-sdk
├── engine/                     @civ7/engine  ← MERGED (adapter + types)
├── mapgen-core/                @swooper/mapgen-core
├── config/                     @civ7/config
└── libs/                       ← Renamed from plugins/
    ├── files/                  @civ7/files
    ├── git/                    @civ7/git
    ├── graph/                  @civ7/graph
    └── mods/                   @civ7/mods
```

#### Option B: Domain-Nested (More Organization)

```
packages/
├── civ7/                       ← All @civ7/* packages
│   ├── engine/                 @civ7/engine (merged adapter+types)
│   ├── config/                 @civ7/config
│   ├── files/                  @civ7/files
│   ├── git/                    @civ7/git
│   ├── graph/                  @civ7/graph
│   └── mods/                   @civ7/mods
├── cli/                        @mateicanavra/civ7-cli
├── sdk/                        @mateicanavra/civ7-sdk
└── mapgen-core/                @swooper/mapgen-core
```

#### Option C: Versioning-Aligned (Explicit Coupling)

Group by versioning strategy:

```
packages/
├── game-tied/                  ← Must version with game updates
│   ├── engine/                 @civ7/engine (adapter+types)
│   └── sdk/                    @mateicanavra/civ7-sdk (has game constants)
├── stable/                     ← Version independently
│   ├── cli/                    @mateicanavra/civ7-cli
│   ├── config/                 @civ7/config
│   ├── files/                  @civ7/files
│   ├── git/                    @civ7/git
│   ├── graph/                  @civ7/graph
│   └── mods/                   @civ7/mods
└── external/                   ← Different maintainer/scope
    └── mapgen-core/            @swooper/mapgen-core
```

### Package Consolidation Summary

| Current | Recommendation | Rationale |
|---------|---------------|-----------|
| `@civ7/adapter` + `@civ7/types` | **Merge → `@civ7/engine`** | Always versioned together, tight coupling |
| `@civ7/plugin-files` | **Rename → `@civ7/files`** | Not a plugin |
| `@civ7/plugin-git` | **Rename → `@civ7/git`** | Not a plugin |
| `@civ7/plugin-graph` | **Rename → `@civ7/graph`** | Not a plugin |
| `@civ7/plugin-mods` | **Rename → `@civ7/mods`** | Not a plugin |
| `@civ7/config` | **Keep as-is** | Already correctly named |
| `@mateicanavra/civ7-cli` | **Keep as-is** | Published, correct scope |
| `@mateicanavra/civ7-sdk` | **Keep as-is** | Published, correct scope |
| `@swooper/mapgen-core` | **Keep as-is** | Different domain/scope |

### Versioning Strategy Recommendation

Since some packages are game-version-tied:

1. **Tag game-tied packages with game version:**
   ```
   @civ7/engine@1.0.0+civ7.1.2.3
   @mateicanavra/civ7-sdk@1.0.0+civ7.1.2.3
   ```

2. **Or use a simpler approach:** Document which game version each release supports in CHANGELOG/README.

3. **Resources submodule is the version anchor:**
   - `.civ7/outputs/resources` submodule points to extracted game files
   - Submodule commit/tag = game version
   - All game-tied packages should note compatibility

### Dependency Graph (Post-Restructure)

```
@mateicanavra/civ7-cli (orchestrator)
├── @civ7/files
├── @civ7/git
├── @civ7/graph
├── @civ7/mods
│   ├── @civ7/files
│   └── @civ7/git
└── @civ7/config

@mateicanavra/civ7-sdk (for mod developers)
└── (no internal deps - standalone)

@civ7/engine (game interface)  ← MERGED
└── (types are internal now)

@swooper/mapgen-core (algorithms)
└── @civ7/engine
```

---

## Sources

- [OCLIF Core GitHub README](https://github.com/oclif/core)
- [OCLIF Plugin-Plugins Documentation](https://github.com/oclif/plugin-plugins)
- [OCLIF Spring 2024 Update](https://oclif.io/blog/2024/03/29/spring-update/)
- [Salesforce OCLIF Architecture Docs](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_architecture_oclif.htm)
