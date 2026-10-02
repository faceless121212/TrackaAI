import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// `pnpm test:supabase` talks to the live project using the public values in .env.local.
if (process.env.SUPABASE_INTEGRATION && existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // The schema tests boot an in-memory Postgres and replay every migration in
    // beforeAll; under a parallel run on a busy machine that outgrows 10 s.
    hookTimeout: 30_000,
    include: ["src/**/*.test.{ts,tsx}"],
    // Live-Supabase tests only run via `pnpm test:supabase`.
    exclude: process.env.SUPABASE_INTEGRATION ? ["**/node_modules/**"] : ["**/node_modules/**", "**/*.integration.test.ts"],
  },
});
