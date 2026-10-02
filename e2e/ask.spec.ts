import { expect, test } from "@playwright/test";
import { column, openFreshBoard, quickAdd } from "./helpers";

// The e2e server runs with AI_MOCK=1: a message with "urgent" makes the mock
// model call search_issues for open urgent/high issues and list them as links.

test("Ask AI finds the team's urgent issues and links straight to them", async ({ page }) => {
  await openFreshBoard(page); // Free: Ask AI is on every plan, metered per message
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: "New task" });
  await dialog.getByLabel("Title", { exact: true }).fill("Fix the outage");
  await dialog.getByRole("combobox", { name: "Priority" }).click();
  await page.getByRole("option", { name: "Urgent" }).click();
  await dialog.getByRole("button", { name: "Create task" }).click();
  await expect(dialog).toBeHidden();
  await quickAdd(page, "Todo", "Tidy the README"); // no priority: not urgent
  await expect(column(page, "Todo")).toContainText("Tidy the README");

  await page.getByRole("link", { name: "Ask AI" }).click();
  await expect(page.getByRole("heading", { name: "Ask AI" })).toBeVisible();
  await page.getByRole("button", { name: "What's urgent?" }).click();

  const log = page.getByRole("log", { name: "Ask AI conversation" });
  await expect(log.getByText("Searched issues")).toBeVisible();
  const link = log.getByRole("link", { name: "ENG-1 Fix the outage" });
  await expect(link).toBeVisible();
  await expect(log).not.toContainText("Tidy the README");

  await link.click();
  await expect(page).toHaveURL(/\/board\/.+\?task=ENG-1$/);
  await expect(page.getByRole("dialog", { name: "Fix the outage" })).toBeVisible();
});

test("Ask AI starts a new chat and answers free-form questions", async ({ page }) => {
  await openFreshBoard(page);
  await page.getByRole("link", { name: "Ask AI" }).click();
  await page.getByLabel("Ask about your issues").fill("Hello there");
  await page.keyboard.press("Enter");
  const log = page.getByRole("log", { name: "Ask AI conversation" });
  await expect(log).toContainText("This is the mock Ask AI");
  await page.getByRole("button", { name: "New chat" }).click();
  await expect(log).not.toContainText("Hello there");
  await expect(page.getByRole("button", { name: "What's urgent?" })).toBeVisible();
});
