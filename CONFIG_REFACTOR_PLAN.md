# CONFIG REFACTOR PLAN

### Objective
Refactor `civ.config.jsonc` to a more modular and intuitive structure, separating inputs, outputs, and profiles. This improves clarity, maintainability, and extensibility.

### Core Concepts: A Layered Approach
The configuration system is designed with two primary user groups in mind: downstream consumers and internal monorepo developers. The resulting strategy is layered to serve both effectively:

1.  **Layer 1: Global Defaults (`inputs`, `outputs`)**
    -   **Purpose**: To provide a safe, predictable, zero-config experience for downstream users.
    -   **Behavior**: By default, all CLI outputs are directed to a `.civ7/outputs/` directory within the user's project. This prevents polluting the project root and establishes a clear separation between source code and generated artifacts.
    -   **Audience**: The primary audience is the external modder using the CLI in their own project.

2.  **Layer 2: Per-Profile Overrides (`profiles.<name>.outputs`)**
    -   **Purpose**: To provide a powerful "escape hatch" for specific application integration needs where the default behavior is insufficient.
    -   **Behavior**: A named profile (e.g., `"default"`) can override the global output settings to direct files to a specific path required by an application.
    -   **Audience**: Power users or developers integrating the CLI into a larger workflow, such as our monorepo's `docs` app.

This layered approach provides the best of both worlds: simplicity and safety for the average user, and power and flexibility for advanced use cases.

### Proposed Structure
```jsonc
{
    "inputs": {
        "installDir": "..."
    },
    "outputs": {
        "baseDir": ".civ7/outputs",
        "archive": { "dir": "archives", "name": "..." },
        "unzip": { "dir": "resources" },
        "graph": { "dir": "graph" }
    },
    "profiles": {
        "default": {
            "description": "...",
            "zip": { "exclude": [...] },
            "outputs": {
                "unzip": { "dir": "..." },
                "archive": { "dir": "...", "name": "..." }
            }
        }
    }
}
```

### Implementation Steps
1.  **Schema (`packages/cli/civ.config.schema.json`):**
    *   Update the schema to match the new `inputs`, `outputs`, and `profiles` structure.
    *   Deprecate/remove old top-level keys.
    *   Improve descriptions to guide users.

2.  **Root Config (`civ.config.jsonc`):**
    *   Restructure the root config file to the new format.
    *   Ensure the `docs` app profile correctly overrides output paths.

3.  **CLI Resolver (`packages/cli/src/utils/resolver.ts`):**
    *   Refactor resolver functions (`resolveZipPath`, `resolveUnzipDir`, etc.) to read from the new nested structure.
    *   Implement logic to merge global `outputs` settings with per-profile `outputs` overrides.

4.  **Tests (`packages/cli/test/resolver.test.ts`):**
    *   Update all tests to use the new config structure for mocks.
    *   Add new tests to validate the override logic (e.g., profile overrides one part of `outputs` but inherits the rest).

### Downstream Impact & Dependencies (Breaking Change)

This is a **breaking change** for the configuration file format.

1.  **CLI Consumers:**
    *   Any user with an existing `civ.config.jsonc` **must** migrate their config to the new format.
    *   **Mitigation:** We will clearly document this change in the CLI's `CHANGELOG.md`. A future enhancement could be a `civ7 config migrate` command, but that is out of scope for this plan.

2.  **Internal Monorepo Apps (`docs`, `playground`):**
    *   These apps are indirectly affected as their workflows rely on the CLI's output.
    *   **Action:** The refactored `default` profile in our root `civ.config.jsonc` will ensure the `docs` app continues to receive resources in the correct location (`apps/docs/site/...`), so no changes to the `docs` app itself are needed. The workflow remains the same.

3.  **SDK (`@civ7/sdk`):**
    *   **No impact.** The SDK remains config-agnostic. This principle is preserved.
