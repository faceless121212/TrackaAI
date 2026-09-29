"use client";

import { SquareKanban } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenuSubButton } from "@/components/ui/sidebar";

export function BoardLink({ href, name }: { href: string; name: string }) {
  const pathname = usePathname();
  return (
    <SidebarMenuSubButton asChild isActive={pathname === href}>
      <Link href={href}>
        <SquareKanban />
        <span>{name}</span>
      </Link>
    </SidebarMenuSubButton>
  );
}
