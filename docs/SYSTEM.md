# System

> High-level system overview and architecture map.

---

## Quick Start

- [Architecture Overview](system/ARCHITECTURE.md) — System-wide architecture
- [Testing Strategy](system/TESTING.md) — How we test across the monorepo

## Workspace Structure

```
civ7-modding-tools/
├── packages/
│   ├── sdk/              # TypeScript SDK for mod generation
│   ├── cli/              # Command-line tools (oclif)
│   ├── config/           # Shared config/path resolution
│   └── plugins/          # Reusable plugin libraries
├── apps/
│   ├── docs/             # Documentation site (Mintlify)
│   └── playground/       # Example mods and experiments
├── mods/
│   └── <mod-name>/       # Colocated mod workspaces
└── civ.config.jsonc      # CLI configuration
```

## Components

### Packages

- [SDK](system/sdk/) — TypeScript SDK for programmatic mod generation
- [CLI](system/cli/) — Command-line tools for resource management

### Plugins

- Mapgen notes are archived; see legacy reference under [Swooper Maps](system/mods/swooper-maps/reference/).

### Mods

- [Swooper Maps](system/mods/swooper-maps/) — Large-scale procedural map generation

## Standards

- [Architecture Decisions](system/ADR.md) — Significant decisions made
- [Deferred Work](system/DEFERRALS.md) — Intentionally postponed work with trigger conditions
