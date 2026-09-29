import { expect, type Browser, type Locator, type Page } from "@playwright/test";

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

/** Signs up a fresh user with their own team and lands on its empty "Engineering" board (keys ENG-n). */
export async function openFreshBoard(page: Page) {
  const id = await signUp(page);
  await createTeamAndWorkspace(page, `Team ${id}`);
  await page.getByRole("link", { name: "Skip for now" }).click();
  await expect(page.getByRole("region", { name: "Backlog" })).toBeVisible();
  return id;
}

export const column = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

/** Adds a task at the top of a column and waits until the server has assigned its key. */
export async function quickAdd(page: Page, columnName: string, title: string) {
  await page.getByRole("button", { name: `Add task to ${columnName}` }).click();
  const input = page.getByLabel(`New task in ${columnName}`);
  await input.fill(title);
  await input.press("Enter");
  await input.press("Escape");
  await expect(column(page, columnName).getByRole("article").filter({ hasText: title })).toContainText(/ENG-\d+/);
}

/** Drags with real pointer events (dnd-kit needs movement past its 5px activation distance). */
export async function drag(page: Page, from: Locator, to: Locator, offsetY = 60) {
  const source = (await from.boundingBox())!;
  const target = (await to.boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2 + 10, source.y + source.height / 2, { steps: 5 });
  await page.mouse.move(target.x + target.width / 2, target.y + offsetY, { steps: 20 });
  await page.mouse.up();
}

/** Waits until the board has no mutation in flight (it sets aria-busy while saving). */
export async function saved(page: Page) {
  await expect(page.locator('[data-slot="board"]')).toHaveAttribute("aria-busy", "false");
}

/** Opens a settings tab of the current team from the sidebar. */
export async function openSettings(page: Page, tab: "General" | "Members" | "Labels" | "Profile") {
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("navigation", { name: "Settings" }).getByRole("link", { name: tab }).click();
  await expect(page.getByRole("link", { name: tab, exact: true })).toHaveAttribute("aria-current", "page");
}

/** Invites a fresh email from the members page; returns it with the invite link (emails arrive in M5). */
export async function inviteTeammate(owner: Page, role: "Member" | "Admin" = "Member") {
  await openSettings(owner, "Members");
  const email = `mate-${uniqueId()}@example.test`;
  await owner.getByLabel("Email addresses").fill(email);
  if (role === "Admin") {
    await owner.getByRole("combobox", { name: "Role" }).click();
    await owner.getByRole("option", { name: "Admin" }).click();
  }
  await owner.getByRole("button", { name: "Send invites" }).click();
  const row = owner.getByRole("listitem", { name: `Invite for ${email}` });
  await expect(row).toBeVisible();
  const link = await row.getByRole("button", { name: "Copy link" }).getAttribute("data-invite-link");
  return { email, link: link! };
}

/** Opens the invite link in a new browser (signed out), signs up with the invited email and joins. */
export async function joinWithInvite(browser: Browser, baseURL: string, invite: { email: string; link: string }) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto(invite.link);
  await expect(page).toHaveURL(/\/sign-in\?next=%2Finvite%2F/);
  await page.getByRole("link", { name: "Sign up" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Mate");
  await page.getByLabel("Email", { exact: true }).fill(invite.email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("button", { name: /^Join / }).click();
  await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
  return { context, page };
}
