import Link from "next/link";

/** For a stream that ended early or produced invalid output. */
export const INCOMPLETE = "The AI couldn't finish. Please try again.";

/** The AI routes answer failures with JSON ({ error, upgradeHref }); anything else is a generic failure. */
export function parseAiError(error: Error | undefined): { message: string; upgradeHref?: string } | null {
  if (!error) return null;
  try {
    const body = JSON.parse(error.message) as { error?: unknown; upgradeHref?: unknown };
    if (typeof body.error === "string") {
      return { message: body.error, upgradeHref: typeof body.upgradeHref === "string" ? body.upgradeHref : undefined };
    }
  } catch {
    // Not JSON: a short plain message (a failed stream, "Failed to fetch") is shown as is.
    if (error.message && error.message.length <= 200 && !error.message.includes("<")) {
      return { message: error.message };
    }
  }
  return { message: INCOMPLETE };
}

export function AiError({ error }: { error: Error | undefined }) {
  const info = parseAiError(error);
  if (!info) return null;
  return (
    <p role="alert" className="text-muted-foreground text-sm">
      {info.message}{" "}
      {info.upgradeHref && (
        <Link href={info.upgradeHref} className="text-foreground font-medium underline underline-offset-4">
          See plans
        </Link>
      )}
    </p>
  );
}
