# Civilization VII Modding Documentation Guide

## Overview

This guide provides a comprehensive listing of all documentation available for Civilization VII modding, including contextual descriptions, use case scenarios, and target audience information. Use this document as a map to navigate the documentation based on your specific needs and expertise level.

## Documentation Categories

The documentation is organized into the following categories:

1. **Introductory Guides** - Essential starting points for new modders
2. **Architecture & Framework** - Understanding the fundamental structure of the modding system
3. **Content Creation** - Specific guides for creating new game elements
4. **TypeScript Modding Tools** - Documentation for the code-based modding approach
5. **Example Implementation** - Complete example of the Dacia civilization
6. **Reference Materials** - Technical reference documentation

## Difficulty Levels

Documents are marked with difficulty indicators to help you find resources appropriate for your skill level:

- 🟢 **Beginner** - Suitable for newcomers to Civilization VII modding
- 🟡 **Intermediate** - Requires basic understanding of modding concepts
- 🔴 **Advanced** - For experienced modders with technical knowledge
- 📊 **Reference** - Technical reference materials for all skill levels

## Introductory Guides

### [Getting Started](/guides/getting-started.md) 🟢
- **Description**: An introduction to Civilization VII modding with basic concepts and setup instructions.
- **Use when**: You're new to Civilization VII modding and need to set up your environment.
- **Target audience**: Complete beginners with no prior modding experience.
- **Related documents**: [Modding Architecture](/guides/modding-architecture.md), [Mod Patterns](/guides/mod-patterns.md)

## Architecture & Framework

### [Modding Architecture](/guides/modding-architecture.md) 🟡
- **Description**: Overview of Civilization VII's modding framework and systems.
- **Use when**: You need to understand how the modding system works at a structural level.
- **Target audience**: Modders who want to learn about the underlying architecture.
- **Related documents**: [Database Schemas](/guides/database-schemas.md), [Base Standard Module](/guides/base-standard-module.md)

### [Database Schemas](/guides/database-schemas.md) 🔴
- **Description**: Technical details about the game's internal data structures and relationships.
- **Use when**: You need to understand how game data is organized and linked together.
- **Target audience**: Technical modders who need to work directly with the database.
- **Related documents**: [Modding Reference](/reference/modding-reference.md)

### [Base Standard Module](/guides/base-standard-module.md) 🟡
- **Description**: Detailed information about the base-standard module that defines core game elements.
- **Use when**: You need to understand or modify foundational game systems.
- **Target audience**: Modders working on substantial gameplay changes.
- **Related documents**: [Age Modules](/guides/ages/age-modules.md)

### [Age Modules](/guides/ages/age-modules.md) 🟡
- **Description**: Information about the Age system in Civilization VII and how content is organized by historical period.
- **Use when**: Creating age-specific content or understanding how progression works across ages.
- **Target audience**: Modders adding content that spans multiple historical periods.
- **Related documents**: [Base Standard Module](/guides/base-standard-module.md), [Age Architecture](/guides/ages/age-architecture.md)

### [Age Architecture](/guides/ages/age-architecture.md) 🟡
- **Description**: Detailed explanation of the Age system's technical architecture and implementation.
- **Use when**: You need to understand how the Age system works at a structural level.
- **Target audience**: Modders creating content that integrates deeply with the Age system.
- **Related documents**: [Age Modules](/guides/ages/age-modules.md), [Age Gameplay Mechanics](/guides/ages/age-gameplay-mechanics.md)

### [Age Gameplay Mechanics](/guides/ages/age-gameplay-mechanics.md) 🟡
- **Description**: Detailed explanation of age-specific gameplay mechanics and transitions.
- **Use when**: You need to understand how gameplay changes across different ages.
- **Target audience**: Modders creating content that spans multiple ages or affects age progression.
- **Related documents**: [Age Modules](/guides/ages/age-modules.md), [Gameplay Mechanics](/reference/gameplay-mechanics.md)

### [Mod Patterns](/guides/mod-patterns.md) 🟡
- **Description**: Common modding approaches and best practices for different types of mods.
- **Use when**: Planning your mod's structure and implementation approach.
- **Target audience**: Modders who want to follow established patterns for reliable results.
- **Related documents**: [Creating Civilizations](/guides/creating-civilizations.md), [Creating Leaders](/guides/creating-leaders.md)

## Content Creation

### [Creating Civilizations](/guides/creating-civilizations.md) 🟡
- **Description**: Step-by-step guide for adding new civilizations to the game.
- **Use when**: You want to create a new civilization with unique traits and abilities.
- **Target audience**: Modders with basic understanding of game mechanics.
- **Related documents**: [Creating Leaders](/guides/creating-leaders.md), [Dacia Implementation Guide](/guides/examples/dacia-implementation-guide.md)

### [Creating Leaders](/guides/creating-leaders.md) 🟡
- **Description**: Guide for implementing new leaders with unique abilities and agendas.
- **Use when**: You want to add a new leader to an existing or new civilization.
- **Target audience**: Modders with basic understanding of game mechanics.
- **Related documents**: [Creating Civilizations](/guides/creating-civilizations.md), [Modding Guide: Civs & Leaders](/reference/modding-guide-civs-leaders.md)

### [Modifying Existing Content](/guides/modifying-existing-content.md) 🟢
- **Description**: Guide for altering or enhancing existing game content.
- **Use when**: You want to change or rebalance existing game elements rather than create new ones.
- **Target audience**: Suitable for beginners looking to make simple modifications.
- **Related documents**: [Modding Reference](/reference/modding-reference.md)

## TypeScript Modding Tools

### [TypeScript Modding Tools Overview](/guides/typescript/typescript-overview.md) 🟡
- **Description**: Introduction to the TypeScript-based modding toolkit for Civilization VII.
- **Use when**: You want to understand the code-based approach to modding.
- **Target audience**: Modders with programming experience, especially in TypeScript/JavaScript.
- **Related documents**: [TypeScript Modding Tools Technical](/guides/typescript/typescript-technical.md), [Environment Setup](/guides/typescript/howto/environment-setup.md)

### [TypeScript Modding Tools Technical](/guides/typescript/typescript-technical.md) 🔴
- **Description**: Technical implementation details of the TypeScript modding toolkit.
- **Use when**: You need to understand the inner workings of the toolkit or extend its functionality.
- **Target audience**: Advanced modders with strong TypeScript/JavaScript skills.
- **Related documents**: [TypeScript Modding Tools Overview](/guides/typescript/typescript-overview.md)

### TypeScript How-To Guides 🟡

The following how-to guides provide step-by-step instructions for specific modding tasks:

#### [Environment Setup](/guides/typescript/howto/environment-setup.md)
- **Description**: Setting up your development environment for TypeScript modding.
- **Use when**: Starting with TypeScript modding and need to prepare your workstation.
- **Target audience**: Newcomers to TypeScript modding for Civilization VII.

#### [Creating Units](/guides/typescript/howto/creating-units.md)
- **Description**: Step-by-step guide for creating custom units with TypeScript.
- **Use when**: Adding new units to the game using code-based modding.
- **Target audience**: Modders with basic TypeScript knowledge.

#### [Creating Buildings](/guides/typescript/howto/creating-buildings.md)
- **Description**: Guide for implementing new buildings and improvements.
- **Use when**: Creating custom buildings and improvements with TypeScript.
- **Target audience**: Modders with basic TypeScript knowledge.

#### [Creating Civilizations](/guides/typescript/howto/creating-civilizations.md)
- **Description**: Comprehensive guide for implementing new civilizations with TypeScript.
- **Use when**: Creating a full civilization using code-based modding.
- **Target audience**: Modders with intermediate TypeScript experience.

#### [Leaders and Ages](/guides/typescript/howto/leaders-and-ages.md)
- **Description**: Guide for creating leaders and age-specific content with TypeScript.
- **Use when**: Implementing leaders that change across game ages.
- **Target audience**: Modders with intermediate TypeScript experience.

#### [Unique Quarters](/guides/typescript/howto/unique-quarters.md)
- **Description**: Guide for creating civilization-specific quarters and districts.
- **Use when**: Adding specialized quarters for new or existing civilizations.
- **Target audience**: Modders with intermediate TypeScript experience.

#### [Traditions](/guides/typescript/howto/traditions.md)
- **Description**: Implementing custom traditions and policies with TypeScript.
- **Use when**: Creating new tradition trees or individual traditions.
- **Target audience**: Modders with intermediate TypeScript experience.

#### [Progression Trees](/guides/typescript/howto/progression-trees.md)
- **Description**: Guide for creating technology and civic progression systems.
- **Use when**: Designing custom advancement paths in the game.
- **Target audience**: Modders with intermediate TypeScript experience.

#### [Modifiers and Effects](/guides/typescript/howto/modifiers-and-effects.md)
- **Description**: Creating gameplay modifiers and effects using TypeScript.
- **Use when**: Implementing custom gameplay bonuses and effects.
- **Target audience**: Modders with intermediate TypeScript experience.

#### [Assets and Icons](/guides/typescript/howto/assets-and-icons.md)
- **Description**: Guide for incorporating custom visual assets into mods.
- **Use when**: Adding custom icons, textures and other visual elements.
- **Target audience**: Modders interested in visual customization.

#### [Advanced Techniques](/guides/typescript/howto/advanced-techniques.md)
- **Description**: Advanced patterns and techniques for TypeScript modding.
- **Use when**: Extending the basic capabilities of the modding tools.
- **Target audience**: Experienced modders with strong TypeScript knowledge.

## Example Implementation

### [Dacia Civilization Ideas](/guides/examples/dacia-civilization-ideas.md) 🟢
- **Description**: Conceptual design document for the example Dacia civilization.
- **Use when**: You want to see how a civilization is designed from concept to implementation.
- **Target audience**: All modders, especially those planning new civilizations.
- **Related documents**: [Dacia Historical Reference](/guides/examples/dacia-historical-reference.md)

### [Dacia Historical Reference](/guides/examples/dacia-historical-reference.md) 🟢
- **Description**: Historical background information for the Dacia civilization example.
- **Use when**: Researching historical context for civilization design or as a template for your own research.
- **Target audience**: All modders interested in historically grounded content.
- **Related documents**: [Dacia Civilization Ideas](/guides/examples/dacia-civilization-ideas.md)

### [Dacia Implementation Guide](/guides/examples/dacia-implementation-guide.md) 🟡
- **Description**: Complete walkthrough of implementing the Dacia civilization in-game.
- **Use when**: Following a practical example of civilization creation from start to finish.
- **Target audience**: Modders who learn best through worked examples.
- **Related documents**: [Creating Civilizations](/guides/creating-civilizations.md), [Creating Leaders](/guides/creating-leaders.md)

### [Dacia Mechanics Alignment](/guides/examples/dacia-mechanics-alignment.md) 🟡
- **Description**: How the Dacia civilization's mechanics align with game systems and historical themes.
- **Use when**: Designing balanced and thematically appropriate civilization mechanics.
- **Target audience**: Modders focusing on gameplay design and balance.
- **Related documents**: [Gameplay Mechanics](/reference/gameplay-mechanics.md)

## Reference Materials

### [File Paths Reference](/reference/file-paths-reference.md) 📊
- **Description**: Comprehensive reference of file paths and directory structures for Civilization VII modding.
- **Use when**: You need to locate specific game files or understand the organization of mod files.
- **Target audience**: All modders, essential reference for finding and organizing files.
- **Related documents**: [Modding Architecture](/guides/modding-architecture.md)

### [Modding Reference](/reference/modding-reference.md) 📊
- **Description**: Technical reference for the modding system, including API methods and structures.
- **Use when**: You need detailed technical information about modding interfaces and methods.
- **Target audience**: All modders, especially those working on complex modifications.
- **Related documents**: [Database Schemas](/guides/database-schemas.md)

### [Gameplay Mechanics](/reference/gameplay-mechanics.md) 📊
- **Description**: Detailed reference of game mechanics and systems that can be modified.
- **Use when**: You need to understand specific game mechanics to modify or interact with them.
- **Target audience**: All modders working on gameplay modifications.
- **Related documents**: [Modding Reference](/reference/modding-reference.md), [Age Gameplay Mechanics](/guides/ages/age-gameplay-mechanics.md)

### [Modding Guide: Civs & Leaders](/reference/modding-guide-civs-leaders.md) 📊
- **Description**: Technical reference specifically for civilization and leader modding.
- **Use when**: You need detailed information about civilization and leader data structures.
- **Target audience**: Modders creating new civilizations and leaders.
- **Related documents**: [Creating Civilizations](/guides/creating-civilizations.md), [Creating Leaders](/guides/creating-leaders.md)

## Learning Paths

### For Beginners
1. [Getting Started](/guides/getting-started.md)
2. [Modifying Existing Content](/guides/modifying-existing-content.md)
3. [Dacia Civilization Ideas](/guides/examples/dacia-civilization-ideas.md)
4. [Modding Architecture](/guides/modding-architecture.md)
5. [Creating Civilizations](/guides/creating-civilizations.md)

### For Content Creators
1. [Mod Patterns](/guides/mod-patterns.md)
2. [Creating Civilizations](/guides/creating-civilizations.md)
3. [Creating Leaders](/guides/creating-leaders.md)
4. [Dacia Implementation Guide](/guides/examples/dacia-implementation-guide.md)
5. [File Paths Reference](/reference/file-paths-reference.md)

### For TypeScript Modders
1. [TypeScript Modding Tools Overview](/guides/typescript/typescript-overview.md)
2. [Environment Setup](/guides/typescript/howto/environment-setup.md)
3. [Creating Units](/guides/typescript/howto/creating-units.md)
4. [Creating Civilizations](/guides/typescript/howto/creating-civilizations.md)
5. [Advanced Techniques](/guides/typescript/howto/advanced-techniques.md)

### For Technical Modders
1. [Database Schemas](/guides/database-schemas.md)
2. [Base Standard Module](/guides/base-standard-module.md)
3. [TypeScript Modding Tools Technical](/guides/typescript/typescript-technical.md)
4. [Modifiers and Effects](/guides/typescript/howto/modifiers-and-effects.md)
5. [Modding Reference](/reference/modding-reference.md)

## Document Relationship Map

```
                                      [Getting Started]
                                            │
                      ┌─────────────────────┼─────────────────────┐
                      │                     │                     │
             [Modding Architecture]  [Modifying Content]  [Dacia Civilization Ideas]
                      │                                           │
         ┌────────────┼────────────┐                      ┌──────┴──────┐
         │            │            │                      │             │
[Database Schemas] [Base Module] [Age Modules]─────[Dacia Historical] [Dacia Implementation]
         │            │            │     │                │             │
         │            │      [Age Architecture] [Age Mechanics] [Dacia Mechanics]
         │            │            │                      │             │
         └────────────┘            │                      │             │
                │                  │                      │             │
           [Mod Patterns]          │                      │             │
                │                  │                      │             │
         ┌──────┴─────────┐       │                      │             │
         │                │       │                      │             │
[Creating Civilizations] [Creating Leaders]              │             │
         │                │       │                      │             │
         └────────────────┼───────┘                      │             │
                          │                              │             │
                    ┌─────┴──────┐                       │             │
                    │            │                       │             │
      [TypeScript Overview]──[TypeScript Technical]      │             │
                    │                                    │             │
         ┌──────────┼────────────┐                      │             │
         │          │            │                      │             │
     [Environment Setup]     [Advanced Techniques]       │             │
         │          │            │                      │             │
    ┌────┼──────────┼───────────┐│                      │             │
    │    │          │           ││                      │             │
[Units] [Buildings] [Civilizations] [Leaders]           │             │
    │    │          │           │ │                    │             │
    │    │          │ [Unique Quarters]                │             │
    │    │          │           │ │                    │             │
    │    │       [Traditions] [Progression Trees]      │             │
    │    │          │           │ │                    │             │
    └────┼──────────┼───────────┘ │                    │             │
         │          │             │                    │             │
 [Modifiers and Effects]     [Assets and Icons]        │             │
         │                        │                    │             │
         │        ┌──────────────┐│       ┌────────────┴─────────────┘
         │        │              ││       │
 [Modding Reference]  [Gameplay Mechanics]│
         │        │              ││       │
         └────────┼──────────────┘│       │
                  │               │       │
         [File Paths Reference]   │       │
                  │               │       │
                  └───────────────┼───────┘
                                  │
                     [Modding Guide: Civs & Leaders]
```

This diagram shows the relationships and recommended reading paths between documents, with arrows indicating logical progression or references between documents. 

## Developer Notes: Embedding external files (Docsify)

- Prefer embedding example sources instead of copy/pasting.
- Reference: Docsify Embed files [link](https://docsify.js.org/#/embed-files).
- Sites load `docsify-include-template` and a local plugin `plugins/code-slicer.js` to support line slicing.

Pattern:

```markdown
<details class="code-example">
<summary>filename.ext (excerpt)</summary>

```xml lines=1-80
%[{ relative/path/to/file.xml }]%
```
</details>
```

- Use `lines=START-END` to slice; `lines=40-` means from 40 to EOF.
- Keep paths relative to the site root so they work with `pnpm docs:all` and per-site servers.