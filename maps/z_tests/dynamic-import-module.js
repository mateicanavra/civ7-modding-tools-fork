/**
 * Dynamic Import Test Module
 * This module is loaded via dynamic import() by dynamic-import-map.js to
 * empirically test whether the Civ VII scripting VM supports import() at runtime.
 */

export function sayHello() {
  try {
    console.log("[DYN-IMPORT-TEST][MODULE] Hello from dynamically imported module!");
  } catch (_) {
    // Swallow logging errors to avoid breaking the test
  }
}

export const INFO = Object.freeze({
  name: "dynamic-import-module",
  purpose: "Validate dynamic import capability in the map generation VM",
  version: "1.0.0",
});
