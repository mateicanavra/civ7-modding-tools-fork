# Civ7 Modding Tools and Resources

A comprehensive monorepo workspace for Civilization VII modding, providing tools, documentation, and an SDK for creating mods programmatically.

This repository began from [izica/civ7-modding-tools](https://github.com/izica/civ7-modding-tools) and has since diverged; it is maintained independently and extended with:
- 📦 **[@civ7/sdk](packages/sdk)** - TypeScript SDK for programmatic mod generation
- 🛠️ **[@civ7/cli](packages/cli)** - Command-line tools for managing game resources
- 📚 **[Documentation](apps/docs)** - Comprehensive modding guides and references
- 🎮 **[Playground](apps/playground)** - Examples and experimentation space

## Quick Links
- [Installation](#installation-and-setup)
- [Using the CLI](#using-the-cli)
- [SDK Documentation](packages/sdk/README.md)
- [Community Guides](apps/docs/site/community/)
- [Official Modding Docs](apps/docs/site/civ7-official/modding/)

## Workspace Structure

```
civ7-modding-tools/
├── packages/
│   ├── sdk/          # TypeScript SDK for mod generation
│   └── cli/          # Command-line tools
├── apps/
│   ├── docs/         # Documentation site (Docsify)
│   └── playground/   # Example mods and experiments
└── civ.config.jsonc  # CLI configuration
```

## Installation and Setup

Setting up this project is a two-step process. First, you install the project dependencies and the CLI. Second, you use the newly installed CLI to pull in the game data.

### Step 1: Install Dependencies and Link the CLI

This command will install all necessary dependencies, build the CLI, and create a global link to the `civ7` executable, making it available everywhere in your terminal.

```bash
pnpm refresh
```
You only need to run this command once for the initial setup, or whenever you pull changes that affect dependencies or the CLI source code.

**Note:** After running this command, you may need to open a new terminal session or source your shell's profile file (e.g., `source ~/.zshrc`) for the `civ7` command to become available.

### Step 2: Refresh Game Data

After the `civ7` command is available, you can use it to populate the repository with the official game data from your local Civilization VII installation. This script runs `civ7 zip` and `civ7 unzip` in sequence using the `default` profile.

```bash
pnpm refresh:data
```

You can run this command whenever you want to ensure the local resource data is up-to-date with your game files.

## Using the CLI

Once set up, you can use the `civ7` command directly to manage game resource archives. Its behavior is configured by the `civ.config.jsonc` file located in the project root. You can customize the default profiles or add your own.

### Unzipping Resources
```bash
# Unzip using the 'default' profile
civ7 unzip

# Unzip using the 'full' profile
civ7 unzip full

# Override the source archive and destination directory
civ7 unzip default ./my-archive.zip ./my-output-dir
```

### Zipping Resources
```bash
# Zip using the 'default' profile
civ7 zip

# Zip using the 'assets' profile with verbose output
civ7 zip --verbose assets

# Use a custom config file instead of the one in the project root
civ7 zip --config ./my-custom-config.jsonc default
```

### Profiles
- **default**: Includes core gameplay data and excludes large assets. Ideal for quick, focused modding tasks.
- **full**: Includes almost all game resources, suitable for comprehensive analysis.
- **assets**: Includes only media like icons, fonts, and movies.


## Getting Started with Mod Generation

The SDK provides strongly-typed builders for creating mods. For detailed documentation, see the [SDK README](packages/sdk/README.md).

### Quick Example

```typescript
import { Mod, UnitBuilder } from '@civ7/sdk';

const mod = new Mod({ id: 'my-mod', version: '1.0.0' });
// Add builders and generate
mod.build('./output');
```

For complete examples, check the [playground](apps/playground/src/examples/).







## Documentation

Comprehensive documentation is available in the [docs app](apps/docs/):

- **[Community Guides](apps/docs/site/community/)** - Tutorials, patterns, and best practices
- **[Official Modding Docs](apps/docs/site/civ7-official/modding/)** - Firaxis documentation and examples
- **[SDK Reference](packages/sdk/)** - API documentation for the TypeScript SDK

To serve the documentation locally:

```bash
pnpm docs:dev
# Visit http://localhost:4000
```

## Contributing

This is a community-maintained project. Contributions are welcome!

### Development Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Visualize test runs
pnpm test:ui

# Run a single suite
pnpm vitest --project <cli|sdk|docs|playground>

See [TESTING.md](TESTING.md) for details on the Vitest setup and package-specific smoke tests.

# Serve documentation
pnpm docs:dev
```

### Project Structure

- **Monorepo**: Uses pnpm workspaces and Turborepo for efficient builds
- **TypeScript**: Fully typed with strict mode
- **Testing**: Vitest for unit tests
- **Linting**: ESLint with TypeScript support
- **Documentation**: Docsify for static site generation

## License

MIT - See [LICENSE](LICENSE) for details

## Credits

- Upstream inspiration and original base: [izica/civ7-modding-tools](https://github.com/izica/civ7-modding-tools)
- Civilization VII by Firaxis Games
- Community contributors