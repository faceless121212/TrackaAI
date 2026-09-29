import { expect, type Page } from "@playwright/test";

// Mirrors DEMO_USER in src/server/data/mock/seed.ts.
export const DEMO = { email: "demo@trackaai.test", password: "demo-password" };

export function uniqueId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function fillSignIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signInAsDemo(page: Page) {
  await page.goto("/sign-in");
  await fillSignIn(page, DEMO.email, DEMO.password);
  await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
}

/** Signs up a fresh user and waits for onboarding step 1. Returns the unique id used. */
export async function signUp(page: Page) {
  const id = uniqueId();
  await page.goto("/sign-up");
  await page.getByLabel("Name", { exact: true }).fill(`User ${id}`);
  await page.getByLabel("Email", { exact: true }).fill(`user-${id}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Create your team" })).toBeVisible();
  return id;
}

/** From onboarding step 1, creates a team and an "Engineering" workspace; stops at the invite step. */
export async function createTeamAndWorkspace(page: Page, teamName: string) {
  await page.getByLabel("Team name", { exact: true }).fill(teamName);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Create your first workspace" })).toBeVisible();
  await page.getByLabel("Workspace name", { exact: true }).fill("Engineering");
  await expect(page.getByLabel("Key prefix", { exact: true })).toHaveValue("ENG");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Invite your teammates" })).toBeVisible();
}
