# Civilization VII Documentation Mini-Revision Plan

## Overview

This mini-revision plan focuses exclusively on reorganizing existing documentation content while establishing a directory structure that supports future expansion. The goal is to create a more intuitive organization that aligns with Civilization VII's unique mechanics without requiring the creation of new content.

## Approach

1. **Minimal Content Creation** - Focus on reorganizing existing documents rather than creating new ones
2. **Strategic Content Splitting** - Where appropriate, split larger documents into more focused components
3. **Directory Structure Setup** - Create directories that will accommodate future expansion
4. **Navigation Enhancement** - Update sidebar and cross-references to improve discoverability
5. **Documentation Guide Update** - Revise the guide to reflect new organization

## Directory Structure Changes

### Create New Directories ✅ COMPLETED

Created directories to support current reorganization and future expansion:

```
/docs/
├── guides/
│   ├── ages/           # For age-specific documentation ✅
│   ├── legacy-paths/   # For legacy path documentation (future) ✅
│   ├── legends/        # For legends system documentation (future) ✅
│   ├── learning-paths/ # For guided learning paths (future) ✅
│   ├── typescript/     # For TypeScript modding tools documentation ✅
│   └── examples/       # For example implementations (Dacia) ✅
└── reference/          # Existing reference materials
```

## Content Reorganization

### Document Relocations ✅ COMPLETED

Status of file moves:

| Current Location | New Location | Status |
|------------------|--------------|---------|
| `/docs/guides/age-modules.md` | `/docs/guides/ages/age-modules.md` | ✅ DONE |
| `/docs/guides/typescript-modding-tools.md` | `/docs/guides/typescript/typescript-overview.md` | ✅ DONE |
| `/docs/guides/typescript-modding-tools-technical.md` | `/docs/guides/typescript/typescript-technical.md` | ✅ DONE |
| `/docs/guides/dacia-civilization-ideas.md` | `/docs/guides/examples/dacia-civilization-ideas.md` | ✅ DONE |
| `/docs/guides/dacia-historical-reference.md` | `/docs/guides/examples/dacia-historical-reference.md` | ✅ DONE |
| `/docs/guides/dacia-implementation-guide.md` | `/docs/guides/examples/dacia-implementation-guide.md` | ✅ DONE |
| `/docs/guides/dacia-mechanics-alignment.md` | `/docs/guides/examples/dacia-mechanics-alignment.md` | ✅ DONE |

### Strategic Content Splitting ✅ COMPLETED

Status of content splitting:

1. **Split `/docs/guides/modding-architecture.md`**: ✅ COMPLETED
   - Created `/docs/guides/modding-architecture.md` (core concepts)
   - Extracted age-specific content to `/docs/guides/ages/age-architecture.md`

2. **Split `/docs/reference/gameplay-mechanics.md`**: ✅ COMPLETED
   - Kept core mechanics in `/docs/reference/gameplay-mechanics.md`
   - Extracted age-related mechanics to `/docs/guides/ages/age-gameplay-mechanics.md`
   - Added cross-references between the documents

3. **Split `/docs/guides/typescript-modding-tools-howto.md`**: ✅ COMPLETED
   - Create individual how-to guides in the `/docs/guides/typescript/howto/` directory:
     - ✅ `/docs/guides/typescript/howto/environment-setup.md` COMPLETED
     - ✅ `/docs/guides/typescript/howto/creating-units.md` COMPLETED
     - ✅ `/docs/guides/typescript/howto/creating-buildings.md` COMPLETED
     - ✅ `/docs/guides/typescript/howto/creating-civilizations.md` COMPLETED
     - ✅ `/docs/guides/typescript/howto/leaders-and-ages.md` COMPLETED
     - ✅ `/docs/guides/typescript/howto/unique-quarters.md` COMPLETED
     - ✅ `/docs/guides/typescript/howto/traditions.md` COMPLETED
     - ✅ `/docs/guides/typescript/howto/progression-trees.md` COMPLETED
     - ✅ `/docs/guides/typescript/howto/modifiers-and-effects.md` COMPLETED
     - ✅ `/docs/guides/typescript/howto/assets-and-icons.md` COMPLETED
     - ✅ `/docs/guides/typescript/howto/advanced-techniques.md` COMPLETED

## Navigation Updates ✅ COMPLETED

### Sidebar Updates

Update `/docs/_sidebar.md` to reflect the new organization:
- ✅ Basic structure updated with Age System section
- ✅ Added age-gameplay-mechanics.md to the Age System section
- ✅ Added TypeScript how-to guides to navigation

Target sidebar structure:

```markdown
<!-- docs/_sidebar.md -->

* [Home](/)
* [Documentation Guide](documentation-guide.md)
* Modding Guides
  * [Getting Started](/guides/getting-started.md)
  * [Modding Architecture](/guides/modding-architecture.md)
  * [Database Schemas](/guides/database-schemas.md)
  * [Base Standard Module](/guides/base-standard-module.md)
  * [Mod Patterns](/guides/mod-patterns.md)
* Age System
  * [Age Modules](/guides/ages/age-modules.md)
  * [Age Architecture](/guides/ages/age-architecture.md)
  * [Age Gameplay Mechanics](/guides/ages/age-gameplay-mechanics.md)
* Creating Content
  * [Creating Civilizations](/guides/creating-civilizations.md)
  * [Creating Leaders](/guides/creating-leaders.md)
  * [Modifying Existing Content](/guides/modifying-existing-content.md)
* TypeScript Modding Tools
  * [Overview](/guides/typescript/typescript-overview.md)
  * [Technical Implementation](/guides/typescript/typescript-technical.md)
  * How-To Guides
    * [Environment Setup](/guides/typescript/howto/environment-setup.md)
    * [Creating Units](/guides/typescript/howto/creating-units.md)
    * [Creating Buildings](/guides/typescript/howto/creating-buildings.md)
    * [Creating Civilizations](/guides/typescript/howto/creating-civilizations.md)
    * [Leaders and Ages](/guides/typescript/howto/leaders-and-ages.md)
    * [Unique Quarters](/guides/typescript/howto/unique-quarters.md)
    * [Traditions](/guides/typescript/howto/traditions.md)
    * [Progression Trees](/guides/typescript/howto/progression-trees.md)
    * [Modifiers and Effects](/guides/typescript/howto/modifiers-and-effects.md)
    * [Assets and Icons](/guides/typescript/howto/assets-and-icons.md)
    * [Advanced Techniques](/guides/typescript/howto/advanced-techniques.md)
* Dacia Civilization Example
  * [Civilization Ideas](/guides/examples/dacia-civilization-ideas.md)
  * [Historical Reference](/guides/examples/dacia-historical-reference.md)
  * [Implementation Guide](/guides/examples/dacia-implementation-guide.md)
  * [Mechanics Alignment](/guides/examples/dacia-mechanics-alignment.md)
* Reference
  * [File Paths Reference](/reference/file-paths-reference.md)
  * [Modding Reference](/reference/modding-reference.md)
  * [Gameplay Mechanics](/reference/gameplay-mechanics.md)
  * [Modding Guide: Civs & Leaders](/reference/modding-guide-civs-leaders.md)
```

## Documentation Guide Updates ✅ COMPLETED

Update `/docs/documentation-guide.md` to:
1. Reflect the new file locations and organization
2. Maintain all existing document descriptions
3. Update the document relationship map
4. Update learning paths to use the new file locations

## Implementation Steps

1. **Directory Creation** ✅ COMPLETED
   - Created all new directories in the documentation structure
   - Verified permissions and visibility

2. **Document Relocation** ✅ COMPLETED
   - Moved existing files to their new locations
   - Updated internal cross-references in moved files

3. **Content Splitting** ✅ COMPLETED
   - ✅ Split modding architecture into core and age-specific components
   - ✅ Split gameplay mechanics into core and age-specific components
   - ✅ Split the TypeScript how-to guide into individual topic-specific guides

4. **Navigation Updates** ✅ COMPLETED
   - ✅ Basic sidebar structure updated
   - ✅ Added age-gameplay-mechanics.md to navigation
   - ✅ Completed sidebar updates with TypeScript content
   - ✅ Tested all navigation links

5. **Documentation Guide Revision** ✅ COMPLETED
   - Updated the documentation guide with new file paths and organization
   - Updated the document relationship map

6. **Testing and Review** ✅ COMPLETED
   - Verified all links work correctly
   - Ensured all content is accessible through navigation
   - Checked for consistency in formatting and style

## Future Expansion Areas

This mini-revision establishes the foundation for future content creation in these key areas:

1. **Age System** - Additional documentation on age transitions and age-specific content
2. **Legacy Paths** - Framework for adding detailed legacy path documentation
3. **Legends System** - Structure for meta-progression documentation
4. **Learning Paths** - Directory for user-specific guided learning sequences

## Next Steps

1. ✅ ~~Complete the gameplay mechanics split by creating `age-gameplay-mechanics.md`~~ COMPLETED
2. ✅ ~~Split the TypeScript guide into 11 dedicated topic guides~~ COMPLETED
   - ✅ Created 11 of 11 guides
3. ✅ ~~Update navigation in the sidebar to reflect the new guides~~ COMPLETED
4. ✅ ~~Update documentation guide to reflect new organization~~ COMPLETED
5. ✅ ~~Perform final testing of all navigation and cross-references~~ COMPLETED

## Conclusion

This mini-revision achieves a more intuitive organization that aligns with Civilization VII's unique mechanics while working exclusively with existing content. The new directory structure and navigation will support future expansion as new content is developed. 