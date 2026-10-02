import { Check, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { PLAN_CATALOG, PLANS, planFeatures, type Plan } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * Free, Lite and Pro side by side; each page supplies the button under each
 * plan. Shared by the landing page, /pricing and Settings → Billing, so it uses
 * only theme tokens (the marketing pages tint them).
 */
export function PricingTable({ current, actions }: { current?: Plan; actions: Record<Plan, ReactNode> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANS.map((plan) => {
        const info = PLAN_CATALOG[plan];
        const isCurrent = plan === current;
        const featured = plan === "pro" && !current;
        return (
          <div
            key={plan}
            role="group"
            aria-label={`${info.name} plan`}
            className={cn(
              "bg-card text-card-foreground relative flex flex-col rounded-2xl border p-6",
              (isCurrent || featured) && "border-primary/50 ring-primary/20 ring-1",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{info.name}</h3>
              {isCurrent ? <Badge>Current plan</Badge> : featured && <Badge variant="secondary">Most popular</Badge>}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">{info.tagline}</p>
            <p className="mt-6">
              <span className="text-4xl font-semibold tracking-tight tabular-nums">${info.priceMonthly}</span>
              <span className="text-muted-foreground mt-1 block text-sm">
                {info.priceMonthly === 0 ? "Free forever" : "Per team, per month"}
              </span>
            </p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {planFeatures(plan).map((feature) => (
                <li
                  key={feature.label}
                  className={cn("flex items-center gap-2.5", !feature.included && "text-muted-foreground")}
                >
                  {feature.included ? (
                    <Check className="text-primary size-4 shrink-0" aria-hidden />
                  ) : (
                    <Minus className="size-4 shrink-0" aria-hidden />
                  )}
                  <span>
                    {feature.label}
                    {!feature.included && <span className="sr-only"> (not included)</span>}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8">{actions[plan]}</div>
          </div>
        );
      })}
    </div>
  );
}
