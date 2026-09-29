import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue as dev user" }).click();
  await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
}

test("signed-out visitors are sent to sign-in and back to where they were going", async ({ page }) => {
  await page.goto("/somewhere?x=1");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fsomewhere%3Fx%3D1$/);
  await page.getByRole("button", { name: "Continue as dev user" }).click();
  await expect(page).toHaveURL(/\/somewhere\?x=1$/);
});

test("app is dark by default and the toggle switches to light and persists", async ({ page }) => {
  await signIn(page);
  const html = page.locator("html");
  await expect(html).toHaveClass(/\bdark\b/);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(html).not.toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(html).not.toHaveClass(/\bdark\b/);
});

test("command palette opens with the keyboard", async ({ page }) => {
  await signIn(page);
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByPlaceholder("Type a command or search…")).toBeVisible();
});

test("sign out returns to sign-in", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});
