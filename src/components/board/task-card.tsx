"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, CircleUserRound } from "lucide-react";
import Link from "next/link";
import { LabelChip } from "@/components/tasks/label-chip";
import { MemberAvatar, type MemberOption } from "@/components/tasks/member-avatar";
import { PriorityIcon } from "@/components/tasks/priority";
import type { Label, Task } from "@/lib/domain";
import { cn } from "@/lib/utils";

type CardProps = {
  task: Task;
  href: string;
  labels: Label[];
  assignee: MemberOption | undefined;
};

export function TaskCardView({ task, href, labels, assignee, className }: CardProps & { className?: string }) {
  const hasProperties = task.priority !== "none" || labels.length > 0 || task.dueDate;
  return (
    // Linear's card: id + avatar, title, then a row of property chips.
    <article
      aria-busy={task.id.startsWith("draft-")}
      className={cn(
        "bg-card border-border/70 hover:border-border relative flex flex-col rounded-[9px] border pt-2 pr-2.5 pb-3 pl-3 transition-colors",
        className,
      )}
    >
      <div className="flex h-[22px] items-center justify-between gap-2">
        <span className="text-muted-foreground text-[10px] leading-[14px] tabular-nums">{task.key}</span>
        {assignee ? (
          <MemberAvatar member={assignee} className="size-3.5" fallbackClassName="text-[6px]" />
        ) : (
          <CircleUserRound role="img" aria-label="Unassigned" className="text-muted-foreground size-3.5" />
        )}
      </div>
      {/* Stretched link: the whole card opens the task; drags start from the card. */}
      <Link
        href={href}
        scroll={false}
        draggable={false}
        className="text-foreground/90 line-clamp-3 text-xs leading-[1.4] font-medium after:absolute after:inset-0"
      >
        {task.title}
      </Link>
      {hasProperties && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1">
          {task.priority !== "none" && (
            <span className="border-border/70 grid size-6 place-items-center rounded-full border">
              <PriorityIcon priority={task.priority} className="size-3" />
            </span>
          )}
          {labels.map((label) => (
            <LabelChip key={label.id} label={label} />
          ))}
          {task.dueDate && (
            <span className="border-border/70 text-muted-foreground inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs font-medium">
              <CalendarDays className="size-3" />
              {formatDue(task.dueDate)}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

/** "2026-10-03" → "Oct 3" (UTC, so server and browser agree). */
function formatDue(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function SortableTaskCard(props: CardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: props.task.id,
    data: { type: "task" },
    // Optimistic quick-add drafts have no server id yet.
    disabled: props.task.id.startsWith("draft-"),
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("touch-none", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <TaskCardView {...props} />
    </div>
  );
}
