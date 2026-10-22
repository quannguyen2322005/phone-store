const js = require("@eslint/js");

const nodeGlobals = Object.fromEntries(
  [
    "Buffer",
    "__dirname",
    "__filename",
    "clearImmediate",
    "clearInterval",
    "clearTimeout",
    "console",
    "exports",
    "fetch",
    "global",
    "module",
    "process",
    "require",
    "setImmediate",
    "setInterval",
    "setTimeout",
    "structuredClone",
    "URL",
    "URLSearchParams",
  ].map((name) => [name, "readonly"]),
);

module.exports = [
  { ignores: ["node_modules/**", "coverage/**"] },
  {
    files: ["server.js", "src/**/*.js", "test/**/*.js"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: nodeGlobals,
    },
    rules: {
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
    },
  },
];
