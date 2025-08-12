// Flat config for ESLint v9
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  {
    ignores: [
      "**/dist/**",
      "out/**",
      ".turbo/**",
      "node_modules/**",
      "docs/civ7-official/resources/**"
    ]
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
      globals: globals.node
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {}
  }
];


