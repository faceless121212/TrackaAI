export type Status = "backlog" | "todo" | "started" | "review" | "done" | "canceled";

/** Columns are free-form names; map the common ones to Linear-style status glyphs. */
export function statusOf(columnName: string): Status {
  const name = columnName.trim().toLowerCase();
  // "Not started", "Not done", "Inactive" describe the absence of a state.
  if (/\bnot\b|\binactive\b/.test(name)) return "todo";
  if (/\b(backlog|icebox|later)\b/.test(name)) return "backlog";
  if (/\b(cancel(l?ed)?|won'?t|duplicate)\b/.test(name)) return "canceled";
  if (/\b(review|qa|testing|verify)\b/.test(name)) return "review";
  if (/\b(done|complete(d)?|shipped|closed)\b/.test(name)) return "done";
  if (/\b(progress|doing|started|active)\b/.test(name)) return "started";
  return "todo";
}

/** Done or canceled: nothing left to do. */
export function isResolved(status: Status): boolean {
  return status === "done" || status === "canceled";
}
