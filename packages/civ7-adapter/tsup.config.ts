import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/civ7-adapter.ts", "src/mock-adapter.ts"],
  format: ["esm"],
  target: "esnext",
  dts: true,
  clean: true,
  // CRITICAL: Keep /base-standard/... imports external
  // These are resolved at runtime by the Civ7 game engine
  external: [/^\/base-standard\/.*/],
  // Bundle our workspace dependencies
  noExternal: ["@civ7/types"],
});
