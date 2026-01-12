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
            },
            {
              group: [
                "@mapgen/domain/*/ops-by-id",
                "@mapgen/domain/*/rules/*",
                "@mapgen/domain/*/strategies/*",
              ],
              message:
                "Do not deep-import internal domain modules; import from stable public surfaces."
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
      "mods/**/src/recipes/**/stages/**/steps/**/contract.ts",
      "mods/**/src/recipes/**/stages/**/steps/**/*.contract.ts"
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@mapgen/domain/*/*"],
              message:
                "Step contracts must import only from @mapgen/domain/<domain> (no deep imports, no /ops)."
            },
            {
              group: ["@mapgen/domain/*/ops", "@mapgen/domain/*/ops/*"],
              message:
                "Step contracts must never import runtime ops; import contracts from @mapgen/domain/<domain>."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["mods/**/src/recipes/**/recipe.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@mapgen/domain/*"],
              message:
                "Recipe compilation must import domain runtime ops from @mapgen/domain/<domain>/ops (not the contract entrypoint)."
            }
          ]
        }
      ]
    }
  },
  {
    files: [
      "mods/**/src/recipes/**/stages/**/steps/**/contract.ts",
      "mods/**/src/recipes/**/stages/**/steps/**/*.contract.ts",
      "mods/**/src/domain/**/ops/**/contract.ts",
      "mods/**/src/domain/**/ops/**/types.ts",
      "mods/**/src/domain/**/ops/**/index.ts",
      "mods/**/src/domain/**/ops/**/rules/**/*.ts",
      "mods/**/src/domain/**/ops/**/strategies/**/*.ts"
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportAllDeclaration:not([exportKind='type'])",
          message:
            "Do not use value `export *` in contract/public-surface files; use named exports. (`export type *` is OK.)"
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
