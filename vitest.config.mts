import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(import.meta.dirname, "src"),
  "server-only": path.resolve(import.meta.dirname, "tests/helpers/empty.ts"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    environment: "node",
    testTimeout: 20000,
    hookTimeout: 30000,
    projects: [
      {
        // Pure logic: no database, no network. Runs anywhere with `npm run test:unit`.
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], setupFiles: ["tests/helpers/unit-setup.ts"] },
      },
      {
        // Route handlers and services against a fresh SQLite database for each test.
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/helpers/setup.ts"],
        },
      },
    ],
  },
});
