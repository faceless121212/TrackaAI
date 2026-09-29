"use client";

import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Ellipsis, GripVertical, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Column } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { InlineInput } from "./inline-input";
import { StatusIcon } from "./status-icon";

type BoardColumnProps = {
  column: Column;
  /** Ids rendered in this column, in order (visible tasks only). */
  taskIds: string[];
  /** All tasks in the column, including filtered-out ones (gates column delete). */
  taskCount: number;
  /** Whether board filters are hiding some tasks. */
  filtered: boolean;
  canManage: boolean;
  renderTask: (taskId: string) => ReactNode;
  onQuickAdd: (title: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

export function BoardColumn({
  column,
  taskIds,
  taskCount,
  filtered,
  canManage,
  renderTask,
  onQuickAdd,
  onRename,
  onDelete,
}: BoardColumnProps) {
  const [adding, setAdding] = useState(false);
  // Optimistically added columns have no server id until the add completes.
  const isDraft = column.id.startsWith("draft-");
  const canEdit = canManage && !isDraft;
  const [renaming, setRenaming] = useState(false);
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({
      id: column.id,
      data: { type: "column" },
      // Everyone can drop tasks here; only managers can drag the column itself.
      disabled: { draggable: !canEdit, droppable: isDraft },
    });

  return (
    <section
      ref={setNodeRef}
      aria-label={column.name}
      aria-busy={isDraft}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // Linear's columns have no box: just a header and a stack of cards.
      className={cn("group/column flex w-[300px] shrink-0 flex-col", isDragging && "opacity-50")}
    >
      <header className="relative flex h-9 items-center gap-2 pr-0.5 pl-1">
        {canEdit && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Reorder ${column.name}`}
            // Out of the flow so the header lines up like Linear's; shown on hover/focus.
            className="text-muted-foreground hover:text-foreground absolute top-1/2 -left-3.5 -translate-y-1/2 cursor-grab touch-none opacity-0 group-hover/column:opacity-100 focus-visible:opacity-100"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </button>
        )}
        <StatusIcon columnName={column.name} />
        {renaming ? (
          <InlineInput
            aria-label="Column name"
            className="h-7"
            initialValue={column.name}
            submitOnBlur
            onSubmit={(name) => {
              setRenaming(false);
              if (name !== column.name) onRename(name);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <h2 className="text-foreground/90 truncate text-xs font-medium">{column.name}</h2>
        )}
        <span className="text-muted-foreground text-xs tabular-nums">{taskIds.length}</span>
        <div className="text-muted-foreground ml-auto flex items-center">
          {!isDraft && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              aria-label={`Add task to ${column.name}`}
              onClick={() => setAdding(true)}
            >
              <Plus className="size-3.5" />
            </Button>
          )}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6" aria-label={`Column actions for ${column.name}`}>
                  <Ellipsis className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setRenaming(true)}>Rename</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" disabled={taskCount > 0} onSelect={onDelete}>
                  {taskCount > 0 ? "Delete (move tasks first)" : "Delete column"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
      {adding && (
        <div className="pb-2">
          <InlineInput
            aria-label={`New task in ${column.name}`}
            placeholder="Task title, then Enter"
            keepOpen
            onSubmit={onQuickAdd}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto pb-2">
          {taskIds.map(renderTask)}
          {taskIds.length === 0 && (
            <p className="text-muted-foreground border-border/60 rounded-[9px] border border-dashed py-6 text-center text-xs">
              {filtered && taskCount > 0 ? "No matching tasks" : "No tasks"}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export function AddColumn({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-[300px] shrink-0 pt-1">
      {open ? (
        <InlineInput
          aria-label="New column name"
          placeholder="Column name, then Enter"
          onSubmit={(name) => {
            onAdd(name);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      ) : (
        <Button variant="ghost" className="text-muted-foreground w-full justify-start" onClick={() => setOpen(true)}>
          <Plus />
          Add column
        </Button>
      )}
    </div>
  );
}
