import { defineConfig } from "tsup";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { Plugin } from "esbuild";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const typeboxFormatShim = join(__dirname, "src/shims/typebox-format.ts");

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
  tsconfig: "tsconfig.json",
  // Include polyfills first so downstream bundles pick them up before any imports that rely on them.
  entry: [
    "src/polyfills/text-encoder.ts",
    "src/index.ts",
    "src/engine/index.ts",
    "src/authoring/index.ts",
    "src/compiler/normalize.ts",
    "src/compiler/recipe-compile.ts",
    "src/lib/math/index.ts",
    "src/lib/grid/index.ts",
    "src/lib/heightfield/index.ts",
    "src/lib/plates/index.ts",
    "src/lib/rng/index.ts",
    "src/lib/noise/index.ts",
    "src/lib/collections/index.ts",
    "src/lib/mesh/index.ts",
  ],
  format: ["esm"],
  target: "esnext",
  dts: true,
  clean: true,
  // Keep /base-standard/... external (should only come through adapter anyway)
  external: [/^\/base-standard\/.*/],
  // Bundle workspace dependencies
  noExternal: ["@civ7/types", "@civ7/adapter", "typebox"],
  esbuildOptions(options) {
    // Shim TypeBox format registry to avoid Unicode regexes (Civ7 V8 cannot parse them) — built-in format validation is disabled.
    options.alias = {
      "typebox/format": typeboxFormatShim,
    };
  },
  esbuildPlugins: [typeboxFormatPlugin],
});
