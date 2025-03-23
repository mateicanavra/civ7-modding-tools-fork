# Civilization VII Modding Documentation Plan

## Overview

This document outlines the plan for restructuring our Civilization VII modding reference documentation into a more modular, task-oriented format. The goal is to create a set of interconnected documents that provide both technical reference information and practical guidance for different types of modding tasks.

## Document Structure

We will create a new `/modding` folder within the `/resources` directory to house all modding documentation. The documentation will be organized as follows:

### 1. Main Architecture Overview

**Filename:** `civ7-modding-architecture.md` ✅ COMPLETED

**Purpose:** Provide a high-level understanding of the game's architecture and modding framework.

**Key Contents:**
- Overview of Civilization VII's core architecture
- Explanation of the Ages system and its significance for modding
- Visual diagram showing relationships between game modules
- Navigation guide to other modding documents
- Core modding concepts and workflow
- General best practices for mod creation

### 2. Technical Reference Documents

These documents will provide detailed technical information about the game's internal structure.

#### 2.1 Database Schemas Reference

**Filename:** `civ7-database-schemas.md` ✅ COMPLETED

**Key Contents:**
- Core gameplay schema
- Modding framework schema
- Icon management schema
- World builder map schema
- Localization schema
- Frontend schema
- Examples of how schemas are used in practice

#### 2.2 Age Modules Reference

**Filename:** `civ7-age-modules.md` ✅ COMPLETED

**Key Contents:**
- Common age module structure
- Antiquity Age specific files and content
- Exploration Age specific files and content
- Modern Age specific files and content
- Age transitions and implementation details
- How to correctly assign content to specific ages

#### 2.3 Base-Standard Module Reference

**Filename:** `civ7-base-standard-module.md` ✅ COMPLETED

**Key Contents:**
- Core structure of the base-standard module
- Definitions folder and key definition files
- Data structure for gameplay elements
- Icon sets and assets (focusing on referencing existing ones)
- Implementation patterns common across all ages

#### 2.4 DLC and Community Mod Patterns

**Filename:** `civ7-mod-patterns.md` ✅ COMPLETED

**Key Contents:**
- Official DLC structure and implementation
- Community mod example: Scythia civilization
- Leader implementation patterns
- Civilization implementation patterns
- Integration with the Age system
- Localization implementation
- Best practices derived from existing mods

### 3. Practical Modding Guides

These documents will provide task-oriented guidance for common modding goals.

#### 3.1 Creating New Civilizations

**Filename:** `civ7-creating-civilizations.md` ✅ COMPLETED

**Key Contents:**
- Step-by-step guide for creating a new civilization
- Defining civilization types and properties
- Creating unique abilities, units, and infrastructure
- Age assignment and compatibility
- Testing and troubleshooting
- Examples from both official DLC and community mods (Scythia)

#### 3.2 Creating New Leaders

**Filename:** `civ7-creating-leaders.md` ✅ COMPLETED

**Key Contents:**
- Step-by-step guide for creating a new leader
- Defining leader types and properties
- Creating unique abilities and agendas
- Establishing leader-civilization compatibility
- Testing and troubleshooting
- Examples from official DLC

#### 3.3 Modifying Existing Content

**Filename:** `civ7-modifying-existing-content.md` 🔄 NEXT UP

**Key Contents:**
- Approaches for modifying existing civilizations and leaders
- Balancing units and buildings
- Changing gameplay mechanics
- Compatibility considerations
- Examples from community mods

#### 3.4 Using TypeScript Modding Tools

**Filename:** `civ7-typescript-modding-tools.md`

**Key Contents:**
- Setup and installation of the TypeScript modding toolkit
- Basic usage patterns and examples
- Declarative XML generation approach
- Integration with other modding workflows
- Creating a complete civilization using the toolkit
- Advanced usage techniques and customization
- Troubleshooting common issues

### 4. Reference Appendices

#### 4.1 File Paths Reference

**Filename:** `civ7-file-paths-reference.md`

**Key Contents:**
- Complete directory structure of relevant game files
- Important file locations by category
- Mod file organization best practices

## Integration and Cross-Referencing

- All documents will include links to related documents
- The architecture overview will serve as the main entry point with a comprehensive index
- Each document will begin with a brief summary and navigation options
- Code examples and file snippets will be clearly formatted and annotated

## Implementation Notes

1. **Content Reuse**: Existing content from the comprehensive `civ7-modding-reference.md` will be adapted and reorganized into the new structure
2. **Visual Assets**: For now, we'll focus on how to reference existing game assets rather than creating new ones
3. **XML Templates**: Instead of creating detailed templates, we'll point to DLCs and community mods (especially Scythia) as reference examples
4. **Community Integration**: The Scythia civilization mod will be referenced as a community example alongside the official DLC content
5. **Modding Tools Integration**: The TypeScript modding toolkit (https://github.com/izica/civ7-modding-tools) will be extensively covered as a productivity enhancement for modders

## Future Considerations

- Expanded visual asset modding guide
- XML template library
- Specialized guides for UI modding, map scripts, and gameplay systems
- Video tutorials or interactive examples

## Implementation Sequence

1. ✅ Create the `/resources/modding` directory
2. ✅ Develop the architecture overview document
3. ✅ Split existing content into technical reference documents
4. 🔄 Develop practical guides
   - ✅ Creating New Civilizations
   - ✅ Creating New Leaders
   - 🔄 Modifying Existing Content
   - 🔜 TypeScript Modding Tools
5. 🔜 Create reference appendices
6. 🔜 Verify cross-references and navigation
7. 🔜 Final review and refinement 