# Civilization VII Modding Architecture

## Core Architecture Overview

Civilization VII uses a highly modular architecture organized around "modules" - self-contained packages of content that can be loaded independently. This represents a significant evolution from previous Civilization titles, with content now strictly compartmentalized by era (Ages) and type.

The game's core structure consists of:

1. **Base Modules** - Fundamental game systems shared across all content
2. **Age Modules** - Era-specific content packages (Antiquity, Exploration, Modern)
3. **Standard Modules** - Core gameplay definitions and shared resources

Each module is essentially a self-contained mod with its own `.modinfo` definition file, making the base game itself a collection of interconnected mods. This architecture makes Civilization VII inherently more moddable than its predecessors.

## The Ages System

One of Civilization VII's defining features is its Ages system, which directly impacts how modding works:

```
Base Game
├── base-standard (core definitions)
├── age-antiquity (earliest era)
├── age-exploration (middle era)
└── age-modern (latest era)
```

Each Age module:
- Contains content specific to that historical period
- Has its own independent database tables
- Maintains its own localization and assets
- Can be conditionally loaded based on game state

This modular approach means mods must consider which Age their content belongs to. For example, a civilization intended for the Antiquity Age should depend on the "age-antiquity" module, while Modern Age content should properly reference "age-modern" dependencies.

As Ed Beach, Creative Director, explained in a dev diary: "Ages determine which Civics and Technologies can be researched" and "Available types of Units, Buildings, and Wonders are determined by the Age." This age-specific content is a fundamental consideration for mod creators.

## Module Relationships

The base game content is distributed across multiple modules that work together:

- **base-standard**: Core gameplay definitions, rules, and systems
- **age-antiquity**: Early game civilizations, units, and mechanics (3000 BCE - 500 CE)
- **age-exploration**: Middle period content and progression (500 CE - 1700 CE)
- **age-modern**: Late game technologies, units, and systems (1700 CE - Present)

Custom mods can interact with these modules through dependencies, additions, or modifications, giving modders precise control over which parts of the game they affect.

### Module File Structure

Examining the actual game files, each module follows a consistent structure:

```
module-name/
├── module-name.modinfo   # Module definition file
├── package.json          # Package metadata
├── config/               # Configuration settings
├── data/                 # XML files for game elements
│   ├── civilizations.xml # Civilization definitions (not in subfolders)
│   ├── leaders.xml       # Leader definitions
│   ├── units.xml         # Unit definitions
│   ├── ...               # Other game element files
├── definitions/          # Database schemas (.civdb files, base-standard only)
├── text/                 # Localization files
├── l10n/                 # Additional localization
├── ui/                   # UI element definitions
├── scripts/              # JavaScript files for game logic
└── movies/               # Media resources
```

Key differences between module types:
- **Base-Standard**: Contains the `definitions` folder with `.civdb` schema files that define game structures
- **Age Modules**: Focus on content specific to that historical period, but lack definition files
- **DLC Modules**: Similar structure but typically focus on specific civilizations or leaders

## Core Modding Concepts

### Mod Structure

A basic Civilization VII mod consists of:

1. **`.modinfo` file** - XML definition that identifies the mod and specifies how it loads
2. **Data files** - XML/SQL content that adds or modifies game elements
3. **Text files** - Localization entries for in-game text
4. **UI files** - JavaScript (JS) files for interface modifications (Civ VII uses JS instead of Lua)
5. **Map scripts** - JS files for procedural map generation (if applicable)

### Mod Loading Process

When Civilization VII loads a mod:

1. The game reads the mod's `.modinfo` file to identify dependencies and actions
2. Action groups define what files to load and when they should load
3. Conditionally loaded content may depend on game state (e.g., current Age)
4. Database updates are applied to game tables
5. Text updates are merged with existing localization
6. UI modifications replace or enhance existing interfaces
7. Custom scripts are executed for specialized functionality

### Database Approach

Most modding in Civilization VII is accomplished through:

- **Insertions** - Adding new rows to game tables (new civilizations, units, buildings)
- **Updates** - Modifying existing values (changing unit stats, building yields)
- **Replacements** - Completely replacing entries (changing text or behaviors)

The game's database is defined by schemas that outline the structure and relationships of all game elements. Key schema files include:
- Core gameplay schema (`01_GameplaySchema.sql`)
- Modding framework schema (`schema-modding-10.sql`)
- Icon management schema (`IconManager.sql`)
- Localization schema (`schema-loc-10.sql`)

## Modding Workflow

A typical modding workflow involves:

1. **Planning** - Determining scope and dependencies for your mod
2. **Setup** - Creating the mod folder and `.modinfo` file
3. **Implementation** - Writing XML/SQL data, text, and scripts
4. **Testing** - Ensuring the mod works as expected in-game
5. **Iteration** - Refining based on testing and feedback
6. **Distribution** - Packaging for sharing with other players

### Age Transitions and Mod Compatibility

One unique aspect of Civilization VII modding is accounting for Age transitions. Edward Zhang, Economics Feature Lead, explains that during transitions:

- Leaders remain the same across Ages
- Wonders and unique Quarters persist as "Ageless" structures
- Commander units maintain attributes and experience
- Traditions unlocked from Civic trees remain available

Mods need to consider these persistence mechanics when designing content that spans multiple Ages.

## Best Practices

### Organization

- Use unique identifiers for all content (prefixed with mod name)
- Maintain consistent folder structure for easy navigation
- Group related files logically (data, text, UI, etc.)
- Comment code for clarity and future maintenance

### Compatibility

- Specify clear dependencies on base modules
- Use conditional loading for era-specific content
- Avoid direct edits to base game files
- Test with other popular mods when possible

### Technical Execution

- Follow naming conventions from base game
- Balance new content against existing game elements
- Test incrementally during development
- Use the game's logs for troubleshooting

## Navigation Guide

The full modding documentation consists of the following sections:

1. **Architecture Overview** (this document)
2. **Technical References**:
   - [Database Schemas](civ7-database-schemas.md) - Detailed technical information about the game's internal structure
   - [Age Modules](civ7-age-modules.md) - Specifics about each Age module and its content
   - [Base-Standard Module](civ7-base-standard-module.md) - Core structure and implementation patterns
   - [DLC and Community Mod Patterns](civ7-mod-patterns.md) - Examples and best practices from existing mods
3. **Practical Guides**:
   - [Creating New Civilizations](civ7-creating-civilizations.md) - Step-by-step guide for adding civilizations
   - [Creating New Leaders](civ7-creating-leaders.md) - Process for implementing new leaders
   - [Modifying Existing Content](civ7-modifying-existing-content.md) - Approaches for balancing and changing game elements
4. **Appendices**:
   - [File Paths Reference](civ7-file-paths-reference.md) - Directory structure and important file locations

## Getting Started

For newcomers to Civilization VII modding, we recommend:

1. Review this architecture document to understand the overall structure
2. Examine the Database Schemas document to familiarize yourself with game tables
3. Follow the Creating New Civilizations or Modifying Existing Content guides for hands-on practice
4. Reference the DLC and Community Mod Patterns for real-world examples

By understanding Civilization VII's modular architecture, you'll be well-positioned to create mods that work seamlessly with the base game and enhance the experience for players. 