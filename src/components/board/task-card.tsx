"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays } from "lucide-react";
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
  const hasMeta = labels.length > 0 || assignee || task.dueDate;
  return (
    <article
      aria-busy={task.id.startsWith("draft-")}
      className={cn(
        "bg-card hover:border-ring/60 relative space-y-2 rounded-md border p-3 text-sm shadow-xs transition-colors",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground font-mono text-xs">{task.key}</span>
        <PriorityIcon priority={task.priority} />
      </div>
      {/* Stretched link: the whole card opens the task; drags start from the card. */}
      <Link href={href} scroll={false} draggable={false} className="block font-medium after:absolute after:inset-0">
        {task.title}
      </Link>
      {hasMeta && (
        <div className="flex flex-wrap items-center gap-1.5">
          {labels.map((label) => (
            <LabelChip key={label.id} label={label} />
          ))}
          {task.dueDate && (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <CalendarDays className="size-3" />
              {task.dueDate}
            </span>
          )}
          {assignee && <MemberAvatar member={assignee} className="ml-auto" />}
        </div>
      )}
    </article>
  );
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
