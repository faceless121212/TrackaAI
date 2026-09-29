import { expect, test } from "@playwright/test";
import { DEMO, fillSignIn, uniqueId } from "./helpers";

test("a wrong password shows an error", async ({ page }) => {
  await page.goto("/sign-in");
  await fillSignIn(page, DEMO.email, "wrong-password");
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(DEMO.email);
});

test("sign-up validates the password and keeps the other fields", async ({ page }) => {
  const email = `ada-${uniqueId()}@example.test`;
  await page.goto("/sign-up");
  await page.getByLabel("Name", { exact: true }).fill("Ada");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 8 characters")).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
});

test("sign-up rejects an email that is already registered", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Name", { exact: true }).fill("Copycat");
  await page.getByLabel("Email", { exact: true }).fill(DEMO.email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("An account with this email already exists")).toBeVisible();
});

test("a stale session cookie is cleared instead of looping", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "tracka_session", value: "ghost.1.bad", url: baseURL! }]);
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  expect((await context.cookies()).some((c) => c.name === "tracka_session")).toBe(false);
});
