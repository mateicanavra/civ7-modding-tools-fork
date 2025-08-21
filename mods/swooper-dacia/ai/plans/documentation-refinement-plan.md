# Civilization VII Documentation Refinement Plan

## Overview

This refinement plan focuses on improving the already reorganized documentation structure to enhance usability, clarity, and navigation. Building upon the successfully completed mini-revision, these changes will address specific issues and inconsistencies while maintaining the established organization and following docsify best practices.

## Current State Assessment

The documentation has been successfully reorganized according to the mini-revision plan:

1. ✅ Directory structure has been created
2. ✅ Documents have been relocated to appropriate directories
3. ✅ Large content files have been strategically split
4. ✅ Navigation has been updated
5. ✅ Documentation guide has been revised
6. ✅ All links and references have been tested

However, there are opportunities for further refinement:

## Identified Issues

1. **Redundant Content** - The original TypeScript how-to guide file exists alongside its split components
2. **Naming Inconsistency** - Similar content exists in both general guides and TypeScript-specific guides
3. **Empty Directories** - Several directories exist for future content but lack explanation
4. **Navigation Complexity** - TypeScript how-to guides could benefit from additional organization
5. **Docsify Compliance** - Some aspects of the current structure don't follow docsify best practices

## Approach

1. **Minimal Disruption** - Make focused changes that enhance usability without major reorganization
2. **Clarify Distinctions** - Ensure clear differentiation between general and TypeScript-specific guides
3. **Improve Navigation** - Add index files where helpful for navigation
4. **Maintain Consistency** - Ensure naming and file organization follows consistent patterns
5. **Follow Docsify Patterns** - Implement directory index files and proper sidebar structure according to docsify best practices

## Planned Refinements

### 1. Address Redundant TypeScript Guide

**Transform `/docs/guides/typescript-modding-tools-howto.md`**:
- Convert the existing file into a more concise bridge/overview page that:
  - Explains the purpose of the TypeScript how-to guides at a high level
  - Provides links to the dedicated TypeScript how-to section
  - Avoids duplicating detailed categorization already present in the directory index
  - Maintains existing links to ensure no broken references

### 2. Enhance TypeScript Guide Navigation

**Maintain the newly created index file for TypeScript how-to guides**:
- Keep `/docs/guides/typescript/howto/index.md` as the primary organizational tool that:
  - Serves as a landing page for TypeScript how-to content (following docsify's directory index pattern)
  - Categorizes guides by function (setup, content creation, mechanics, etc.)
  - Provides detailed contextual information about when to use which guide
  - Includes the comprehensive guide selection table

### 3. Clarify Content Distinctions

**Rename General Content Creation Guides**:
- Rename guides to clearly distinguish general guides from TypeScript-specific guides:
  - `/docs/guides/creating-civilizations.md` → `/docs/guides/general-creating-civilizations.md`
  - `/docs/guides/creating-leaders.md` → `/docs/guides/general-creating-leaders.md`
  - `/docs/guides/modifying-existing-content.md` → `/docs/guides/general-modifying-content.md`
- Update all references and the sidebar navigation to reflect these changes

### 4. Add Documentation to Empty Directories

**Create README.md files for future expansion areas**:
- Add `README.md` to empty directories explaining their purpose:
  - `/docs/guides/learning-paths/README.md`
  - `/docs/guides/legacy-paths/README.md`
  - `/docs/guides/legends/README.md`

### 5. Update Sidebar Navigation

**Revise `_sidebar.md` to create a clearer hierarchy**:
- Update the sidebar to:
  - Create a clear visual distinction between general guides and TypeScript-specific guides
  - Maintain the nested structure for TypeScript how-to guides under the main TypeScript section
  - Ensure all index pages and individual guides are properly linked
  - Follow docsify best practices for sidebar organization

## Implementation Steps

1. **Transform TypeScript How-To Overview**
   - Update the original how-to file to function as a more concise bridge/overview
   - Ensure all existing links continue to work
   - Remove unnecessary duplication of content present in the directory index

2. **Optimize Directory Index**
   - Review and refine the typescript/howto/index.md file
   - Ensure it provides comprehensive categorization and guidance
   - Verify it follows docsify landing page best practices

3. **Rename General Guides**
   - Rename the general content creation guides
   - Update sidebar links
   - Update cross-references in all affected documents

4. **Add README Files**
   - Create README.md files for empty directories
   - Explain the directory's intended purpose
   - Outline future content plans

5. **Update Sidebar Navigation**
   - Update _sidebar.md to reflect all changes
   - Implement improved hierarchy and visual organization
   - Verify all links still work correctly
   - Test navigation flow for usability

6. **Final Verification**
   - Test all changes to ensure functionality
   - Verify consistency in naming and organization
   - Ensure all links and references work correctly
   - Confirm compliance with docsify best practices

## Success Criteria

1. **Clarity** - Users can clearly distinguish between general and TypeScript-specific guides
2. **Navigation** - Index pages effectively organize and categorize related content
3. **Consistency** - File naming and organization follows consistent patterns
4. **Functionality** - All links and references continue to work correctly
5. **Forward Compatibility** - Empty directories are documented for future expansion
6. **Docsify Compliance** - Documentation structure follows docsify best practices

## Timeline

This refinement plan can be implemented immediately following the completion of the mini-revision plan, with all changes completed in a single phase.

## Conclusion

These refinements will polish the documentation structure to provide a more intuitive and navigable experience while maintaining the organization established by the mini-revision and adhering to docsify best practices. The changes focus on clarity, consistency, and usability without requiring major reorganization of the existing content. 

## References

- [Docsify Documentation](https://docsify.js.org/#/)
- [Docsify Best Practices](https://www.freecodecamp.org/news/how-to-write-good-documentation-with-docsify/) 