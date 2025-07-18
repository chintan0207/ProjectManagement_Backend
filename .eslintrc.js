export default {
  env: {
    node: true, // Enables Node.js globals like `process`
    es2021: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-undef": "error",
    "no-unused-vars": "warn",
    eqeqeq: "error",
    curly: "error",
    "no-unsafe-optional-chaining": "error",
    "no-implicit-coercion": "warn",
  },
};
