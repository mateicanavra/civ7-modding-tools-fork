# Getting Started with Civilization VII Modding

This guide will help you set up your environment for Civilization VII modding and understand the basic concepts.

## Prerequisites

Before you begin modding Civilization VII, make sure you have:

- Civilization VII game installed
- Basic knowledge of programming concepts
- A text editor or IDE (Visual Studio Code is recommended)
- Node.js installed (version 14 or later) for TypeScript-based modding

## Setting Up Your Environment

1. **Install Required Tools**
   - Install [Visual Studio Code](https://code.visualstudio.com/)
   - Install [Node.js](https://nodejs.org/) (for TypeScript modding)
   - Install [Git](https://git-scm.com/) for version control

2. **Set Up a Modding Project**
   ```bash
   # Create a new directory for your mod
   mkdir my-civ7-mod
   cd my-civ7-mod
   
   # Initialize a Git repository
   git init
   
   # Create a basic structure
   mkdir -p src assets
   touch README.md
   ```

3. **Install TypeScript Modding Tools**
   ```bash
   npm init -y
   npm install civ7-modding-tools typescript ts-node
   ```

## Understanding Mod Structure

A typical Civilization VII mod consists of:

- **XML files**: Define game entities like units, buildings, civilizations
- **SQL files**: Modify database entries
- **Lua scripts**: Add custom functionality
- **Assets**: Graphics, sounds, and other media files

Using the TypeScript tools, you can define these in a more structured way.

## Creating Your First Mod

Create a basic mod with the TypeScript tools:

```typescript
import { Mod } from 'civ7-modding-tools';

// Create a new mod
const mod = new Mod({
    id: 'my-first-mod',
    version: '1.0',
});

// Add components to the mod (we'll do this in later sections)
// mod.add([...]);

// Build the mod
mod.build('./dist');
```

Run this with:
```bash
npx ts-node src/index.ts
```

## Where to Go Next

After completing this guide, you should explore:

- [Modding Architecture](/guides/modding-architecture.md): Understand how mods work
- [General: Creating Civilizations](/guides/general-creating-civilizations.md): Create your first civilization
- [TypeScript Modding Tools](/guides/typescript/typescript-overview.md): Learn the modding tools in depth

## Further Learning

Once you've completed this guide, consider exploring these resources:

- [Modding Architecture](/guides/modding-architecture.md): Learn about the architectural components of mods
- [Database Schemas](/guides/database-schemas.md): Study the database schema for modding
- [General: Creating Civilizations](/guides/general-creating-civilizations.md): Create your first civilization
- [TypeScript How-To Guides](/guides/typescript/howto/index.md): Explore the TypeScript modding tools 