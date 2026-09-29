import { Check, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_CATALOG, PLANS, planFeatures, type Plan } from "@/lib/domain";
import { cn } from "@/lib/utils";

/** Free, Lite and Pro side by side; each page supplies the button under each plan. */
export function PricingTable({ current, actions }: { current?: Plan; actions: Record<Plan, ReactNode> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANS.map((plan) => {
        const info = PLAN_CATALOG[plan];
        const isCurrent = plan === current;
        return (
          <Card
            key={plan}
            aria-label={`${info.name} plan`}
            className={cn("flex flex-col", isCurrent && "border-primary", plan === "pro" && !current && "border-primary")}
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{info.name}</CardTitle>
                {isCurrent && <Badge>Current plan</Badge>}
              </div>
              <CardDescription>{info.tagline}</CardDescription>
              <p className="pt-2">
                <span className="text-3xl font-semibold">${info.priceMonthly}</span>
                <span className="text-muted-foreground text-sm">
                  {info.priceMonthly === 0 ? " forever" : " / month per team"}
                </span>
              </p>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2 text-sm">
                {planFeatures(plan).map((feature) => (
                  <li
                    key={feature.label}
                    className={cn("flex items-center gap-2", !feature.included && "text-muted-foreground")}
                  >
                    {feature.included ? (
                      <Check className="text-primary size-4" aria-hidden />
                    ) : (
                      <Minus className="size-4" aria-hidden />
                    )}
                    <span>
                      {feature.label}
                      {!feature.included && <span className="sr-only"> (not included)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>{actions[plan]}</CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
