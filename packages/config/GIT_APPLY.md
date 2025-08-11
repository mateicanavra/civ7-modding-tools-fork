 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/AGENTS.md b/AGENTS.md
index 2d217a4906a00f14d27a51bde39f20624fd8efea..99f8ea1a488e75b281f0f4df5c90763265e79fb7 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -1,26 +1,27 @@
 # AGENTS
 
 ## Civ7 Resources Quick Access
 - Run `pnpm run unzip-civ` to extract the official Civ7 data into `civ7-official-resources/`, placing the game files directly under that folder.
 - Age-specific XML definitions live under `civ7-official-resources/Base/modules/age-*/data/`.
   - `resources.xml` – resource modifiers by age
   - `units.xml` – unit definitions
   - `constructibles.xml` – buildings and other constructibles
 - Replace `*` with the desired age (`age-antiquity`, `age-exploration`, `age-modern`, ...).
 - Use `rg` to search across ages, e.g. `rg Cotton civ7-official-resources/Base/modules`.
 - The default `pnpm run unzip-civ` profile excludes large media (movies/, data/icons/, fonts/, common media extensions) but keeps `Assets/schema` for reference. Use `pnpm run unzip-civ -- full` for a full extraction or `pnpm run unzip-civ -- assets` for only assets.
 
 ## Plugins architecture
 - Reusable logic lives under `packages/plugins/*` (e.g., `plugin-files`, `plugin-graph`).
 - CLI commands should remain thin wrappers around these plugins.
 
 ## Contributing
 - When modifying scripts or TypeScript sources, run `pnpm run build` before committing.
 - Run `pnpm lint` to ensure code style and `pnpm test` for unit tests across workspaces.
 - Verify XML examples in docs against `civ7-official-resources` so that `<ActionGroups>` and `<Item>` tags match the SDK output.
+- Configuration utilities and schema are documented in `packages/config/README.md` and `packages/config/TESTING.md`, with unit tests under `packages/config/test`.
 - Use `pnpm test` to execute the Vitest suites across all workspaces and ensure basic smoke tests pass.
 - Use `pnpm test:ui` to open the interactive Vitest UI when visualizing test runs.
 
 ## Task tracking
 - See `TASKS.md` for outstanding follow-up items.
 - Past planning documents are archived under `.ai/archive/plans/`.
diff --git a/README.md b/README.md
index 48cc2e0c8c9ffe065baaeb022f84f2107fb8ffd8..5f89261fb96d4bbdadf261a4169718129793a5af 100644
--- a/README.md
+++ b/README.md
@@ -1,40 +1,41 @@
 # Civ7 Modding Tools and Resources
 
 A comprehensive monorepo workspace for Civilization VII modding, providing tools, documentation, and an SDK for creating mods programmatically.
 
 This repository began from [izica/civ7-modding-tools](https://github.com/izica/civ7-modding-tools) and has since diverged; it is maintained independently and extended with:
 - 📦 **[@civ7/sdk](packages/sdk)** - TypeScript SDK for programmatic mod generation
 - 🛠️ **[@civ7/cli](packages/cli)** - Command-line tools for managing game resources
 - 📚 **[Documentation](apps/docs)** - Comprehensive modding guides and references
 - 🎮 **[Playground](apps/playground)** - Examples and experimentation space
 - 🔌 **[Plugin libraries](packages/plugins)** - Reusable file and graph logic consumed by the CLI
 
 ## Quick Links
 - [Installation](#installation-and-setup)
 - [Using the CLI](#using-the-cli)
 - [SDK Documentation](packages/sdk/README.md)
+- [Configuration Utilities](packages/config/README.md)
 - [Community Guides](apps/docs/site/community/)
 - [Official Modding Docs](apps/docs/site/civ7-official/modding/)
 
 ## Workspace Structure
 
 ```
 civ7-modding-tools/
 ├── packages/
 │   ├── sdk/              # TypeScript SDK for mod generation
 │   ├── cli/              # Command-line tools (oclif)
 │   ├── config/           # Shared config/path resolution (lib + JSON schema)
 │   └── plugins/
 │       ├── plugin-files/ # Programmatic zip/unzip library (consumed by CLI/docs)
 │       └── plugin-graph/ # Graph crawl/render library (consumed by CLI)
 ├── apps/
 │   ├── docs/         # Documentation site (Docsify)
 │   └── playground/   # Example mods and experiments
 └── civ.config.jsonc  # CLI configuration
 ```
 
 ## Installation and Setup
 
 Setting up this project is a two-step process. First, you install the project dependencies and the CLI. Second, you use the newly installed CLI to pull in the game data.
 
 ### Prerequisites
diff --git a/packages/config/README.md b/packages/config/README.md
new file mode 100644
index 0000000000000000000000000000000000000000..eb86b42ab5a1513e3019d4ab723b45b5f4f08fea
--- /dev/null
+++ b/packages/config/README.md
@@ -0,0 +1,25 @@
+# @civ7/config
+
+Utilities for loading and resolving paths from the `civ.config.jsonc` file used by the `civ7` CLI.
+
+## Features
+
+- Expand `~` in paths and detect the project root
+- Load `civ.config.jsonc` and merge profile overrides
+- Resolve install, zip, unzip and graph output locations
+- JSON schema for editor validation
+
+## JSON Schema
+
+`schema/civ.config.schema.json` provides a [JSON Schema](https://json-schema.org/) for configuration files.
+Include the schema in your `civ.config.jsonc` to enable completions:
+
+```jsonc
+{
+  "$schema": "./node_modules/@civ7/config/schema/civ.config.schema.json"
+}
+```
+
+## Build
+
+This package is bundled with [tsup](https://tsup.egoist.dev/). Run `pnpm -F @civ7/config build` to generate the `dist/` outputs.
diff --git a/packages/config/TESTING.md b/packages/config/TESTING.md
new file mode 100644
index 0000000000000000000000000000000000000000..8d190638931a549af6c8d911e6d3da3cfdfc53b2
--- /dev/null
+++ b/packages/config/TESTING.md
@@ -0,0 +1,18 @@
+# Testing
+
+This package uses [Vitest](https://vitest.dev/).
+
+## Running tests
+
+```bash
+pnpm test --project config
+```
+
+## Current status
+
+Unit tests cover path and directory resolution utilities. Additional cases are welcome as features evolve.
+
+## Suggested future tests
+
+- Path resolution helpers handle profile overrides
+- Default directory fallbacks for unsupported platforms
diff --git a/packages/config/test/resolvers.test.ts b/packages/config/test/resolvers.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..07c62d6fe7a204c3ded8d1745ae552c24c70504d
--- /dev/null
+++ b/packages/config/test/resolvers.test.ts
@@ -0,0 +1,73 @@
+import { describe, it, expect, vi } from 'vitest';
+import * as path from 'node:path';
+import * as os from 'node:os';
+
+import {
+  expandPath,
+  resolveZipPath,
+  resolveUnzipDir,
+  resolveGraphOutDir,
+  resolveInstallDir,
+} from '../src/index';
+
+describe('@civ7/config path helpers', () => {
+  it('expands ~ to home directory', () => {
+    expect(expandPath('~/mods')).toBe(path.join(os.homedir(), 'mods'));
+  });
+
+  it('returns original path when not starting with ~', () => {
+    expect(expandPath('/absolute')).toBe('/absolute');
+  });
+
+  it('resolves zip path with defaults', () => {
+    const projectRoot = '/tmp/project';
+    const cfg = {};
+    const result = resolveZipPath({ projectRoot }, cfg);
+    expect(result).toBe(
+      path.resolve(projectRoot, '.civ7/outputs/archives/civ7-official-resources.zip'),
+    );
+  });
+
+  it('resolves zip path with profile overrides', () => {
+    const projectRoot = '/tmp/project';
+    const cfg = {
+      outputs: { baseDir: 'out', zip: { dir: 'base', name: 'base.zip' } },
+      profiles: {
+        dev: {
+          outputs: { zip: { dir: 'dev', name: 'dev.zip' } },
+        },
+      },
+    };
+    const result = resolveZipPath({ projectRoot, profile: 'dev' }, cfg);
+    expect(result).toBe(path.resolve(projectRoot, 'out/dev/dev.zip'));
+  });
+
+  it('resolves unzip directory with defaults', () => {
+    const projectRoot = '/tmp/project';
+    const cfg = {};
+    const result = resolveUnzipDir({ projectRoot }, cfg);
+    expect(result).toBe(path.resolve(projectRoot, '.civ7/outputs/resources'));
+  });
+
+  it('resolves graph output directory with sanitized seed', () => {
+    const projectRoot = '/tmp/project';
+    const cfg = {};
+    const result = resolveGraphOutDir({ projectRoot }, cfg, 'Seed With Spaces!%');
+    expect(result).toBe(
+      path.resolve(projectRoot, '.civ7/outputs/graph/Seed_With_Spaces__'),
+    );
+  });
+
+  it('uses install flag when provided', () => {
+    const result = resolveInstallDir({}, '~/game');
+    expect(result).toBe(path.join(os.homedir(), 'game'));
+  });
+
+  it('falls back to empty install dir on unsupported platforms', () => {
+    if (['darwin', 'win32'].includes(os.platform())) {
+      return; // skip on platforms with defaults
+    }
+    expect(resolveInstallDir({})).toBe('');
+  });
+});
+
diff --git a/vitest.config.ts b/vitest.config.ts
index 3557e8a84df7393ffc46aefe77322cdb528b3753..25c8ec7a82fe81544db98711fa6cc82c775cffd9 100644
--- a/vitest.config.ts
+++ b/vitest.config.ts
@@ -1,40 +1,45 @@
 import { defineConfig } from 'vitest/config';
 import { dirname, join } from 'node:path';
 import { fileURLToPath } from 'node:url';
 
 const r = (p: string) => join(dirname(fileURLToPath(import.meta.url)), p);
 
 export default defineConfig({
   test: {
     environment: 'node',
     projects: [
       {
         extends: true,
         root: r('packages/cli'),
         test: { name: 'cli' }
       },
+      {
+        extends: true,
+        root: r('packages/config'),
+        test: { name: 'config' }
+      },
       {
         extends: true,
         root: r('packages/sdk'),
         test: { name: 'sdk' }
       },
       {
         extends: true,
         root: r('apps/docs'),
         test: { name: 'docs' }
       },
       {
         extends: true,
         root: r('apps/playground'),
         test: { name: 'playground' }
       },
       {
         extends: true,
         root: r('packages/plugins/plugin-files'),
         test: { name: 'plugin-files' }
       },
       {
         extends: true,
         root: r('packages/plugins/plugin-graph'),
         test: { name: 'plugin-graph' }
       }
 
EOF
)