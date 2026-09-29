import { expect, test } from "@playwright/test";
import { column, drag, openFreshBoard, quickAdd, saved, signInAsDemo, upgradeTo } from "./helpers";

test("C opens the create dialog and the task is edited in its sheet", async ({ page }) => {
  await openFreshBoard(page);
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: "New task" });
  await dialog.getByLabel("Title", { exact: true }).fill("Write the spec");
  await dialog.getByRole("button", { name: "Create task" }).click();
  await expect(dialog).toBeHidden();
  await expect(column(page, "Todo")).toContainText("ENG-1");

  await page.getByRole("link", { name: "Write the spec" }).click();
  await expect(page).toHaveURL(/\?task=ENG-1$/);
  const sheet = page.getByRole("dialog", { name: "Write the spec" });

  await sheet.getByRole("combobox", { name: "Priority" }).click();
  await page.getByRole("option", { name: "High" }).click();
  await sheet.getByRole("button", { name: "Labels" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Bug" }).click();
  await page.keyboard.press("Escape");

  await sheet.getByRole("tab", { name: "Write" }).click();
  await sheet.getByLabel("Description").fill("Needs **tests**.");
  await sheet.getByRole("button", { name: "Save description" }).click();
  await expect(sheet.locator("strong", { hasText: "tests" })).toBeVisible();

  await sheet.getByLabel("Comment").fill("Looks *good*");
  await sheet.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(sheet.locator("em", { hasText: "good" })).toBeVisible();

  await saved(page);
  await page.reload();
  const reopened = page.getByRole("dialog", { name: "Write the spec" });
  await expect(reopened.getByRole("combobox", { name: "Priority" })).toHaveText(/High/);
  await expect(reopened.locator("em", { hasText: "good" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/task=/);
  await expect(column(page, "Todo").getByRole("article")).toContainText("Bug");
});

test("dragging a card to another column persists", async ({ page }) => {
  await openFreshBoard(page);
  await quickAdd(page, "Backlog", "Drag me");
  await drag(page, column(page, "Backlog").getByRole("article").filter({ hasText: "Drag me" }), column(page, "In Progress"));
  await expect(column(page, "In Progress")).toContainText("Drag me");
  await saved(page);
  await page.reload();
  await expect(column(page, "In Progress")).toContainText("Drag me");
  await expect(column(page, "Backlog")).toContainText("No tasks");
});

test("dragging reorders cards within a column", async ({ page }) => {
  await openFreshBoard(page);
  await quickAdd(page, "Todo", "Bottom");
  await quickAdd(page, "Todo", "Top"); // quick-add inserts at the top
  const titles = () => column(page, "Todo").getByRole("link").allTextContents();
  expect(await titles()).toEqual(["Top", "Bottom"]);

  const bottom = column(page, "Todo").getByRole("article").filter({ hasText: "Bottom" });
  await drag(page, bottom, column(page, "Todo").getByRole("article").filter({ hasText: "Top" }), 5);
  await expect.poll(titles).toEqual(["Bottom", "Top"]);
  await saved(page);
  await page.reload();
  expect(await titles()).toEqual(["Bottom", "Top"]);
});

test("columns can be added, renamed and deleted", async ({ page }) => {
  await openFreshBoard(page);
  await page.getByRole("button", { name: "Add column" }).click();
  await page.getByLabel("New column name").fill("QA");
  await page.getByLabel("New column name").press("Enter");
  await expect(column(page, "QA")).toHaveAttribute("aria-busy", "false");

  await page.getByRole("button", { name: "Column actions for QA" }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByLabel("Column name").fill("Testing");
  await page.getByLabel("Column name").press("Enter");
  await expect(column(page, "Testing")).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(column(page, "Testing")).toBeVisible();

  await page.getByRole("button", { name: "Column actions for Testing" }).click();
  await page.getByRole("menuitem", { name: "Delete column" }).click();
  await expect(column(page, "Testing")).toBeHidden();
  await saved(page);
  await page.reload();
  await expect(column(page, "Testing")).toBeHidden();
});

test("a task can be deleted from its sheet", async ({ page }) => {
  await openFreshBoard(page);
  await quickAdd(page, "Todo", "Short-lived");
  await page.getByRole("link", { name: "Short-lived" }).click();
  await page.getByRole("button", { name: "Delete task" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted ENG-1")).toBeVisible();
  await expect(column(page, "Todo")).toContainText("No tasks");
  await saved(page);
  await page.reload();
  await expect(column(page, "Todo")).toContainText("No tasks");
});

test("filters narrow the board and survive a reload", async ({ page }) => {
  await signInAsDemo(page);
  await page.getByRole("link", { name: "Engineering", exact: true }).click();
  await expect(column(page, "Backlog")).toContainText("ENG-1");

  await page.getByRole("button", { name: "Priority" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Urgent" }).click();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/priority=urgent/);
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("ENG-5");

  await saved(page);
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(1);

  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Search tasks").fill("kanban");
  await expect(page).toHaveURL(/q=kanban/);
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("ENG-4");
});

test("My tasks lists what is assigned to me and opens it on its board", async ({ page }) => {
  await signInAsDemo(page);
  await page.getByRole("link", { name: /Build the Kanban board/ }).click();
  await expect(page).toHaveURL(/\/board\/.+\?task=ENG-4$/);
  await expect(page.getByRole("dialog", { name: "Build the Kanban board" })).toBeVisible();
});

test("workspaces and boards are managed from the sidebar", async ({ page }) => {
  await openFreshBoard(page);
  await upgradeTo(page, "Lite");

  await page.getByRole("button", { name: "New workspace" }).click();
  const dialog = page.getByRole("dialog", { name: "New workspace" });
  await dialog.getByLabel("Workspace name").fill("Design");
  await expect(dialog.getByLabel("Key prefix")).toHaveValue("DES");
  await dialog.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByRole("heading", { name: "Design", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Workspace actions for Design" }).click();
  await page.getByRole("menuitem", { name: "New board" }).click();
  await page.getByLabel("Board name").fill("Roadmap");
  await page.getByRole("button", { name: "Create board" }).click();
  await expect(page.getByRole("heading", { name: "Roadmap", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Board actions" }).click();
  await page.getByRole("menuitem", { name: "Edit board" }).click();
  await page.getByLabel("Board name").fill("Roadmap 2027");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Roadmap 2027", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Board actions" }).click();
  await page.getByRole("menuitem", { name: "Delete board" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete board" }).click();
  await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Roadmap 2027" })).toHaveCount(0);

  await page.getByRole("button", { name: "Workspace actions for Design" }).click();
  await page.getByRole("menuitem", { name: "Rename workspace" }).click();
  await page.getByLabel("Workspace name").fill("Product design");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Workspace actions for Product design" })).toBeAttached();
});
