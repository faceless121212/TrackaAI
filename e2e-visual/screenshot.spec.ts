import { test } from "@playwright/test";

// The landing page's product shot: the showcase team's Engineering board, dark,
// at 2x. Five columns need ~1880px; the crop drops the empty space below.
test.use({ deviceScaleFactor: 2, reducedMotion: "reduce" });

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill("demo@trackaai.test");
  await page.getByLabel("Password", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "My tasks" }).waitFor();
}

test("capture the dashboard screenshot @screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1880, height: 1000 });
  await signIn(page);
  await page.getByRole("link", { name: "Engineering", exact: true }).last().click();
  await page.getByRole("region", { name: "Done", exact: true }).waitFor();
  await page.mouse.move(0, 999);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "public/marketing/dashboard.png", clip: { x: 0, y: 0, width: 1880, height: 680 } });
});

// The laptop screen in "How it works": Ask AI answering "What's urgent?" (mock model).
test("capture the Ask AI screenshot @screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page);
  await page.getByRole("link", { name: "Ask AI" }).click();
  await page.getByRole("button", { name: "What's urgent?" }).click();
  const log = page.getByRole("log", { name: "Ask AI conversation" });
  await log.getByRole("link").first().waitFor();
  await page.locator('[role="log"][aria-busy="false"]').waitFor();
  await page.mouse.move(0, 799);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "public/marketing/ask-ai.png" });
});
