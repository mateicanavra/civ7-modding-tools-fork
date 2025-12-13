/**
 * Gate A Continents - TypeScript Pipeline Validation
 *
 * This minimal map entry proves the TypeScript build pipeline works by
 * delegating to the base-standard Continents generator.
 *
 * Once Gate A passes (game loads without errors), the real swooper maps
 * will be migrated to TypeScript in Gate B/C.
 */

/// <reference types="@civ7/types" />

// Ensure Civ7's V8 runtime has a TextEncoder implementation before dependencies initialize.
import "@swooper/mapgen-core/polyfills/text-encoder";

// Import base-standard Continents to handle actual map generation
// This is kept external by tsup and resolved at runtime by Civ7
import "/base-standard/maps/continents.js";

// Import from our packages to verify bundling works
import { VERSION } from "@swooper/mapgen-core";
import type { EngineAdapter } from "@civ7/adapter";

// Gate A marker - proves TypeScript pipeline is working
console.log(`[Swooper] Gate A Wrapper Loaded - TypeScript Build Pipeline Working`);
console.log(`[Swooper] mapgen-core version: ${VERSION}`);

// Verify type system is working (compile-time only, no runtime effect)
const _typeCheck: EngineAdapter | null = null;
