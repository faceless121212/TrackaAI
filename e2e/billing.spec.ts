import { expect, test } from "@playwright/test";
import { inviteTeammate, joinWithInvite, openFreshBoard, openSettings, signInAsDemo, upgradeTo } from "./helpers";

test("the pricing page is public and also works signed in", async ({ page }) => {
  await page.goto("/pricing");
  for (const plan of ["Free", "Lite", "Pro"]) await expect(page.getByLabel(`${plan} plan`)).toBeVisible();
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/sign-up$/);

  await signInAsDemo(page);
  await page.goto("/pricing");
  await expect(page.getByLabel("Pro plan")).toContainText("Current plan"); // the demo team is on Pro
  await expect(page.getByRole("link", { name: "Open app" })).toBeVisible();
});

test("a Free team hits its limits, upgrades to Lite and fills its three seats", async ({ page }) => {
  await openFreshBoard(page);

  // One workspace on Free: a second one is refused with a link to the plans.
  await page.getByRole("button", { name: "New workspace" }).click();
  const dialog = page.getByRole("dialog", { name: "New workspace" });
  await dialog.getByLabel("Workspace name").fill("Design");
  await dialog.getByRole("button", { name: "Create workspace" }).click();
  await expect(dialog.getByRole("alert")).toContainText("The Free plan includes 1 workspace.");
  await expect(dialog.getByRole("link", { name: "See plans" })).toBeVisible();
  await page.keyboard.press("Escape");

  await openSettings(page, "Members");
  await expect(page.getByText("The Free plan is for one person.")).toBeVisible();
  await expect(page.getByLabel("Email addresses")).toHaveCount(0);

  await upgradeTo(page, "Lite");
  await expect(page.getByLabel("Lite plan")).toContainText("Current plan");
  await inviteTeammate(page);
  await inviteTeammate(page);
  await openSettings(page, "Members");
  await expect(page.getByText("The Lite plan includes up to 3 people. Upgrade to Pro for unlimited teammates.")).toBeVisible();
});

test("downgrading keeps everything but warns about the limits", async ({ page }) => {
  await openFreshBoard(page);
  await upgradeTo(page, "Pro");
  await inviteTeammate(page);
  await openSettings(page, "Billing");
  await page.getByRole("button", { name: "Switch to Free" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Nothing is deleted.");
  await page.getByRole("alertdialog").getByRole("button", { name: "Switch to Free" }).click();
  await expect(page.getByText("Your team is above the Free plan's limits")).toBeVisible();
  await expect(page.getByLabel("Free plan")).toContainText("Current plan");
});

test("after a downgrade, invitees are told to ask the owner and admins see billing read-only", async ({
  page,
  browser,
  baseURL,
}) => {
  const id = await openFreshBoard(page);
  await upgradeTo(page, "Pro");
  const adminInvite = await inviteTeammate(page, "Admin");
  const lateInvite = await inviteTeammate(page);
  const { context: adminContext, page: admin } = await joinWithInvite(browser, baseURL!, adminInvite);

  await openSettings(page, "Billing");
  await page.getByRole("button", { name: "Switch to Free" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Switch to Free" }).click();
  await expect(page.getByLabel("Free plan")).toContainText("Current plan");

  // The pending invite can no longer be accepted, and the message fits the invitee.
  const lateContext = await browser.newContext({ baseURL });
  const late = await lateContext.newPage();
  await late.goto(lateInvite.link);
  await late.getByRole("link", { name: "Sign up" }).click();
  await late.getByLabel("Name", { exact: true }).fill("Late");
  await late.getByLabel("Email", { exact: true }).fill(lateInvite.email);
  await late.getByLabel("Password", { exact: true }).fill("password123");
  await late.getByRole("button", { name: "Create account" }).click();
  await late.getByRole("button", { name: /^Join / }).click();
  await expect(
    late.getByText(`Team ${id} is full on its current plan. Ask the team owner to upgrade, then try again.`),
  ).toBeVisible();

  // Admins manage members but not billing.
  await admin.goto(`/team-${id}/settings/billing`);
  await expect(admin.getByText("Only the team owner can change the plan.").first()).toBeVisible();
  await expect(admin.getByRole("link", { name: /^Upgrade to/ })).toHaveCount(0);
  await admin.goto(`/team-${id}/settings/members`);
  await expect(admin.getByText(/Ask the team owner to upgrade\./)).toBeVisible();

  await adminContext.close();
  await lateContext.close();
});
