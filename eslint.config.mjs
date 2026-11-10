import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Leading underscore marks a value that is deliberately unused (e.g. omitted when destructuring).
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
    },
  },
  { ignores: [".next/**", "dist/**", "node_modules/**", "test-results/**", "eval-results/**", "drizzle/**", "next-env.d.ts"] },
];

export default config;
