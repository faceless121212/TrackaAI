import { expect, test } from "@playwright/test";
import { createTeamAndWorkspace, signUp } from "./helpers";

const DEFAULT_COLUMNS = ["Backlog", "Todo", "In Progress", "In Review", "Done"];

test("a new user goes from sign-up to a seeded board", async ({ page }) => {
  const id = await signUp(page);
  await createTeamAndWorkspace(page, `Team ${id}`);
  await page.getByRole("link", { name: "Skip for now" }).click();

  await expect(page).toHaveURL(new RegExp(`/team-${id}/board/`));
  await expect(page.getByRole("heading", { name: "Engineering", level: 1 })).toBeVisible();
  for (const column of DEFAULT_COLUMNS) {
    await expect(page.getByRole("region", { name: column })).toContainText("No tasks");
  }
});

test("invites are validated, then sent", async ({ page }) => {
  const id = await signUp(page);
  await createTeamAndWorkspace(page, `Team ${id}`);

  await page.getByLabel("Email addresses").fill("not-an-email");
  await page.getByRole("button", { name: "Send invites" }).click();
  await expect(page.getByText("Enter a valid email")).toBeVisible();

  await page.getByLabel("Email addresses").fill("ann@example.test, bob@example.test");
  await page.getByRole("button", { name: "Send invites" }).click();
  await expect(page).toHaveURL(new RegExp(`/team-${id}/board/`));
});

test("reserved team URLs are rejected and the form keeps its input", async ({ page }) => {
  await signUp(page);
  await page.getByLabel("Team name", { exact: true }).fill("Onboarding");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("This name is reserved")).toBeVisible();
  await expect(page.getByLabel("Team name", { exact: true })).toHaveValue("Onboarding");
});

test("the team switcher lists every team the user belongs to", async ({ page }) => {
  const id = await signUp(page);
  await createTeamAndWorkspace(page, `Alpha ${id}`);
  await page.getByRole("link", { name: "Skip for now" }).click();

  await page.getByRole("button", { name: /Switch team/ }).click();
  await page.getByRole("menuitem", { name: "Create team" }).click();
  await createTeamAndWorkspace(page, `Beta ${id}`);
  await page.getByRole("link", { name: "Skip for now" }).click();

  await page.getByRole("button", { name: /Switch team/ }).click();
  await expect(page.getByRole("menuitem", { name: `Alpha ${id}` })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: `Beta ${id}` })).toBeVisible();
});
