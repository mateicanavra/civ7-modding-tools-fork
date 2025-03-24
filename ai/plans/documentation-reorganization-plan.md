# Civilization VII Documentation Reorganization Plan

## Overview

This document outlines the plan for reorganizing and optimizing the Civilization VII modding documentation structure. Civilization VII introduces revolutionary gameplay changes including the Ages system, Legacy Paths, and meta-progression through Legends. These fundamental changes to the Civilization formula require a documentation approach that clearly addresses the unique modding challenges they present while remaining accessible to both new and experienced modders.

## Overarching Goals

The reorganized documentation should serve as a comprehensive resource that:

1. **Addresses Unique Civ VII Mechanics** - Clearly explains how to mod within the context of:
   - The three-Age structure (Antiquity, Exploration, Modern) and age transitions
   - Legacy Paths and their progression systems
   - The Legends meta-progression system
   - Streamlined city management and empire building
   - Leader persistence across ages with different civilizations

2. **Provides Clear Learning Paths** - Creates intuitive documentation flows for:
   - Complete beginners to Civ modding
   - Experienced Civ V/VI modders transitioning to Civ VII
   - Technical modders focusing on advanced systems
   - Content creators primarily interested in adding civilizations/leaders

3. **Follows Documentation Best Practices**:
   - Progressive disclosure of complexity (simple concepts first, advanced later)
   - Consistent formatting and terminology
   - Comprehensive cross-referencing between related documents
   - Clear examples that demonstrate concepts in practice
   - Reference materials that are complete and well-organized

## Objectives

- Improve documentation organization and navigation to account for Civ VII's unique modding requirements
- Create clearer user pathways through the documentation based on modder experience and goals
- Ensure consistent formatting and style across all documents
- Identify and fill content gaps, particularly around Age-specific modding and the Legends system
- Provide clear, practical examples of modding within the new Civ VII framework
- Build documentation that scales as the game evolves with DLC and expansions

## Tasks

1. Review current documentation structure against Civ VII's unique mechanics
2. Identify opportunities for improvement and content gaps
3. Implement changes to organization and navigation
4. Test documentation flow and usability
5. Create new content to address identified gaps

## Implementation Details

### 1. Documentation Structure Refinements

Based on our review of the current documentation and Civilization VII's unique mechanics, we'll implement the following structural refinements:

#### 1.1 Core Documentation Categories

Maintain the existing categories with some refinements:

- **Introductory Guides** - Keep in `/docs/guides/` with clear entry points
- **Architecture & Framework** - Enhance with Civ VII-specific architectural documentation
- **Content Creation** - Expand with age-specific content creation guides
- **TypeScript Modding Tools** - Enhance with more examples for Civ VII mechanics
- **Example Implementation** - Maintain the Dacia example but add age transition examples
- **Reference Materials** - Expand with comprehensive mechanics reference

#### 1.2 New Documentation Categories

Add new categories to address unique Civ VII mechanics:

- **Age System Guides** - Dedicated section for age-specific modding
  - Location: `/docs/guides/ages/`
  - Key files:
    - `age-transition-events.md` - Modding age transition triggers and effects
    - `age-specific-content.md` - Creating content that changes across ages
    - `age-persistence.md` - Managing persistent elements across ages

- **Legacy Paths Documentation** - Resources for the progression system
  - Location: `/docs/guides/legacy-paths/`
  - Key files:
    - `legacy-path-creation.md` - Creating custom legacy paths
    - `legacy-rewards.md` - Implementing progression rewards
    - `legacy-integration.md` - Integrating legacy paths with other mechanics

- **Legends System Documentation** - Meta-progression documentation
  - Location: `/docs/guides/legends/`
  - Key files:
    - `legends-framework.md` - Understanding the meta-progression system
    - `custom-legends.md` - Creating custom legend entries
    - `legend-triggers.md` - Events and conditions for legend creation

### 2. Content Gaps to Address

Our review identified several key content gaps that need to be filled:

#### 2.1 Age-Specific Modding

Create comprehensive documentation for age-specific modding challenges:

- **Age Transition Modding** - How to mod content that changes between ages
- **Age-Specific Balance** - Guidelines for balancing content across ages
- **Age-Sensitive Resources** - Documentation for resources that transform across ages

#### 2.2 Legacy Paths

Develop detailed documentation for the Legacy Path system:

- **Legacy Path Structure** - Technical documentation on data structures
- **Legacy UI Integration** - UI modding for custom legacy paths
- **Legacy Path Testing** - Guidelines for testing progression systems

#### 2.3 Legends System

Create documentation for the meta-progression Legends system:

- **Legend Triggers** - How to create conditions that generate legends
- **Legend Effects** - Implementing effects for legend achievements
- **Legend Persistence** - Managing legend data across gameplay sessions

#### 2.4 Leader Persistence

Add documentation for leader continuity across ages:

- **Leader Transition** - How leaders persist while civilizations change
- **Leader Adaptation** - Implementing age-specific leader behaviors
- **Historical Authenticity** - Guidelines for historical accuracy across ages

### 3. New Documentation Sections

Based on the identified gaps, we'll create these specific new documentation files:

#### 3.1 Core Mechanics Documentation

- `/docs/reference/age-system-reference.md` - Comprehensive reference for the age system
- `/docs/reference/legacy-paths-reference.md` - Technical reference for legacy paths
- `/docs/reference/legends-reference.md` - Technical reference for the legends system

#### 3.2 Tutorial and How-To Content

- `/docs/guides/age-transition-modding.md` - Tutorial for creating age transition effects
- `/docs/guides/legacy-path-creation.md` - How to create custom legacy paths
- `/docs/guides/leader-persistence.md` - Guide for implementing persistent leaders

#### 3.3 Learning Path Documentation

- `/docs/guides/learning-paths/beginners-path.md` - Guided learning sequence for beginners
- `/docs/guides/learning-paths/technical-path.md` - Guided sequence for technical modders
- `/docs/guides/learning-paths/content-creator-path.md` - Sequence for content creators
- `/docs/guides/learning-paths/civ-veteran-path.md` - Path for experienced Civ V/VI modders

### 4. Navigation Structure Changes

To improve user experience, we'll implement these navigation enhancements:

#### 4.1 Sidebar Updates

Update `/docs/_sidebar.md` to include new categories:

```markdown
<!-- docs/_sidebar.md -->

* [Home](/)
* [Documentation Guide](documentation-guide.md)
* Modding Guides
  * [Getting Started](/guides/getting-started.md)
  * [Modding Architecture](/guides/modding-architecture.md)
  * [Database Schemas](/guides/database-schemas.md)
  * [Base Standard Module](/guides/base-standard-module.md)
  * [Age Modules](/guides/age-modules.md)
  * [Mod Patterns](/guides/mod-patterns.md)
* Age System
  * [Age Transition Modding](/guides/ages/age-transition-events.md)
  * [Age-Specific Content](/guides/ages/age-specific-content.md)
  * [Age Persistence](/guides/ages/age-persistence.md)
* Legacy Paths
  * [Legacy Path Creation](/guides/legacy-paths/legacy-path-creation.md)
  * [Legacy Rewards](/guides/legacy-paths/legacy-rewards.md)
  * [Legacy Integration](/guides/legacy-paths/legacy-integration.md)
* Legends System
  * [Legends Framework](/guides/legends/legends-framework.md)
  * [Custom Legends](/guides/legends/custom-legends.md)
  * [Legend Triggers](/guides/legends/legend-triggers.md)
* Creating Content
  * [Creating Civilizations](/guides/creating-civilizations.md)
  * [Creating Leaders](/guides/creating-leaders.md)
  * [Modifying Existing Content](/guides/modifying-existing-content.md)
  * [Leader Persistence](/guides/leader-persistence.md)
* TypeScript Modding Tools
  * [Overview](/guides/typescript-modding-tools.md)
  * [How-To Guide](/guides/typescript-modding-tools-howto.md)
  * [Technical Implementation](/guides/typescript-modding-tools-technical.md)
* Dacia Civilization Example
  * [Civilization Ideas](/guides/dacia-civilization-ideas.md)
  * [Historical Reference](/guides/dacia-historical-reference.md)
  * [Implementation Guide](/guides/dacia-implementation-guide.md)
  * [Mechanics Alignment](/guides/dacia-mechanics-alignment.md)
* Learning Paths
  * [Beginner's Path](/guides/learning-paths/beginners-path.md)
  * [Technical Modder's Path](/guides/learning-paths/technical-path.md)
  * [Content Creator's Path](/guides/learning-paths/content-creator-path.md)
  * [Civ Veteran's Path](/guides/learning-paths/civ-veteran-path.md)
* Reference
  * [File Paths Reference](/reference/file-paths-reference.md)
  * [Modding Reference](/reference/modding-reference.md)
  * [Gameplay Mechanics](/reference/gameplay-mechanics.md)
  * [Modding Guide: Civs & Leaders](/reference/modding-guide-civs-leaders.md)
  * [Age System Reference](/reference/age-system-reference.md)
  * [Legacy Paths Reference](/reference/legacy-paths-reference.md)
  * [Legends Reference](/reference/legends-reference.md)
```

#### 4.2 Documentation Guide Updates

Update `/docs/documentation-guide.md` to include descriptions of new documents and updated relationship maps.

#### 4.3 Cross-Referencing

Enhance internal linking between related documents, particularly:
- Link age-specific content to relevant civilization creation guides
- Connect legacy path documentation with leader and civilization guides
- Ensure legends documentation is linked to relevant gameplay mechanics

### 5. Implementation Timeline and Priorities

We'll implement these changes according to the following timeline:

#### 5.1 Phase 1: Foundation (Weeks 1-2)
- Create directory structure for new documentation categories
- Develop templates for new document types
- Update navigation structure
- Revise existing documentation guide

#### 5.2 Phase 2: Core Mechanics Documentation (Weeks 3-5)
- Create age system documentation
- Develop legacy paths documentation
- Build legends system documentation
- Update reference materials

#### 5.3 Phase 3: Learning Paths and Integration (Weeks 6-8)
- Create learning path guides
- Enhance cross-referencing between documents
- Develop leader persistence documentation
- Update the Dacia example with age-specific examples

#### 5.4 Phase 4: Review and Refinement (Weeks 9-10)
- Test documentation flow and usability
- Refine content based on review
- Finalize cross-references and navigation
- Prepare for publication

### 6. Success Metrics

We'll measure the success of this documentation reorganization by:

- **Completion of Documentation Coverage** - All identified gaps filled
- **Navigation Efficiency** - Users can find relevant docs in 3 clicks or less
- **Learning Path Clarity** - Clear progression through docs for each user type
- **Cross-Reference Completeness** - All related documents properly linked
- **Consistency** - Uniform formatting and terminology throughout

## Next Steps

1. Create directory structure for new documentation categories
2. Develop templates for new document types
3. Begin updating the navigation structure
4. Revise the documentation guide with new content
