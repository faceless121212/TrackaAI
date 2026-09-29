import { expect, test, type Page } from "@playwright/test";
import { column, openFreshBoard, quickAdd, upgradeTo } from "./helpers";

// The e2e server runs with AI_MOCK=1: "move KEY to COLUMN" makes the mock copilot call move_task.

async function proBoardWithTask(page: Page) {
  const id = await openFreshBoard(page);
  const boardUrl = page.url();
  await upgradeTo(page, "Pro");
  await page.goto(boardUrl);
  await expect(page.getByRole("region", { name: "Backlog" })).toBeVisible();
  await quickAdd(page, "Todo", "Write the launch post");
  return id;
}

async function ask(page: Page, text: string) {
  await page.getByRole("button", { name: "Copilot" }).click();
  const panel = page.getByRole("dialog", { name: "Copilot" });
  await panel.getByLabel("Message the copilot").fill(text);
  await panel.getByRole("button", { name: "Send" }).click();
  return panel;
}

test("the copilot proposes a change and applies it only after approval", async ({ page }) => {
  await proBoardWithTask(page);
  const panel = await ask(page, "move ENG-1 to Done");
  const card = panel.getByRole("group", { name: "Proposed change: Move ENG-1 to Done" });
  await expect(card.getByRole("button", { name: "Approve" })).toBeVisible();

  await card.getByRole("button", { name: "Approve" }).click();
  await expect(card).toContainText("Done");
  await expect(panel.getByText("Done.", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(column(page, "Done")).toContainText("Write the launch post");
});

test("a denied change leaves the board alone", async ({ page }) => {
  await proBoardWithTask(page);
  const panel = await ask(page, "move ENG-1 to Done");
  const card = panel.getByRole("group", { name: "Proposed change: Move ENG-1 to Done" });
  await card.getByRole("button", { name: "Deny" }).click();
  await expect(card).toContainText("Denied");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(column(page, "Todo")).toContainText("Write the launch post");
});

test("on Free, the copilot explains it's part of Pro", async ({ page }) => {
  await openFreshBoard(page);
  await page.getByRole("button", { name: "Copilot" }).click();
  const panel = page.getByRole("dialog", { name: "Copilot" });
  await expect(panel).toContainText("The board copilot is part of the Pro plan.");
  await expect(panel.getByRole("link", { name: "See plans" })).toBeVisible();
});
