# Architecture

> System-wide architecture overview.

---

## Overview

Civ7 Modding Tools is a TypeScript monorepo providing:
- **SDK** for programmatic mod generation
- **CLI** for resource management
- **Plugin libraries** for reusable logic
- **Documentation** and playground apps

## Monorepo Structure

```
packages/           # Core libraries
├── sdk/            # TypeScript SDK (@civ7/sdk)
├── cli/            # Command-line tools (@civ7/cli)
├── config/         # Shared configuration (@civ7/config)
└── plugins/        # Reusable plugins
    ├── plugin-files/   # Zip/unzip utilities
    ├── plugin-graph/   # XML graph crawling
    ├── plugin-git/     # Git operations
    └── plugin-mods/    # Mod management

apps/               # Applications
├── docs/           # Documentation site (Mintlify)
└── playground/     # Examples and experiments

mods/               # Colocated mods
├── mod-swooper-maps/      # Map generation mod
└── mod-swooper-civ-dacia/ # Dacia civilization mod
```

## Build System

 - **Package manager:** Bun (workspaces)
- **Build orchestration:** Turbo
- **TypeScript bundler:** tsup
- **Runtime:** Bun (build scripts)

## Data Flow

1. **Game resources** extracted via CLI (`civ7 unzip`) → `.civ7/outputs/`
2. **SDK** consumes game constants and generates mod XML
3. **Mods** build to `./mod/` directories for game installation

## Component Documentation

- [SDK Technical Guide](sdk/technical-guide.md)
- [CLI Features](cli/features.md)
- [Swooper Maps Architecture](mods/swooper-maps/architecture.md)
- [Legacy Mapgen Reference](../system/mods/swooper-maps/reference/) — archived Epic Diverse Huge notes

<!-- NOTE FOR AGENTS:
If this overview exceeds ~300 lines or you find yourself adding a major subsystem,
consider:
1. Splitting that subsystem into its own doc
2. Creating a dedicated architecture doc for complex components
3. Adding an ADR entry in `docs/system/ADR.md` if trade-offs were evaluated

Keep this overview focused on orientation ("how to work here") rather than deep dives.
-->
