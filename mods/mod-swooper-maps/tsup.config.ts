import { defineConfig } from "tsup";

export default defineConfig({
  // Entry point for the Gate A validation map
  entry: ["src/gate-a-continents.ts"],

  // Output directly to the structure the .modinfo expects
  outDir: "mod/maps",

  format: ["esm"],
  target: "esnext",

  // Bundle all dependencies into the output file
  bundle: true,

  // Do NOT clear the directory - preserve existing JS files and XML
  clean: false,

  // CRITICAL: Keep /base-standard/... imports external
  // These are resolved at runtime by the Civ7 game engine
  external: [/^\/base-standard\/.*/],

  // Force bundling of our workspace packages
  noExternal: ["@swooper/mapgen-core", "@civ7/adapter"],

  // Civ7 doesn't use source maps
  sourcemap: false,
  minify: false,
});
