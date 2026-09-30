"use client";

import { ErrorScreen } from "@/components/shell/error-screen";

// Inside the team layout, so the sidebar stays usable when one page fails.
export default function TeamError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorScreen {...props} />;
}
