module.exports = {
  extends: ["expo"],
  plugins: ["import", "react-hooks", "react"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  globals: {
    AbortController: "readonly",
    DOMException: "readonly",
    URLSearchParams: "readonly",
  },
  rules: {
    // Relax rules that clash with the existing codebase style
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "react/prop-types": "off",
    "react-hooks/exhaustive-deps": "off",
    "import/order": "off",
    // False positives with some Expo/RN namespace exports
    "import/namespace": "off",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
