import type { Label } from "@/lib/domain";

export function LabelDot({ color }: { color: Label["color"] }) {
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: `var(--label-${color})` }}
    />
  );
}

export function LabelChip({ label }: { label: Pick<Label, "name" | "color"> }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
      <LabelDot color={label.color} />
      {label.name}
    </span>
  );
}
