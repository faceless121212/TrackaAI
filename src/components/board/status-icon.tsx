import { cn } from "@/lib/utils";

type Status = "backlog" | "todo" | "started" | "review" | "done" | "canceled";

/** Columns are free-form names; map the common ones to Linear-style status glyphs. */
function statusOf(columnName: string): Status {
  const name = columnName.trim().toLowerCase();
  if (/backlog|icebox|later/.test(name)) return "backlog";
  if (/review|qa|testing|verify/.test(name)) return "review";
  if (/progress|doing|started|active/.test(name)) return "started";
  if (/done|complete|shipped|closed/.test(name)) return "done";
  if (/cancel|won.?t|duplicate/.test(name)) return "canceled";
  return "todo";
}

const COLOR: Record<Status, string | undefined> = {
  backlog: undefined,
  todo: undefined,
  started: "var(--label-yellow)",
  review: "var(--label-green)",
  done: "var(--label-purple)",
  canceled: undefined,
};

export function StatusIcon({ columnName, className }: { columnName: string; className?: string }) {
  const status = statusOf(columnName);
  return (
    <svg
      aria-hidden
      viewBox="0 0 14 14"
      className={cn("text-muted-foreground size-3.5 shrink-0", className)}
      style={COLOR[status] ? { color: COLOR[status] } : undefined}
    >
      {status === "backlog" && (
        <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.4 1.65" />
      )}
      {(status === "todo" || status === "started" || status === "review") && (
        <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      )}
      {status === "started" && <path d="M7 3.5a3.5 3.5 0 0 1 0 7Z" fill="currentColor" />}
      {status === "review" && <path d="M7 3.5a3.5 3.5 0 1 1-3.5 3.5H7Z" fill="currentColor" />}
      {status === "done" && (
        <>
          <circle cx="7" cy="7" r="6.5" fill="currentColor" />
          <path d="m4.4 7.2 1.8 1.8 3.5-3.6" fill="none" stroke="var(--background)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {status === "canceled" && (
        <>
          <circle cx="7" cy="7" r="6.5" fill="currentColor" />
          <path d="m5 5 4 4M9 5 5 9" stroke="var(--background)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
