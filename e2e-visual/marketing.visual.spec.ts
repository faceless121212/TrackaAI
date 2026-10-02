import { expect, test } from "@playwright/test";

// Pixel baselines for the marketing pages. Update after an intended design
// change with `pnpm test:visual --update-snapshots`, then review the diff.
for (const width of [375, 768, 1440]) {
  for (const [name, path] of [["landing", "/"], ["pricing", "/pricing"]] as const) {
    test(`${name} at ${width}px @visual`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      // The footer year changes every January; keep it out of the comparison.
      await expect(page).toHaveScreenshot(`${name}-${width}.png`, {
        fullPage: true,
        mask: [page.locator("[data-copyright-year]")],
      });
    });
  }
}
