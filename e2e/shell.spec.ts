import { expect, test } from "@playwright/test";
import { DEMO, fillSignIn, signInAsDemo } from "./helpers";

test("signed-out visitors are sent to sign-in and back to where they were going", async ({ page }) => {
  await page.goto("/acme?x=1");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Facme%3Fx%3D1$/);
  await fillSignIn(page, DEMO.email, DEMO.password);
  await expect(page).toHaveURL(/\/acme\?x=1$/);
});

test("app is dark by default and the toggle switches to light and persists", async ({ page }) => {
  await signInAsDemo(page);
  const html = page.locator("html");
  await expect(html).toHaveClass(/\bdark\b/);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(html).not.toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(html).not.toHaveClass(/\bdark\b/);
});

test("command palette opens with the keyboard and jumps to a board", async ({ page }) => {
  await signInAsDemo(page);
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByPlaceholder("Type a command or search…")).toBeVisible();
  await page.getByRole("option", { name: "Engineering" }).click();
  await expect(page).toHaveURL(/\/acme\/board\//);
  await expect(page.getByRole("region", { name: "Backlog" })).toContainText("ENG-1");
});

test("sign out returns to sign-in", async ({ page }) => {
  await signInAsDemo(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});
