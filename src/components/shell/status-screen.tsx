import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** A centered message for error, not-found and empty pages. */
export function StatusScreen({
  icon: Icon,
  title,
  children,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
          <Icon className="size-5" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="text-muted-foreground text-sm">{children}</div>
        {actions && <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
