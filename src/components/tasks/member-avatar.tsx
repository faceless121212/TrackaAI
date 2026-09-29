import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Minimal member shape passed from server pages to client components. */
export type MemberOption = { id: string; name: string; email: string; avatarUrl?: string | null };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function MemberAvatar({
  member,
  className,
}: {
  member: Pick<MemberOption, "name" | "avatarUrl">;
  className?: string;
}) {
  return (
    <Avatar title={member.name} className={cn("size-6", className)}>
      {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
      <AvatarFallback className="text-[10px] font-medium">{initials(member.name)}</AvatarFallback>
    </Avatar>
  );
}
