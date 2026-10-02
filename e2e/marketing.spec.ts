import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signInAsDemo } from "./helpers";

// Design-quality checks for the marketing pages, run in CI. Pixel snapshots
// live in e2e-visual (`pnpm test:visual`, local only: fonts render differently on CI).

const PAGES = ["/", "/pricing"] as const;
const WIDTHS = [375, 768, 1440] as const;

async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page scrolls sideways").toBe(0);
}

async function expectImagesLoaded(page: Page) {
  // next/image lazy-loads below the fold: scroll through first.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
  });
  const broken = await page.locator("img").evaluateAll((imgs) =>
    (imgs as HTMLImageElement[]).filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src),
  );
  expect(broken).toEqual([]);
}

for (const path of PAGES) {
  test(`${path} is accessible, loads cleanly and never scrolls sideways`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoOverflow(page);
    }
    await expectImagesLoaded(page);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("the landing page leads with AI and shows the product", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("TrackaAI · Project management with AI teammates");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Project management with AI teammates built in");
  await expect(page.getByRole("img", { name: /A TrackaAI board/ })).toBeVisible();
  for (const section of ["Your team, plus teammates that never sleep", "From sign-up to shipped, in three steps", "Simple pricing that grows with your team", "Questions, answered"]) {
    await expect(page.getByRole("heading", { level: 2, name: section })).toBeVisible();
  }
  for (const plan of ["Free", "Lite", "Pro"]) await expect(page.getByLabel(`${plan} plan`)).toBeVisible();
});

test("calls to action lead to sign-up, sign-in and pricing", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Get started free" }).click();
  await expect(page).toHaveURL(/\/sign-up$/);

  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.goto("/");
  await page.getByRole("link", { name: "Compare every plan" }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.getByRole("table", { name: "Plans compared feature by feature" })).toBeVisible();

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Features" }).click();
  await expect(page).toHaveURL(/\/#features$/);
  await expect(page.getByRole("heading", { name: "Your team, plus teammates that never sleep" })).toBeInViewport();
});

test("FAQ answers open and close from the keyboard", async ({ page }) => {
  await page.goto("/");
  const question = page.getByText("Can AI change my board without asking?");
  const answer = page.getByText(/The Copilot proposes every change as a card/);
  await expect(answer).toBeHidden();
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(answer).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(answer).toBeHidden();
});

test("signed-in members skip the landing page", async ({ page }) => {
  await signInAsDemo(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/acme$/);
  await page.goto("/pricing");
  await expect(page.getByRole("banner").getByRole("link", { name: "Open app" })).toBeVisible();
});
