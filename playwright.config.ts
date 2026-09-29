import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const E2E_DB = ".data/e2e-db.json";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  // Server actions can exceed the 5s default on a busy machine or CI runner.
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Each run starts from a freshly seeded mock db, isolated from local dev data.
    command: `rm -f ${E2E_DB} && pnpm build && pnpm start --port ${PORT}`,
    // Always the mock backend and mock AI model, whatever .env.local says.
    env: { DATA_BACKEND: "mock", AI_MOCK: "1", MOCK_DB_PATH: E2E_DB, APP_URL: `http://localhost:${PORT}` },
    url: `http://localhost:${PORT}/sign-in`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
