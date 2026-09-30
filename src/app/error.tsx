"use client";

import { ErrorScreen } from "@/components/shell/error-screen";

export default function RootError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-svh flex-col">
      <ErrorScreen {...props} />
    </main>
  );
}
