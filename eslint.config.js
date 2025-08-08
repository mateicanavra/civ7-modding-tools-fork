// Flat config for ESLint v9
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" }
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {}
  },
  {
    ignores: ["dist/**", "out/**", ".turbo/**", "node_modules/**"]
  }
];


