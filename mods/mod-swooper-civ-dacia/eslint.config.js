// Flat ESLint config for the mod workspace
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  {
    ignores: [
      "**/mod/**",
      "**/dist/**",
      "node_modules/**",
      ".turbo/**",
    ],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
      globals: globals.node,
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {},
  },
];


