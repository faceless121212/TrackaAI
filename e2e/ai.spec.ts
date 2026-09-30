import { expect, test } from "@playwright/test";
import { column, openFreshBoard, upgradeTo } from "./helpers";

// The e2e server runs with AI_MOCK=1: a mock model streams canned drafts.

test("the AI task writer drafts a task the user can edit before creating", async ({ page }) => {
  await openFreshBoard(page);
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: "New task" });

  await dialog.getByLabel("Write with AI").fill("export the board as CSV");
  await dialog.getByRole("button", { name: "Write", exact: true }).click();
  await expect(dialog.getByLabel("Title", { exact: true })).toHaveValue("Draft: export the board as CSV");
  await expect(dialog.getByLabel("Description")).toHaveValue(/## Acceptance criteria/);
  await expect(dialog.getByRole("combobox", { name: "Priority" })).toHaveText(/High/);
  await expect(dialog.getByRole("button", { name: "Bug", pressed: true })).toBeVisible();

  await dialog.getByLabel("Title", { exact: true }).fill("Export the board as CSV");
  await dialog.getByRole("button", { name: "Create task" }).click();
  await expect(dialog).toBeHidden();
  const card = column(page, "Todo").getByRole("article").filter({ hasText: "Export the board as CSV" });
  await expect(card).toContainText("Bug");
});

test("breaking a task down creates the picked sub-tasks in its column", async ({ page }) => {
  await openFreshBoard(page);
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: "New task" });
  await dialog.getByLabel("Title", { exact: true }).fill("Launch the beta");
  await dialog.getByRole("button", { name: "Create task" }).click();
  await page.getByRole("link", { name: "Launch the beta" }).click();

  const sheet = page.getByRole("dialog", { name: "Launch the beta" });
  await sheet.getByRole("button", { name: "Break down with AI" }).click();
  const breakdown = page.getByRole("dialog", { name: "Break down ENG-1" });
  const suggestions = breakdown.getByRole("list", { name: "Suggested sub-tasks" });
  await expect(suggestions.getByRole("checkbox")).toHaveCount(3);
  await expect(suggestions).toHaveAttribute("aria-busy", "false");
  await breakdown.getByRole("checkbox", { name: /Test and ship/ }).uncheck();
  await breakdown.getByRole("button", { name: "Create 2 sub-tasks" }).click();
  await expect(breakdown).toBeHidden();

  await expect(sheet.getByRole("heading", { name: /Sub-tasks · 2/ })).toBeVisible();
  await expect(sheet.getByRole("button", { name: /ENG-2 Plan the approach: Launch the beta/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(column(page, "Todo").getByRole("article")).toHaveCount(3);
});

test("an invalid draft shows an error instead of filling the form", async ({ page }) => {
  await openFreshBoard(page);
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: "New task" });
  await dialog.getByLabel("Write with AI").fill("invalid");
  await dialog.getByRole("button", { name: "Write", exact: true }).click();
  await expect(dialog.getByText("The AI couldn't finish. Please try again.")).toBeVisible();
  await expect(dialog.getByLabel("Title", { exact: true })).toHaveValue("");
});

test("a Free team gets 10 AI runs a month, then is pointed to the plans", async ({ page }) => {
  await openFreshBoard(page);
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: "New task" });
  const write = dialog.getByRole("button", { name: "Write", exact: true });
  for (let run = 1; run <= 10; run++) {
    await dialog.getByLabel("Write with AI").fill(`idea ${run}`);
    await write.click();
    await expect(dialog.getByLabel("Title", { exact: true })).toHaveValue(`Draft: idea ${run}`);
  }
  await dialog.getByLabel("Write with AI").fill("one more");
  await write.click();
  await expect(dialog.getByText(/The Free plan includes up to 10 AI runs a month\. Upgrade to Lite/)).toBeVisible();
  await dialog.getByRole("link", { name: "See plans" }).click();
  await expect(page.getByText("AI runs this month")).toBeVisible();
  await expect(page.getByText("10 of 10")).toBeVisible();
});

test("a burst of AI requests is slowed down with a 429, even on Pro", async ({ page }) => {
  await openFreshBoard(page);
  const boardId = page.url().split("/board/")[1];
  await upgradeTo(page, "Pro");
  const write = () => page.request.post("/api/ai/task-writer", { data: { boardId, prompt: "a task" } });
  for (let i = 0; i < 20; i++) expect((await write()).status()).toBe(200);
  const refused = await write();
  expect(refused.status()).toBe(429);
  expect(refused.headers()["retry-after"]).toBe("60");
  expect((await refused.json()).error).toMatch(/going a bit fast/);
});
