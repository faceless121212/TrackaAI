# M11 — Marketing site: design

Approved 2026-10-02. A striking dark landing page in the spirit of Linear.app, a product screenshot of the dashboard, a pricing section, and a redesigned pricing page. Built with a design skill and verified with Playwright.

## Decisions (from the user)
- **Hero leads with the AI angle:** "Project management with AI teammates built in".
- **Signed-in visitors to `/` go straight to their team.** The landing page is for signed-out visitors.
- **Sections:** hero with the product screenshot, feature highlights, how it works, pricing, FAQ, closing call to action, footer.
- **Pricing:** one shared pricing component, used on the landing page and on `/pricing`. The page adds a plan comparison and a pricing FAQ.
- **Milestone number:** M8 is the finished board Copilot, so this is **M11**.

## Look
- **Dark only on marketing pages:** near-black background, radial glow behind the hero, faint grid, hairline borders.
- **Typography:** large, tight headlines with a white-to-grey gradient; Geist Sans, with Geist Mono for small labels.
- **Colour:** built on the app's existing theme tokens. Marketing accents are named CSS variables, never one-off colour values.
- **Responsive and motion:** mobile-first, works from 375 px; motion is subtle and respects `prefers-reduced-motion`.

## Pages
1. **`/`**
   - Signed out: the landing page.
   - Signed in: redirect to the user's first team (or onboarding).
   - Supabase's `/?code=` callback forward keeps working.
2. **`/pricing`:** the shared table, a comparison grid and an FAQ. The existing signed-in behaviour (current plan, links to billing) is kept.

## Product screenshot
- **Source:** the mock backend's seeded "Acme" Engineering board, at 1440×900 in the dark theme.
- **Asset:** `public/marketing/dashboard.png`, served with `next/image`.
- **Retaking it:** `pnpm screenshot` reproduces it with Playwright. The first capture is taken with the Playwright MCP.

## Quality checks
- **CI (Playwright, `e2e/marketing.spec.ts`):**
  - axe WCAG AA on `/` and `/pricing`;
  - no horizontal overflow at 375, 768 and 1440 px;
  - every image loads and there are no console errors;
  - navigation and calls to action reach `/sign-up`, `/sign-in` and `/pricing`;
  - FAQ items open and close;
  - signed-in visitors to `/` reach their team.
- **Locally (`pnpm test:visual`):** `toHaveScreenshot` baselines at three widths. Kept out of CI because font rendering differs between macOS and Linux.
- **Manual pass:** a design review in the browser at each width before the PR.

## Out of scope
Blog, changelog, analytics, a custom domain, and light-mode marketing pages.
