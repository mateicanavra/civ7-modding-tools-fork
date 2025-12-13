import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/bootstrap/entry.ts",
    "src/config/index.ts",
    "src/world/index.ts",
    "src/layers/index.ts",
  ],
  format: ["esm"],
  target: "esnext",
  dts: true,
  clean: true,
  // Keep /base-standard/... external (should only come through adapter anyway)
  external: [/^\/base-standard\/.*/],
  // Bundle workspace dependencies
  noExternal: ["@civ7/types", "@civ7/adapter"],
});
