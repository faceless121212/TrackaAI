import { expect, test } from "@playwright/test";
import { column, openFreshBoard, openSettings, quickAdd, upgradeTo } from "./helpers";

// The e2e server runs with AI_MOCK=1: the AI teammate answers with a canned result.

test("an AI teammate works on an assigned task, comments and hands it to review", async ({ page }) => {
  await openFreshBoard(page);
  const boardUrl = page.url();
  await upgradeTo(page, "Pro");

  await openSettings(page, "AI teammates");
  await page.getByLabel("Name").fill("Spec writer");
  await page.getByLabel("Specialty").fill("Writes short specs");
  await page.getByRole("button", { name: "Add AI teammate" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Writes short specs" })).toBeVisible();

  await page.goto(boardUrl);
  await quickAdd(page, "Todo", "Spec the CSV export");
  await page.getByRole("link", { name: "Spec the CSV export" }).click();
  const sheet = page.getByRole("dialog", { name: "Spec the CSV export" });
  await sheet.getByRole("combobox", { name: "Assignee" }).click();
  await page.getByRole("option", { name: "Spec writer (AI)" }).click();

  const runs = sheet.getByRole("region", { name: "AI teammate" });
  await expect(runs.getByText("Done")).toBeVisible({ timeout: 20_000 });
  await expect(sheet.getByText("a first pass from the mock AI teammate")).toBeVisible();
  await expect(sheet.getByText("Spec writer (AI)").first()).toBeVisible();

  await runs.getByRole("button", { name: "Run again" }).click();
  await expect(runs.getByRole("listitem")).toHaveCount(2);
  await expect(runs.getByText("Done")).toHaveCount(2, { timeout: 20_000 });

  await page.keyboard.press("Escape");
  await expect(column(page, "In Review")).toContainText("Spec the CSV export");

  // Assigning in the create dialog starts a run too.
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: "New task" });
  await dialog.getByLabel("Title", { exact: true }).fill("Plan the beta launch");
  await dialog.getByRole("combobox", { name: "Assignee" }).click();
  await page.getByRole("option", { name: "Spec writer (AI)" }).click();
  await dialog.getByRole("button", { name: "Create task" }).click();
  await page.getByRole("link", { name: "Plan the beta launch" }).click();
  const second = page.getByRole("dialog", { name: "Plan the beta launch" });
  await expect(second.getByRole("combobox", { name: "Assignee" })).toHaveText(/Spec writer \(AI\)/);
  await expect(second.getByRole("region", { name: "AI teammate" }).getByText("Done")).toBeVisible({ timeout: 20_000 });
});

test("on Free, AI teammates are explained as part of Pro", async ({ page }) => {
  await openFreshBoard(page);
  await openSettings(page, "AI teammates");
  await expect(page.getByText("AI teammates are part of the Pro plan.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add AI teammate" })).toHaveCount(0);
});
