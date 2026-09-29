import { expect, test } from "@playwright/test";
import { createTeamAndWorkspace, signUp } from "./helpers";

const DEFAULT_COLUMNS = ["Backlog", "Todo", "In Progress", "In Review", "Done"];

test("a new user goes from sign-up to a seeded board", async ({ page }) => {
  const id = await signUp(page);
  await createTeamAndWorkspace(page, `Team ${id}`);
  await page.getByRole("link", { name: "Go to your board" }).click();

  await expect(page).toHaveURL(new RegExp(`/team-${id}/board/`));
  await expect(page.getByRole("heading", { name: "Engineering", level: 1 })).toBeVisible();
  for (const column of DEFAULT_COLUMNS) {
    await expect(page.getByRole("region", { name: column })).toContainText("No tasks");
  }
});

test("a new Free team is offered the plans instead of invites", async ({ page }) => {
  const id = await signUp(page);
  await createTeamAndWorkspace(page, `Team ${id}`);
  await expect(page.getByText("The Free plan is for one person. Upgrade to Lite to invite teammates.")).toBeVisible();
  await page.getByRole("link", { name: "See plans" }).click();
  await expect(page).toHaveURL(new RegExp(`/team-${id}/settings/billing`));
  await expect(page.getByLabel("Free plan")).toContainText("Current plan");
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
  await page.getByRole("link", { name: "Go to your board" }).click();

  await page.getByRole("button", { name: /Switch team/ }).click();
  await page.getByRole("menuitem", { name: "Create team" }).click();
  await createTeamAndWorkspace(page, `Beta ${id}`);
  await page.getByRole("link", { name: "Go to your board" }).click();

  await page.getByRole("button", { name: /Switch team/ }).click();
  await expect(page.getByRole("menuitem", { name: `Alpha ${id}` })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: `Beta ${id}` })).toBeVisible();
});
