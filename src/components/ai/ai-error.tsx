import Link from "next/link";

/** The AI routes answer failures with JSON ({ error, upgradeHref }); anything else is a generic failure. */
export function parseAiError(error: Error | undefined): { message: string; upgradeHref?: string } | null {
  if (!error) return null;
  try {
    const body = JSON.parse(error.message) as { error?: unknown; upgradeHref?: unknown };
    if (typeof body.error === "string") {
      return { message: body.error, upgradeHref: typeof body.upgradeHref === "string" ? body.upgradeHref : undefined };
    }
  } catch {
    // not JSON: a network error or a failed stream
  }
  return { message: "The AI couldn't finish. Please try again." };
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
