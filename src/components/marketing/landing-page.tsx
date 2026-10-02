import { ClosingCta } from "./closing-cta";
import { Faq, PRODUCT_FAQ } from "./faq";
import { Features } from "./features";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { MarketingShell } from "./marketing-shell";
import { PricingSection } from "./pricing-section";
import { Workflows } from "./workflows";

export function LandingPage() {
  return (
    <MarketingShell>
      <Hero />
      <Features />
      <Workflows />
      <HowItWorks />
      <PricingSection />
      <Faq items={PRODUCT_FAQ} />
      <ClosingCta />
    </MarketingShell>
  );
}
