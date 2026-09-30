import { Bot } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Minimal member shape passed from server pages to client components. */
export type MemberOption = { id: string; name: string; email: string; avatarUrl?: string | null };

/** An AI teammate, shown like a member with a bot avatar. */
export type AgentOption = { id: string; name: string; specialty: string };

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
  fallbackClassName,
}: {
  member: Pick<MemberOption, "name" | "avatarUrl"> & { agent?: boolean };
  className?: string;
  /** Initials size for very small avatars (e.g. 14px on board cards). */
  fallbackClassName?: string;
}) {
  return (
    <Avatar title={member.name} className={cn("size-6", className)}>
      {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
      <AvatarFallback className={cn("text-[10px] font-medium", fallbackClassName)}>
        {member.agent ? <Bot className="size-[70%]" aria-hidden /> : initials(member.name)}
      </AvatarFallback>
    </Avatar>
  );
}
