import { defineConfig, devices } from "@playwright/test";

// Marketing tooling against the "showcase" seed (a fuller demo team):
//   pnpm screenshot   — retakes public/marketing/dashboard.png
//   pnpm test:visual  — pixel snapshots of / and /pricing at three widths
// Local only (not CI): font rendering differs between macOS and Linux.
const PORT = 3500;
const DB = ".data/showcase-db.json";

export default defineConfig({
  testDir: "./e2e-visual",
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, colorScheme: "dark" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  webServer: {
    command: `rm -f ${DB} && pnpm build && pnpm start --port ${PORT}`,
    env: {
      DATA_BACKEND: "mock",
      MOCK_SEED: "showcase",
      MOCK_DB_PATH: DB,
      AI_MOCK: "1",
      APP_URL: `http://localhost:${PORT}`,
    },
    url: `http://localhost:${PORT}/sign-in`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
