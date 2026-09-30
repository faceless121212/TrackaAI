"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "./status-screen";

/** The body of every error.tsx: what went wrong, a retry and a way home. */
export function ErrorScreen({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      icon={TriangleAlert}
      title="Something went wrong"
      actions={
        <>
          <Button onClick={() => retry()}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Go home</Link>
          </Button>
        </>
      }
    >
      <p>This page couldn&apos;t load. It&apos;s usually temporary, so trying again often works.</p>
      {error.digest && <p className="mt-2 font-mono text-xs">Error reference: {error.digest}</p>}
    </StatusScreen>
  );
}
