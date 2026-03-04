import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";

export default [
  {ignores: ["dist/**", "node_modules/**"]},
  {files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } }, globals: globals.browser }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  pluginReactConfig,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    rules: {
      // Add any specific rules or overrides here
    },
  },
];
