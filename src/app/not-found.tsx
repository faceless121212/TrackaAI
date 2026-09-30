import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusScreen } from "@/components/shell/status-screen";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col">
      <StatusScreen
        icon={SearchX}
        title="Page not found"
        actions={
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
        }
      >
        This page doesn&apos;t exist, or you don&apos;t have access to it. If someone sent you the link, ask them
        to invite you to their team.
      </StatusScreen>
    </main>
  );
}
