import type { Priority } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const PRIORITY_META: Record<Priority, { label: string }> = {
  none: { label: "No priority" },
  low: { label: "Low" },
  medium: { label: "Medium" },
  high: { label: "High" },
  urgent: { label: "Urgent" },
};

const BARS: Partial<Record<Priority, number>> = { low: 1, medium: 2, high: 3 };

/** Linear-style priority glyph: dots for none, 1–3 lit bars, an orange "!" square for urgent. */
export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const props = {
    role: "img",
    "aria-label": PRIORITY_META[priority].label,
    viewBox: "0 0 16 16",
    className: cn("size-4 shrink-0 text-muted-foreground", className),
  };

  if (priority === "urgent") {
    return (
      <svg {...props} style={{ color: "var(--label-orange)" }}>
        <rect x="1" y="1" width="14" height="14" rx="3.5" fill="currentColor" />
        <rect x="7.1" y="3.75" width="1.8" height="5.5" rx="0.9" fill="var(--background)" />
        <circle cx="8" cy="11.6" r="1.05" fill="var(--background)" />
      </svg>
    );
  }

  if (priority === "none") {
    return (
      <svg {...props} fill="currentColor">
        <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.75" />
        <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.75" />
        <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.75" />
      </svg>
    );
  }

  const lit = BARS[priority] ?? 0;
  return (
    <svg {...props} fill="currentColor">
      {[
        { x: 1.5, y: 8, height: 6 },
        { x: 6.5, y: 5, height: 9 },
        { x: 11.5, y: 2, height: 12 },
      ].map((bar, i) => (
        <rect key={bar.x} x={bar.x} y={bar.y} width="3" height={bar.height} rx="1" opacity={i < lit ? 1 : 0.35} />
      ))}
    </svg>
  );
}
