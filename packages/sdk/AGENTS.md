# SDK Agent Guide

## Package Overview
The `@civ7/sdk` package provides a TypeScript SDK for programmatically generating Civilization VII mods. It offers both high-level builders for rapid development and low-level nodes for fine-grained control.

## Quick Navigation

### Core Components
- **`src/builders/`** - High-level builder classes for common mod entities
  - `CivilizationBuilder.ts` - Create civilizations with traits and unlocks
  - `UnitBuilder.ts` - Define units with stats, costs, and abilities
  - `ConstructibleBuilder.ts` - Buildings, improvements, and quarters
  - `ProgressionTreeBuilder.ts` - Civic and tech trees
  - `ModifierBuilder.ts` - Game effects and modifiers

### Data Models
- **`src/nodes/`** - Low-level XML node representations
  - Direct mapping to game XML structure
  - Fine control over generated output
  - Used internally by builders

### Constants
- **`src/constants/`** - Comprehensive game constants
  - All unit types, abilities, effects, terrains, resources
  - Strongly typed for IntelliSense support
  - Import from `@civ7/sdk` root

### File Generation
- **`src/files/`** - File system abstractions
  - `XmlFile.ts` - XML file generation with action groups
  - `ImportFile.ts` - Asset and SQL file imports

### Core Module
- **`src/core/Mod.ts`** - Main mod orchestrator
  - Collects builders and files
  - Generates `.modinfo` and file structure
  - Handles build output

## Common Tasks

### Creating a New Builder
1. Extend `BaseBuilder` in `src/builders/`
2. Define property interfaces in `src/types/`
3. Implement `getNodes()` to generate XML nodes
4. Add localization support in `src/localizations/`
5. Export from `src/builders/index.ts`

### Adding Game Constants
1. Create/update constant file in `src/constants/`
2. Follow existing naming patterns (SCREAMING_SNAKE_CASE)
3. Export from `src/constants/index.ts`
4. Constants should match game's internal identifiers

### Working with Nodes
- Nodes map 1:1 with game XML structure
- Each node has a `toXmlElement()` method
- Use `DatabaseNode` to aggregate multiple node types
- Reference `src/nodes/slices/` for partial node implementations

## Architecture Patterns

### Builder Pattern
```typescript
Builder -> Nodes -> XML Files -> Mod Output
```
- Builders provide high-level API
- Convert configuration to nodes
- Nodes serialize to XML
- Files organize into mod structure

### File Organization
- Each entity gets its own folder in output
- XML files named by action group timing
- Localizations in separate files
- Icons and assets copied as-is

### Action Groups
- Files execute at specific game load phases
- Common: `CURRENT`, `ALWAYS`, `GAME_EFFECTS`
- Builders handle action group assignment
- Override with explicit configuration

## Testing & Validation

- Run `pnpm --filter @civ7/sdk test` to execute the Vitest suite (see `TESTING.md`).

### Type Checking
```bash
cd packages/sdk
pnpm exec tsc --noEmit
```

### Building
```bash
pnpm build  # Builds with tsup
```

### Example Usage
See `apps/playground/src/examples/` for working examples

## Common Pitfalls

1. **Missing Types**: Always define `TypeNode` for new entities
2. **Action Group Timing**: Wrong timing can cause load failures
3. **Localization Keys**: Must match entity type names
4. **File Paths**: Use forward slashes, relative to mod root
5. **XML Structure**: Maintain proper nesting and attributes

## Integration Points

### With CLI
- CLI doesn't currently consume SDK APIs (planned)
- Both packages work independently
- Share configuration via `civ.config.jsonc`

### With Playground
- Playground imports SDK for examples
- Test new builders there first
- Generate example mods in `example-generated-mod/`

### With Game Resources
- Reference extracted game files for XML structure
- Constants derived from game data
- Validate against `civ7-official-resources/`

## Future Enhancements
- Great People builders (in progress)
- Wonder builders (planned)
- Unit ability builders (planned)
- AI behavior nodes (planned)
- Direct CLI integration for code generation

## Debugging Tips
1. Check generated XML against game's format
2. Verify action group timing
3. Ensure all referenced types exist
4. Check localization key matching
5. Validate file paths in `.modinfo`

## Resources
- [README.md](./README.md) - User-facing documentation
- [TECHNICAL_GUIDE.md](./TECHNICAL_GUIDE.md) - Deep technical details
- [CHANGELOG.md](./CHANGELOG.md) - Version history
- Game schema: Extract with `pnpm refresh:data` at workspace root

### Testing Notes
- `XmlFile.write` uses an asynchronous `fs.mkdir` callback; wait briefly after `Mod.build` in tests before reading generated files.
