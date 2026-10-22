import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const browserGlobals = Object.fromEntries(
  [
    "AbortController",
    "Blob",
    "CustomEvent",
    "DOMException",
    "Event",
    "FileReader",
    "FormData",
    "HTMLElement",
    "HTMLImageElement",
    "IntersectionObserver",
    "Intl",
    "MutationObserver",
    "ResizeObserver",
    "URL",
    "URLSearchParams",
    "alert",
    "cancelAnimationFrame",
    "clearInterval",
    "clearTimeout",
    "console",
    "document",
    "fetch",
    "history",
    "localStorage",
    "location",
    "matchMedia",
    "navigator",
    "performance",
    "requestAnimationFrame",
    "sessionStorage",
    "setInterval",
    "setTimeout",
    "structuredClone",
    "window",
  ].map((name) => [name, "readonly"]),
);

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  {
    files: ["src/**/*.{js,jsx}", "scripts/**/*.mjs", "vite.config.js"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      // Dự án không dùng PropTypes và không được thêm thư viện ngoài danh sách; JSX/runtime vẫn được kiểm tra.
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
];
