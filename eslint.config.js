import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-plugin-prettier";
import globals from "globals";

export default [
  // 1. Ignore patterns
  {
    ignores: [
      "build/**",
      "dist/**",
      "node_modules/**",
      "*.config.js",
      "*.config.ts",
      ".chromuimCache/**",
    ],
  },

  // 2. Base JS rules (ES2021 + browser)
  {
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.browser,
        chrome: "readonly",
      },
    },
  },

  // 2.1. Node.js/CommonJS files (.cjs)
  {
    files: ["**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },

  // 3. TypeScript configuration
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: 2021,
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        chrome: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "off", // TypeScript compiler handles this
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          args: "none",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // 4. React configuration
  {
    files: ["**/*.tsx", "**/*.jsx"],
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // 5. Prettier integration (must be last)
  {
    plugins: {
      prettier,
    },
    rules: {
      "prettier/prettier": "error",
      "arrow-body-style": "off",
      "prefer-arrow-callback": "off",
    },
  },

  // 6. Airbnb-style overrides
  {
    rules: {
      "no-console": ["warn", { allow: ["log", "warn", "error"] }],
      "no-plusplus": "off",
      "no-underscore-dangle": "off",
      "consistent-return": "error",
      curly: ["error", "all"],
      // Override base no-unused-vars to use TypeScript version and allow unused args in type signatures
      "no-unused-vars": "off",
    },
  },
];
