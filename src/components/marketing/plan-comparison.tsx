import { Check, Minus } from "lucide-react";
import { PLAN_CATALOG, PLANS, type Plan } from "@/lib/domain";

type Cell = string | boolean;
const limit = (value: number | null, unit = "") => (value === null ? "Unlimited" : `${value}${unit && ` ${unit}`}`);

const ROWS: { label: string; value: (plan: Plan) => Cell }[] = [
  { label: "Price", value: (p) => (PLAN_CATALOG[p].priceMonthly === 0 ? "Free" : `$${PLAN_CATALOG[p].priceMonthly} / month`) },
  { label: "People", value: (p) => limit(PLAN_CATALOG[p].limits.members, PLAN_CATALOG[p].limits.members === 1 ? "person" : "people") },
  { label: "Workspaces", value: (p) => limit(PLAN_CATALOG[p].limits.workspaces) },
  { label: "AI runs per month", value: (p) => limit(PLAN_CATALOG[p].limits.aiRuns) },
  { label: "Kanban boards, realtime, keyboard shortcuts", value: () => true },
  { label: "AI task writer and breakdown", value: () => true },
  { label: "Ask AI chat", value: () => true },
  { label: "Board copilot", value: (p) => PLAN_CATALOG[p].features.copilot },
  { label: "AI teammates", value: (p) => PLAN_CATALOG[p].features.aiTeammate },
];

function Value({ cell }: { cell: Cell }) {
  if (cell === true) return <Check className="text-primary mx-auto size-4" aria-label="Included" />;
  if (cell === false) return <Minus className="text-muted-foreground mx-auto size-4" aria-label="Not included" />;
  return <span className="tabular-nums">{cell}</span>;
}

/** Every plan, feature by feature (the /pricing page). */
export function PlanComparison() {
  return (
    <div className="border-mkt-line overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">Plans compared feature by feature</caption>
        <thead>
          <tr className="border-mkt-line border-b">
            <th scope="col" className="text-muted-foreground px-5 py-4 text-left font-normal">
              Feature
            </th>
            {PLANS.map((plan) => (
              <th key={plan} scope="col" className="px-5 py-4 text-center font-semibold">
                {PLAN_CATALOG[plan].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-mkt-line divide-y">
          {ROWS.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="text-muted-foreground px-5 py-3.5 text-left font-normal">
                {row.label}
              </th>
              {PLANS.map((plan) => (
                <td key={plan} className="px-5 py-3.5 text-center">
                  <Value cell={row.value(plan)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
