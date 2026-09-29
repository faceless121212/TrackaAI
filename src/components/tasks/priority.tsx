import { Minus, SignalHigh, SignalLow, SignalMedium, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Priority } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const PRIORITY_META: Record<Priority, { label: string; icon: LucideIcon }> = {
  none: { label: "No priority", icon: Minus },
  low: { label: "Low", icon: SignalLow },
  medium: { label: "Medium", icon: SignalMedium },
  high: { label: "High", icon: SignalHigh },
  urgent: { label: "Urgent", icon: TriangleAlert },
};

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const { label, icon: Icon } = PRIORITY_META[priority];
  return (
    <Icon
      role="img"
      aria-label={label}
      className={cn(
        "size-4 shrink-0",
        priority === "urgent" ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    />
  );
}
