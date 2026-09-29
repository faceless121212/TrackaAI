import type { Metadata } from "next";

export const metadata: Metadata = { title: "My tasks" };

export default function MyTasksPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-2xl font-semibold">My tasks</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Tasks assigned to you will show up here once boards come alive in the next milestone.
      </p>
    </div>
  );
}
