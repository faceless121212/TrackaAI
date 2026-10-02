import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { openSettings, signInAsDemo } from "./helpers";

// Automated WCAG 2.1 AA checks (axe) on every screen, in both themes. They
// catch missing names, contrast and ARIA misuse; keyboard flows are covered by
// the feature specs.

/** `scope`: check only inside it (an open dialog; what's behind the overlay is dimmed on purpose). */
async function expectAccessible(page: Page, name: string, scope?: string) {
  // Mid-animation (fading in) text would fail the contrast check.
  // Ignore animations that never "finish": looping decorations (the landing
  // page's meteors, pulses) and scroll-linked ones (its tilt and laptop lid).
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((a) => a.timeline instanceof DocumentTimeline && a.effect?.getComputedTiming().iterations !== Infinity)
      .every((a) => a.playState !== "running"),
  );
  let axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  if (scope) axe = axe.include(scope);
  const { violations } = await axe.analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect.soft(summary, `${name} has accessibility violations`).toEqual([]);
}

for (const theme of ["dark", "light"] as const) {
  test.describe(`${theme} theme`, () => {
    test.use({ colorScheme: theme });
    test.beforeEach(async ({ page }) => {
      // The app follows next-themes' stored choice (dark by default).
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    });

    test("public pages", async ({ page }) => {
      for (const path of ["/", "/sign-in", "/sign-up", "/pricing", "/no-such-page"]) {
        await page.goto(path);
        await expectAccessible(page, path);
      }
    });

    test("app pages, dialogs and panels", async ({ page }) => {
      test.setTimeout(90_000); // a dozen screens, each with a full axe scan
      await signInAsDemo(page);
      await expectAccessible(page, "My tasks");

      await page.getByRole("link", { name: "Engineering", exact: true }).click();
      await expect(page.getByRole("region", { name: "Todo", exact: true })).toBeVisible();
      await expectAccessible(page, "board");

      await page.getByRole("region", { name: "Todo", exact: true }).getByRole("link").first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectAccessible(page, "task sheet", "[role=dialog]");
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: "New task" }).click();
      await expect(page.getByRole("dialog", { name: "New task" })).toBeVisible();
      await expectAccessible(page, "new task dialog", "[role=dialog]");
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: "Copilot" }).click();
      await expect(page.getByRole("dialog", { name: "Copilot" })).toBeVisible();
      await expectAccessible(page, "copilot", "[role=dialog]");
      await page.keyboard.press("Escape");

      await page.getByRole("link", { name: "Ask AI" }).click();
      await expect(page.getByRole("heading", { name: "Ask AI" })).toBeVisible();
      await expectAccessible(page, "Ask AI");

      for (const tab of ["General", "Members", "Labels", "AI teammates", "Billing", "Profile"] as const) {
        await openSettings(page, tab);
        await expectAccessible(page, `settings: ${tab}`);
      }
    });
  });
}
