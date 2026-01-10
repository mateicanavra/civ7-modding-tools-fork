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
  },
  {
    files: ["mods/**/src/**/*.ts"],
    ignores: ["mods/**/src/domain/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@mapgen/domain/*/ops/*"],
              message: "Import domain ops via the domain entrypoint surface."
            }
          ]
        }
      ]
    }
  },
  {
    files: [
      "mods/**/src/recipes/**/stages/**/steps/**/*.ts",
      "mods/**/src/domain/**/ops/**/strategies/**/*.ts"
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@sinclair/typebox/value",
              message: "Runtime layers must not use TypeBox Value.*; use compile-time normalization."
            },
            {
              name: "@sinclair/typebox/compiler",
              message: "Runtime layers must not use TypeBox TypeCompiler; use compile-time normalization."
            },
            {
              name: "@swooper/mapgen-core/compiler/normalize",
              message: "Runtime layers must not import compiler normalization helpers."
            },
            {
              name: "@swooper/mapgen-core/authoring/validation",
              message: "Runtime validation surfaces are forbidden; rely on compile-time normalization."
            },
            {
              name: "@swooper/mapgen-core/authoring/op/validation-surface",
              message: "Runtime validation surfaces are forbidden; rely on compile-time normalization."
            }
          ],
          patterns: [
            {
              group: ["@mapgen/domain/*/ops/*"],
              message: "Import domain ops via the domain entrypoint surface."
            }
          ]
        }
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='runValidated']",
          message: "Runtime layers must not call runValidated; use compile-time normalization."
        },
        {
          selector: "MemberExpression[property.name='runValidated']",
          message: "Runtime layers must not call runValidated; use compile-time normalization."
        },
        {
          selector: "VariableDeclarator[id.name='clamp01']",
          message: "Use clamp01 from @swooper/mapgen-core."
        },
        {
          selector: "FunctionDeclaration[id.name='clamp01']",
          message: "Use clamp01 from @swooper/mapgen-core."
        },
        {
          selector: "VariableDeclarator[id.name='clampChance']",
          message: "Use clampChance from @swooper/mapgen-core."
        },
        {
          selector: "FunctionDeclaration[id.name='clampChance']",
          message: "Use clampChance from @swooper/mapgen-core."
        },
        {
          selector: "VariableDeclarator[id.name='normalizeRange']",
          message: "Use normalizeRange from @swooper/mapgen-core."
        },
        {
          selector: "FunctionDeclaration[id.name='normalizeRange']",
          message: "Use normalizeRange from @swooper/mapgen-core."
        },
        {
          selector: "VariableDeclarator[id.name='rollPercent']",
          message: "Use rollPercent from @swooper/mapgen-core."
        },
        {
          selector: "FunctionDeclaration[id.name='rollPercent']",
          message: "Use rollPercent from @swooper/mapgen-core."
        }
      ]
    }
  },
  {
    files: [
      "mods/**/src/domain/**/ops/**/*.contract.ts",
      "mods/**/src/recipes/**/steps/**/*.contract.ts"
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Property[key.name='default'][value.type='ObjectExpression'][value.properties.length=0]",
          message: "Do not use empty object defaults in schema definitions; rely on property defaults."
        }
      ]
    }
  }
];
