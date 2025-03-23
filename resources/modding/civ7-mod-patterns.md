# Civilization VII DLC and Community Mod Patterns

## Overview

This document examines implementation patterns from both official DLC content and community-created mods for Civilization VII. Understanding these patterns is essential for creating well-structured, compatible mods that integrate properly with the game's Age system and follow best practices.

## Official DLC Structure

Official DLCs follow a consistent organizational pattern that provides valuable insights for modders:

### Dual-Folder Approach

Official DLCs use a dual-folder architecture:
- **Main content folder** (e.g., `nepal/`, `carthage/`, `great-britain/`): Contains the actual gameplay content, assets, and definitions
- **Shell folder** (e.g., `nepal-shell/`, `carthage-shell/`): Contains metadata, dependencies, and integration information

This separation allows the game to load metadata first before committing to loading the full content.

### Content Organization

DLCs are primarily organized by civilization/leader rather than by content type, reflecting the game's design focus on these elements as the central organizing principle. Each DLC typically includes:

1. Civilization definitions
2. Leader definitions
3. Unique units
4. Unique infrastructure
5. Unique abilities
6. Traditions
7. Age-specific content integration
8. Localization data

### DLC Types

The official DLCs demonstrate several content categories:
- **Civilization/Leader Packs**: Complete civilizations with their associated leaders (e.g., Nepal, Great Britain)
- **Natural Wonder Packs**: New natural wonders with their effects and placement rules (e.g., Mountain Natural Wonders)
- **Alternate Leader Versions**: Variations of existing leaders with different abilities (e.g., alternate versions of Napoleon)

## Community Mod Example: Scythia Civilization

The Scythia mod by Izica represents an excellent example of community modding that follows best practices:

### Folder Structure

```
/civmods-izica-civilization-scythia-38056/
├── imports/              # External assets and dependencies
├── civilizations/        # Civilization definitions
├── traditions/           # Tradition definitions
├── units/                # Unit definitions
├── constructibles/       # Buildings and improvements
├── progression-trees/    # Civic and tech trees
└── izica-civilization-scythia.modinfo  # Mod metadata
```

This structure organizes content by type rather than by civilization, which is appropriate for single-civilization mods and makes maintenance easier.

### Modinfo File

The central `.modinfo` file defines:
- Mod metadata (name, author, version)
- Dependencies on other mods or base game content
- Load order requirements
- Compatibility information
- File references for all included content

### Self-Contained Approach

The Scythia mod demonstrates a self-contained approach where all necessary content is included within the mod, minimizing dependencies on other mods and reducing potential conflicts.

## Integration with the Age System

Civilization VII's Age system presents unique challenges and opportunities for modders:

### Age Assignment

Content must be properly assigned to specific Ages:
- **Civilization Assignment**: Civilizations are tied to specific Ages (Antiquity, Exploration, or Modern)
- **Leader Compatibility**: Leaders can work across Ages but may have Age-specific bonuses
- **Units and Buildings**: Must be assigned to appropriate Ages or marked as "Ageless"

### Cross-Age Persistence

Several mechanisms allow content to persist across Ages:
- **Traditions**: Unlocked through unique Civic trees, these persist as policies across Ages
- **Ageless Infrastructure**: Unique buildings and improvements can be marked as "Ageless" to remain relevant
- **Commander Units**: Can persist with their attributes across Age transitions

### Age Transition Handling

Mods should properly handle Age transitions by:
- Defining which elements carry over to new Ages
- Specifying how deprecated elements are handled (conversion, removal, etc.)
- Supporting Golden Age and Dark Age legacies where appropriate

## Localization Implementation

Effective localization ensures mods are accessible to players worldwide:

### Localization Files

Localization is implemented through:
- Text definition files with language-specific variants
- Key-based reference system for all text content
- Support for multiple languages within the same mod

### String References

Text strings should be referenced consistently using the pattern:
```
LOC_MODID_CATEGORY_NAME_TEXT
```

For example:
```
LOC_SCYTHIA_CIVILIZATION_NAME_TEXT
LOC_SCYTHIA_LEADER_TOMYRIS_NAME_TEXT
LOC_SCYTHIA_ABILITY_DESCRIPTION_TEXT
```

### Rich Text Support

Localization can leverage rich text formatting including:
- Color coding
- Icons
- Formatting (bold, italic)
- Variables for dynamic content

## Best Practices Derived from Existing Mods

Analysis of official DLCs and community mods reveals several best practices:

### Structural Best Practices

1. **Modular Design**: Organize content into logical folders based on content type
2. **Self-Contained Implementation**: Include all required assets and definitions
3. **Clear Naming Conventions**: Use consistent, descriptive naming patterns with prefixes
4. **Dependency Management**: Explicitly define dependencies and load order requirements

### Content Best Practices

1. **Age Compatibility**: Properly assign content to appropriate Ages
2. **Balanced Mechanics**: Design units, buildings, and abilities with game balance in mind
3. **Historical Accuracy**: Where possible, align implementation with historical context
4. **Tradition Design**: Create meaningful, balanced traditions that persist across Ages
5. **Cross-Age Strategy**: Consider how your mod impacts gameplay across multiple Ages

### Technical Best Practices

1. **Asset Optimization**: Minimize file sizes for graphics and audio
2. **Comprehensive Localization**: Support multiple languages where possible
3. **XML Validation**: Ensure all XML files are well-formed and valid
4. **Error Handling**: Include fallback behavior for potentially missing content
5. **Documentation**: Include clear documentation within the mod files

### Modding Tools Usage

The TypeScript-based modding toolkit offers several advantages:
1. Abstracts XML manipulation
2. Provides standardized generation of mod files
3. Reduces common errors through templates
4. Streamlines the creation of complex content types

This toolkit, developed by community modder Izica, is available at:
- GitHub Repository: [izica/civ7-modding-tools](https://github.com/izica/civ7-modding-tools)
- CivFanatics Forum Thread: [Modding tools(framework) written on typescript](https://forums.civfanatics.com/threads/modding-tools-framework-written-on-typescript.696255/)

The toolkit was created to simplify the process of editing XML files and provides a more declarative approach to mod development, covering approximately 60-80% of common modding use cases.

## Conclusion

Understanding the patterns used in both official DLCs and successful community mods provides a strong foundation for creating high-quality Civilization VII mods. By following these established patterns, modders can create content that integrates seamlessly with the game's unique Age system, maintains compatibility with other mods, and delivers a polished experience to players. 