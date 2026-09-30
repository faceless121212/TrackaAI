import { defineConfig, devices } from "@playwright/test";

// Live smoke test against a running server on the Supabase backend (with real
// AI calls). Start one first, e.g. `pnpm build && pnpm start`, then:
//   SMOKE_URL=http://localhost:3000 pnpm test:smoke
// It signs in as the seeded demo account, needs its team on Pro, and removes
// everything it creates.
export default defineConfig({
  testDir: "./e2e-live",
  timeout: 420_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: "list",
  use: { baseURL: process.env.SMOKE_URL ?? "http://localhost:3000", trace: "retain-on-failure", ...devices["Desktop Chrome"] },
});
