import { defineConfig } from "tsup";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { Plugin } from "esbuild";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
// Reuse mapgen-core’s TypeBox format shim to avoid Unicode regexes in Civ7’s V8 (built-in format validation is disabled).
const typeboxFormatShim = join(__dirname, "../../packages/mapgen-core/src/shims/typebox-format.ts");
const typeboxGuardEmitShim = join(__dirname, "../../packages/mapgen-core/src/shims/typebox-guard-emit.ts");
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
    build.onResolve({ filter: /(^|[/\\])emit\.mjs$/ }, (args) => {
      if (
        args.path.endsWith("emit.mjs") &&
        (args.importer.includes("/typebox/build/guard/") || args.importer.includes("\\typebox\\build\\guard\\"))
      ) {
        return { path: typeboxGuardEmitShim };
      }
      return null;
    });
  },
};

export default defineConfig({
  // Entry points for mod maps
  entry: [
    "src/maps/swooper-desert-mountains.ts",
    "src/maps/swooper-earthlike.ts",
    "src/maps/shattered-ring.ts",
    "src/maps/sundered-archipelago.ts",
  ],

  // Output directly to the structure the .modinfo expects
  outDir: "mod/maps",

  format: ["esm"],
  target: "esnext",

  // Bundle all dependencies into the output file
  bundle: true,
  // Avoid shared chunks: Civ7 MapGeneration script loader may not resolve mod-local relative imports.
  splitting: false,
  // Bundle node_modules deps too (Civ7 cannot resolve bare specifiers like "typebox" at runtime).
  skipNodeModulesBundle: false,

  // Clear mod/maps between builds to avoid stale chunks.
  clean: true,

  // CRITICAL: Keep /base-standard/... imports external
  // These are resolved at runtime by the Civ7 game engine
  external: [/^\/base-standard\/.*/],

  // Force bundling of our workspace packages
  noExternal: ["@swooper/mapgen-core", "@civ7/adapter", "typebox"],

  esbuildOptions(options) {
    // Shim TypeBox format registry so no Unicode-property regexes reach the game engine (built-in format validation disabled).
    options.splitting = false;
    options.target = "esnext";
    // If tsup auto-externalizes deps, ensure TypeBox is bundled (MapGeneration cannot resolve "typebox").
    options.external = (options.external ?? []).filter((id) => !id.startsWith("typebox"));
    options.alias = {
      "typebox/format": typeboxFormatShim,
    };
  },
  esbuildPlugins: [typeboxFormatPlugin],

  // Civ7 doesn't use source maps
  sourcemap: false,
  minify: false,
});
