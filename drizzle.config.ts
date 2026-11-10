import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle-sqlite",
  dialect: "sqlite",
  dbCredentials: { url: process.env.DATABASE_PATH || ".truedraft/truedraft.sqlite" },
  strict: true,
});
