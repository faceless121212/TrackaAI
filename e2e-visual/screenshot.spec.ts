import { test } from "@playwright/test";

// The landing page's product shot: the showcase team's Engineering board, dark,
// at 2x. Five columns need ~1880px; the crop drops the empty space below.
test.use({ viewport: { width: 1880, height: 1000 }, deviceScaleFactor: 2, reducedMotion: "reduce" });

test("capture the dashboard screenshot @screenshot", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill("demo@trackaai.test");
  await page.getByLabel("Password", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "My tasks" }).waitFor();
  await page.getByRole("link", { name: "Engineering", exact: true }).last().click();
  await page.getByRole("region", { name: "Done", exact: true }).waitFor();
  await page.mouse.move(0, 999);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "public/marketing/dashboard.png", clip: { x: 0, y: 0, width: 1880, height: 680 } });
});
