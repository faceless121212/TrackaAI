"use client";

import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Ellipsis, GripVertical, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
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
      className={cn("bg-muted/40 flex w-72 shrink-0 flex-col rounded-lg border", isDragging && "opacity-50")}
    >
      <header className="flex items-center gap-1.5 px-2 pt-2 pb-1">
        {canEdit && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Reorder ${column.name}`}
            className="text-muted-foreground hover:text-foreground cursor-grab touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        )}
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
          <h2 className="truncate text-sm font-medium">{column.name}</h2>
        )}
        <Badge variant="secondary">{taskIds.length}</Badge>
        <div className="ml-auto flex items-center">
          {!isDraft && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Add task to ${column.name}`}
              onClick={() => setAdding(true)}
            >
              <Plus />
            </Button>
          )}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" aria-label={`Column actions for ${column.name}`}>
                  <Ellipsis />
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
        <div className="px-2 pt-1">
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
        <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2">
          {taskIds.map(renderTask)}
          {taskIds.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-xs">
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
    <div className="w-72 shrink-0">
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
