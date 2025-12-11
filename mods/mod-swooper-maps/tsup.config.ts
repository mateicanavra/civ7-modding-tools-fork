import { defineConfig } from "tsup";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { Plugin } from "esbuild";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
// Reuse mapgen-core’s TypeBox format shim to avoid Unicode regexes in Civ7’s V8 (built-in format validation is disabled).
const typeboxFormatShim = join(__dirname, "../packages/mapgen-core/src/shims/typebox-format.ts");
const typeboxFormatPlugin: Plugin = {
  name: "typebox-format-shim",
  setup(build) {
    build.onResolve({ filter: /^typebox\/format$/ }, () => ({ path: typeboxFormatShim }));
    build.onResolve({ filter: /format[/\\]index\.mjs$/ }, (args) => {
      if (args.importer.includes("/typebox/") || args.importer.includes("\\typebox\\")) {
        return { path: typeboxFormatShim };
      }
      return null;
    });
  },
};

export default defineConfig({
  // Entry points for mod maps
  entry: [
    "src/gate-a-continents.ts",
    "src/swooper-desert-mountains.ts",
  ],

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

  esbuildOptions(options) {
    // Shim TypeBox format registry so no Unicode-property regexes reach the game engine (built-in format validation disabled).
    options.alias = {
      "typebox/format": typeboxFormatShim,
    };
  },
  esbuildPlugins: [typeboxFormatPlugin],

  // Civ7 doesn't use source maps
  sourcemap: false,
  minify: false,
});
