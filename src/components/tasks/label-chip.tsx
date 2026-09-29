import type { Label } from "@/lib/domain";

export function LabelDot({ color }: { color: Label["color"] }) {
  return (
    <span
      aria-hidden
      className="size-[7px] shrink-0 rounded-full"
      style={{ backgroundColor: `var(--label-${color})` }}
    />
  );
}

/** Linear-style label pill: hairline border, coloured dot, muted medium-weight text. */
export function LabelChip({ label }: { label: Pick<Label, "name" | "color"> }) {
  return (
    <span className="border-border/70 text-muted-foreground inline-flex h-6 items-center gap-1 rounded-full border pr-2 pl-1.5 text-xs font-medium">
      <LabelDot color={label.color} />
      {label.name}
    </span>
  );
}
