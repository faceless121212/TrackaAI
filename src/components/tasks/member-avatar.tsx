import { cn } from "@/lib/utils";

/** Minimal member shape passed from server pages to client components. */
export type MemberOption = { id: string; name: string; email: string };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function MemberAvatar({ member, className }: { member: Pick<MemberOption, "name">; className?: string }) {
  return (
    <span
      title={member.name}
      className={cn(
        "bg-muted text-muted-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
        className,
      )}
    >
      {initials(member.name)}
    </span>
  );
}
