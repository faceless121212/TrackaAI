import { expect, test } from "@playwright/test";
import {
  column,
  fillSignIn,
  inviteTeammate,
  joinWithInvite,
  openFreshBoard,
  openSettings,
  quickAdd,
  signUp,
  uniqueId,
} from "./helpers";

test("an invited teammate joins and collaborates on the board", async ({ page, browser, baseURL }) => {
  await openFreshBoard(page);
  const invite = await inviteTeammate(page);
  const { page: mate, context } = await joinWithInvite(browser, baseURL!, invite);

  await mate.getByRole("link", { name: "Engineering", exact: true }).click();
  await expect(column(mate, "Backlog")).toBeVisible();
  // Members work on tasks but don't manage structure.
  await expect(mate.getByRole("button", { name: "Add column" })).toHaveCount(0);
  await expect(mate.getByRole("button", { name: "New workspace" })).toHaveCount(0);
  await quickAdd(mate, "Todo", "From my teammate");

  await page.getByRole("link", { name: "Engineering", exact: true }).click();
  await expect(column(page, "Todo")).toContainText("From my teammate");
  await openSettings(page, "Members");
  await expect(page.getByRole("listitem", { name: "Mate" })).toContainText(invite.email);
  await expect(page.getByRole("listitem", { name: `Invite for ${invite.email}` })).toHaveCount(0);
  await context.close();
});

test("owners change roles and remove members", async ({ page, browser, baseURL }) => {
  await openFreshBoard(page);
  const invite = await inviteTeammate(page);
  const { page: mate, context } = await joinWithInvite(browser, baseURL!, invite);

  await page.reload();
  await page.getByRole("combobox", { name: "Role for Mate" }).click();
  await page.getByRole("option", { name: "Admin" }).click();
  await expect(page.getByText("Mate is now admin")).toBeVisible();
  await mate.reload();
  await expect(mate.getByRole("button", { name: "New workspace" })).toBeVisible();

  await page.getByRole("button", { name: "Actions for Mate" }).click();
  await page.getByRole("menuitem", { name: "Remove from team" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  // The toast only appears once the server has removed them (while the dialog is open,
  // Radix hides the list from the accessibility tree, so the row can't be used as the signal).
  await expect(page.getByText("Removed Mate")).toBeVisible();
  await expect(page.getByRole("listitem", { name: "Mate" })).toHaveCount(0);
  await mate.reload();
  await expect(mate.getByText("This page could not be found.")).toBeVisible();
  await context.close();
});

test("ownership can be transferred, then the old owner can leave", async ({ page, browser, baseURL }) => {
  await openFreshBoard(page);
  const invite = await inviteTeammate(page);
  const { page: mate, context } = await joinWithInvite(browser, baseURL!, invite);

  await page.reload();
  await page.getByRole("button", { name: "Actions for Mate" }).click();
  await page.getByRole("menuitem", { name: "Make owner" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Make owner" }).click();
  await expect(page.getByText("Mate is now the owner")).toBeVisible();

  await openSettings(mate, "General");
  await expect(mate.getByRole("button", { name: "Delete team" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Leave team" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Leave team" }).click();
  // The old owner has no other team, so they land in onboarding.
  await expect(page.getByRole("heading", { name: "Create your team" })).toBeVisible();
  await context.close();
});

test("invite links: revoked, resent and opened with the wrong account", async ({ page, browser, baseURL }) => {
  await openFreshBoard(page);
  const revoked = await inviteTeammate(page);
  await page
    .getByRole("listitem", { name: `Invite for ${revoked.email}` })
    .getByRole("button", { name: "Revoke" })
    .click();
  await expect(page.getByRole("listitem", { name: `Invite for ${revoked.email}` })).toHaveCount(0);

  const invite = await inviteTeammate(page);
  const row = page.getByRole("listitem", { name: `Invite for ${invite.email}` });
  await row.getByRole("button", { name: "Resend" }).click();
  await expect(row.getByRole("button", { name: "Copy link" })).not.toHaveAttribute("data-invite-link", invite.link);
  const fresh = (await row.getByRole("button", { name: "Copy link" }).getAttribute("data-invite-link"))!;

  // Someone else, already signed in, opens the links.
  const context = await browser.newContext({ baseURL });
  const other = await context.newPage();
  await signUp(other);
  await other.goto(revoked.link);
  await expect(other.getByRole("heading", { name: "Invite not found" })).toBeVisible();
  await other.goto(invite.link);
  await expect(other.getByRole("heading", { name: "Invite not found" })).toBeVisible();
  await other.goto(fresh);
  await expect(other.getByRole("heading", { name: "Wrong account" })).toBeVisible();
  await context.close();
});

test("labels are managed in settings", async ({ page }) => {
  await openFreshBoard(page);
  await openSettings(page, "Labels");
  await page.getByLabel("New label").fill("Design");
  await page.getByRole("button", { name: "Add label" }).click();
  await expect(page.getByRole("listitem", { name: "Design" })).toBeVisible();
  await expect(page.getByLabel("New label")).toHaveValue("");

  await page.getByRole("listitem", { name: "Design" }).getByRole("button", { name: "Design", exact: true }).click();
  await page.getByLabel("Label name").fill("UX");
  await page.getByLabel("Label name").press("Enter");
  await expect(page.getByRole("listitem", { name: "UX" })).toBeVisible();

  await page.getByRole("combobox", { name: "Colour for UX" }).click();
  await page.getByRole("option", { name: "Pink" }).click();
  await page.getByRole("button", { name: "Delete Bug" }).click();
  await expect(page.getByRole("listitem", { name: "Bug" })).toHaveCount(0);
  // Edits are optimistic; wait until the list has finished saving before reloading.
  await expect(page.getByRole("list", { name: "Labels" })).toHaveAttribute("aria-busy", "false");

  await page.reload();
  await expect(page.getByRole("combobox", { name: "Colour for UX" })).toHaveText(/Pink/);
  await expect(page.getByRole("listitem", { name: "Bug" })).toHaveCount(0);
});

test("profile changes show across the app", async ({ page }) => {
  await openFreshBoard(page);
  await openSettings(page, "Profile");
  const name = `Grace ${uniqueId()}`;
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible(); // sidebar footer

  // type="url": the browser refuses to submit an invalid avatar URL.
  const avatar = page.getByLabel("Avatar URL");
  await avatar.fill("not a url");
  await page.getByRole("button", { name: "Save profile" }).click();
  expect(await avatar.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);
});

test("teams can be renamed and deleted", async ({ page }) => {
  const id = await openFreshBoard(page);
  await openSettings(page, "General");
  await page.getByLabel("Team name").fill(`Renamed ${id}`);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: `Switch team (current: Renamed ${id})` })).toBeVisible();

  await page.getByRole("button", { name: "Delete team" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete team" }).click();
  await expect(page.getByRole("heading", { name: "Create your team" })).toBeVisible();
});

test("signing up from an invite keeps the invite through sign-in and sign-up", async ({ page }) => {
  await page.goto("/invite/some-token");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Finvite%2Fsome-token$/);
  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/sign-up\?next=%2Finvite%2Fsome-token$/);
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in\?next=%2Finvite%2Fsome-token$/);
  await fillSignIn(page, "demo@trackaai.test", "demo-password");
  await expect(page.getByRole("heading", { name: "Invite not found" })).toBeVisible();
});
