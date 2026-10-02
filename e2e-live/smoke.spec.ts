import { expect, test, type Page } from "@playwright/test";

// Every main feature once, on the live backend. Timings are logged per step.
// Defaults are the development seed (supabase/seed.sql). Never seed a public deployment with them.
const DEMO = {
  email: process.env.SMOKE_EMAIL ?? "demo@trackaai.test",
  password: process.env.SMOKE_PASSWORD || process.env.DEMO_PASSWORD || "demo-password",
};
const id = Date.now().toString(36);
const title = `Smoke ${id}`;

async function timed<T>(label: string, step: () => Promise<T>): Promise<T> {
  const started = Date.now();
  const result = await step();
  console.log(`${label.padEnd(44)} ${Date.now() - started} ms`);
  return result;
}

async function cleanUp(label: string, step: () => Promise<void>) {
  try {
    await timed(label, step);
  } catch (error) {
    console.warn(`${label} failed; remove it by hand:`, error instanceof Error ? error.message : error);
  }
}

const column = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

test("TrackaAI works end to end on the live backend", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  let boardUrl = "";
  const sheet = page.getByRole("dialog", { name: title });
  try {
    await timed("sign in", async () => {
      await page.goto("/sign-in");
      await page.getByLabel("Email", { exact: true }).fill(DEMO.email);
      await page.getByLabel("Password", { exact: true }).fill(DEMO.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
    });

    await timed("open the Engineering board", async () => {
      await page.getByRole("link", { name: "Engineering", exact: true }).last().click();
      await expect(column(page, "Backlog")).toBeVisible();
    });
    boardUrl = page.url();

    await timed("quick-add a task", async () => {
      await page.getByRole("button", { name: "Add task to Todo" }).click();
      const input = page.getByLabel("New task in Todo");
      await input.fill(title);
      await input.press("Enter");
      await input.press("Escape");
      await expect(column(page, "Todo").getByRole("article").filter({ hasText: title })).toContainText(/ENG-\d+/);
    });

    await timed("open the task and edit it", async () => {
      await page.getByRole("link", { name: title }).click();
      await sheet.getByRole("combobox", { name: "Priority" }).click();
      await page.getByRole("option", { name: "High" }).click();
      await sheet.getByRole("button", { name: "Labels" }).click();
      await page.getByRole("menuitemcheckbox", { name: "Feature" }).click();
      await page.keyboard.press("Escape");
      await sheet.getByRole("tab", { name: "Write" }).click();
      await sheet.getByLabel("Description").fill("Checked by the **smoke test**.");
      await sheet.getByRole("button", { name: "Save description" }).click();
      await expect(sheet.locator("strong", { hasText: "smoke test" })).toBeVisible();
    });

    await timed("comment on it", async () => {
      await sheet.getByLabel("Comment").fill("Looks good");
      await sheet.getByRole("button", { name: "Comment", exact: true }).click();
      await expect(sheet.getByText("Looks good")).toBeVisible();
    });

    await timed("move it to In Progress", async () => {
      await sheet.getByRole("combobox", { name: "Status" }).click();
      await page.getByRole("option", { name: "In Progress" }).click();
      await page.keyboard.press("Escape");
      await expect(column(page, "In Progress")).toContainText(title);
    });

    await timed("AI: break down (real model)", async () => {
      await page.getByRole("link", { name: title }).click();
      await sheet.getByRole("button", { name: "Break down with AI" }).click();
      const breakdown = page.getByRole("dialog", { name: /^Break down ENG-/ });
      await expect(breakdown.getByRole("list", { name: "Suggested sub-tasks" })).toHaveAttribute("aria-busy", "false", { timeout: 60_000 });
      await expect(breakdown.getByRole("checkbox").first()).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(breakdown).toBeHidden();
      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();
    });

    await timed("AI: write a task (real model, not saved)", async () => {
      await page.keyboard.press("c");
      const dialog = page.getByRole("dialog", { name: "New task" });
      await dialog.getByLabel("Write with AI").fill("let people export the board as CSV");
      await dialog.getByRole("button", { name: "Write", exact: true }).click();
      await expect(dialog.getByLabel("Title", { exact: true })).not.toHaveValue("", { timeout: 60_000 });
      await expect(dialog.getByRole("button", { name: "Create task" })).toBeEnabled({ timeout: 60_000 });
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });

    await timed("AI: ask the copilot (real model)", async () => {
      await page.getByRole("button", { name: "Copilot" }).click();
      const panel = page.getByRole("dialog", { name: "Copilot" });
      await panel.getByRole("button", { name: "Summarize this board" }).click();
      await expect(panel.getByRole("log")).toContainText(/Backlog|Todo|task/i, { timeout: 60_000 });
      await expect(panel.getByRole("log")).toHaveAttribute("aria-busy", "false", { timeout: 60_000 });
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
    });

    await timed("AI: Ask AI across the team (real model)", async () => {
      await page.goto(boardUrl.replace(/\/board\/.*/, "/ask"));
      await page.getByLabel("Ask about your issues").fill(`Find the issue titled "${title}" and link to it.`);
      await page.keyboard.press("Enter");
      const log = page.getByRole("log", { name: "Ask AI conversation" });
      await expect(log.getByRole("link", { name: new RegExp(title) })).toBeVisible({ timeout: 60_000 });
      await expect(log).toHaveAttribute("aria-busy", "false", { timeout: 60_000 });
      await page.goto(boardUrl);
    });

    await timed("AI teammate: add one", async () => {
      await page.goto(boardUrl.replace(/\/board\/.*/, "/settings/agents"));
      await page.getByLabel("Name").fill(`Smoke bot ${id}`);
      await page.getByLabel("Specialty").fill("Writes a two-line plan");
      await page.getByRole("button", { name: "Add AI teammate" }).click();
      await expect(page.getByText(`Smoke bot ${id}`)).toBeVisible();
    });

    await timed("AI teammate: assign and wait (real model)", async () => {
      await page.goto(boardUrl);
      await page.getByRole("link", { name: title }).click();
      await sheet.getByRole("combobox", { name: "Assignee" }).click();
      await page.getByRole("option", { name: `Smoke bot ${id} (AI)` }).click();
      await expect(sheet.getByRole("region", { name: "AI teammate" }).getByText("Done")).toBeVisible({ timeout: 120_000 });
      await expect(sheet.getByText(`Smoke bot ${id} (AI)`).first()).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(column(page, "In Review")).toContainText(title);
    });

    for (const [tab, check] of [
      ["Members", "Invite people"],
      ["Labels", "Feature"],
      ["Billing", "AI runs this month"],
      ["Profile", "Profile"],
    ] as const) {
      await timed(`settings: ${tab}`, async () => {
        await page.goto(boardUrl.replace(/\/board\/.*/, `/settings/${tab.toLowerCase()}`));
        await expect(page.getByText(check).first()).toBeVisible();
      });
    }

    await timed("pricing page", async () => {
      await page.goto("/pricing");
      await expect(page.getByLabel("Pro plan")).toContainText("Current plan");
    });

  } finally {
    // Best effort: each cleanup runs on its own and never hides the real failure.
    const home = boardUrl || "/acme";
    await cleanUp("clean up: task", async () => {
      if (!boardUrl) return;
      await page.goto(boardUrl);
      const link = page.getByRole("link", { name: title });
      if (!(await link.count())) return;
      await link.click();
      await sheet.getByRole("button", { name: "Delete task" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
      await expect(page.getByRole("link", { name: title })).toHaveCount(0);
    });
    await cleanUp("clean up: AI teammate", async () => {
      await page.goto(home.replace(/\/board\/.*/, "/settings/agents"));
      const remove = page.getByRole("button", { name: `Remove Smoke bot ${id}` });
      if (!(await remove.count())) return;
      await remove.click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
      await expect(page.getByText(`Smoke bot ${id}`)).toHaveCount(0);
    });
  }

  expect(errors, "no uncaught errors in the browser").toEqual([]);
});
