"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import type { AgentOption, MemberOption } from "@/components/tasks/member-avatar";
import {
  filterTasks,
  isFiltered,
  parseBoardFilters,
  positionAt,
  serializeBoardFilters,
  type Board,
  type BoardFilters,
  type Column,
  type Comment,
  type Label,
  type Task,
  type UpdateTaskInput,
  type AgentRun,
} from "@/lib/domain";
import type { ActionResult } from "@/lib/forms";
import { addColumnAction, deleteColumnAction, moveColumnAction, renameColumnAction } from "@/server/actions/boards";
import {
  deleteTaskAction,
  moveTaskAction,
  quickAddTaskAction,
  updateTaskAction,
} from "@/server/actions/tasks";
import { AddColumn, BoardColumn } from "./board-column";
import { BoardHeader } from "./board-header";
import { columnReducer, groupTasks, planTaskMove, taskReducer } from "./board-state";
import { BoardToolbar } from "./board-toolbar";
import { CopilotButton, type CopilotAccess } from "./copilot-panel";
import { CreateTaskDialog } from "./create-task-dialog";
import { SortableTaskCard, TaskCardView } from "./task-card";
import { TaskSheet } from "./task-sheet";
import { useBoardRealtime, type RealtimeConfig } from "./use-board-realtime";

export type BoardViewProps = {
  board: Board;
  workspaceName: string;
  columns: Column[];
  tasks: Task[];
  members: MemberOption[];
  labels: Label[];
  comments: Comment[];
  openTaskId: string | null;
  currentUserId: string;
  canManage: boolean;
  canModerate: boolean;
  /** Supabase Realtime settings, or null on the mock backend. */
  realtime: RealtimeConfig;
  /** Whether the AI task writer and breakdown are available. */
  aiEnabled: boolean;
  /** The team's AI teammates. */
  agents: AgentOption[];
  /** Whether AI teammates can be newly assigned (Pro). */
  canAssignAgents: boolean;
  /** The open task's AI teammate runs, newest first. */
  agentRuns: AgentRun[];
  /** The board copilot: on (Pro), an upgrade note, or hidden (null: AI not set up). */
  copilot: CopilotAccess | null;
};

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable=true]"));
}

export function BoardView(props: BoardViewProps) {
  const { board, members, labels, currentUserId, canManage } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tasks, applyTask] = useOptimistic(props.tasks, taskReducer);
  const [columns, applyColumn] = useOptimistic(props.columns, columnReducer);
  const [createOpen, setCreateOpen] = useState(false);
  // Pending while any board mutation is in flight; drives aria-busy and "Saving…".
  const [saving, startSaving] = useTransition();
  // During a drag: visible task ids per column, rearranged as the card moves.
  const [dragItems, setDragItems] = useState<Record<string, string[]> | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const filters = useMemo(() => parseBoardFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const visible = useMemo(
    () => groupTasks(columns, filterTasks(tasks, filters, currentUserId)),
    [columns, tasks, filters, currentUserId],
  );
  const counts = useMemo(() => groupTasks(columns, tasks), [columns, tasks]);
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const rowIds = useMemo(
    () => new Set([...props.tasks.map((task) => task.id), ...props.columns.map((column) => column.id)]),
    [props.tasks, props.columns],
  );
  useBoardRealtime(board.id, props.realtime, rowIds);
  const items =
    dragItems ?? Object.fromEntries(Object.entries(visible).map(([id, list]) => [id, list.map((t) => t.id)]));

  const navigate = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );
  const replaceParams = (update: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    update(params);
    navigate(params);
  };
  // Filters live in the URL so a filtered board can be shared or reloaded.
  const setFilters = useCallback(
    (next: BoardFilters) => navigate(serializeBoardFilters(next, new URLSearchParams(searchParams.toString()))),
    [navigate, searchParams],
  );
  const taskHref = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("task", key);
    return `${pathname}?${params}`;
  };

  /** Applies an optimistic update, runs the action, and toasts on failure (the UI then reverts). */
  function mutate(optimistic: () => void, action: () => Promise<ActionResult>) {
    startSaving(async () => {
      optimistic();
      const result = await action();
      if (!result.ok) toast.error(result.error);
      else if (result.warning) toast.warning(result.warning);
    });
  }

  // "C" opens the create dialog unless the user is typing or another dialog is open.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "c" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || document.querySelector("[role=dialog], [role=alertdialog]")) return;
      event.preventDefault();
      setCreateOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // ---- drag & drop -------------------------------------------------------

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const containerOf = (id: string, source: Record<string, string[]>) =>
    id in source ? id : Object.keys(source).find((columnId) => source[columnId].includes(id));

  function onDragStart({ active }: DragStartEvent) {
    if (active.data.current?.type !== "task") return;
    setActiveTaskId(String(active.id));
    setDragItems(items);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || active.data.current?.type !== "task") return;
    setDragItems((current) => {
      if (!current) return current;
      const from = containerOf(String(active.id), current);
      const to = containerOf(String(over.id), current);
      if (!from || !to || from === to) return current;
      const target = current[to].filter((id) => id !== active.id);
      const overIndex = target.indexOf(String(over.id));
      target.splice(overIndex === -1 ? target.length : overIndex, 0, String(active.id));
      return { ...current, [from]: current[from].filter((id) => id !== active.id), [to]: target };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const activeId = String(active.id);
    const current = dragItems;
    setDragItems(null);
    setActiveTaskId(null);
    if (!over) return;

    if (active.data.current?.type === "column") {
      const ids = columns.map((column) => column.id);
      const overColumn = containerOf(String(over.id), items) ?? String(over.id);
      const from = ids.indexOf(activeId);
      const to = ids.indexOf(overColumn);
      if (from === -1 || to === -1 || from === to) return;
      const others = columns.filter((column) => column.id !== activeId).map((column) => column.position);
      mutate(
        () => applyColumn({ type: "move", id: activeId, position: positionAt(others, to) }),
        () => moveColumnAction(activeId, to),
      );
      return;
    }

    if (!current) return;
    const columnId = containerOf(activeId, current);
    if (!columnId) return;
    let ids = current[columnId];
    const overIndex = ids.indexOf(String(over.id));
    if (overIndex !== -1) ids = arrayMove(ids, ids.indexOf(activeId), overIndex);

    const plan = planTaskMove(tasks, activeId, columnId, ids);
    if (!plan) return;
    mutate(
      () => applyTask({ type: "move", id: activeId, columnId, position: plan.position }),
      () => moveTaskAction(activeId, columnId, plan.index),
    );
  }

  // ---- task & column mutations --------------------------------------------

  function quickAdd(columnId: string, title: string) {
    const first = counts[columnId]?.[0];
    const now = new Date().toISOString();
    const draft: Task = {
      id: `draft-${crypto.randomUUID()}`,
      boardId: board.id,
      columnId,
      number: 0,
      key: "…",
      title,
      description: "",
      priority: "none",
      assignee: null,
      labelIds: [],
      dueDate: null,
      position: positionAt(first ? [first.position] : [], 0),
      parentId: null,
      createdBy: currentUserId,
      createdAt: now,
      updatedAt: now,
    };
    mutate(() => applyTask({ type: "add", task: draft }), () => quickAddTaskAction(columnId, title));
  }

  function addColumn(name: string) {
    const last = columns.at(-1);
    const column = { id: `draft-${crypto.randomUUID()}`, boardId: board.id, name, position: positionAt(last ? [last.position] : [], 1) };
    mutate(() => applyColumn({ type: "add", column }), () => addColumnAction(board.id, name));
  }

  const openTask = props.openTaskId ? taskById.get(props.openTaskId) : undefined;
  const closeTask = () => replaceParams((params) => params.delete("task"));

  function updateTask(patch: UpdateTaskInput) {
    if (!openTask) return;
    const id = openTask.id;
    mutate(() => applyTask({ type: "update", id, patch }), () => updateTaskAction(id, patch));
  }

  function moveTaskToColumn(columnId: string) {
    if (!openTask || columnId === openTask.columnId) return;
    const id = openTask.id;
    const others = (counts[columnId] ?? []).map((task) => task.position);
    mutate(
      () => applyTask({ type: "move", id, columnId, position: positionAt(others, others.length) }),
      () => moveTaskAction(id, columnId, others.length),
    );
  }

  function deleteTask() {
    if (!openTask) return;
    const { id, key } = openTask;
    closeTask();
    mutate(
      () => applyTask({ type: "delete", id }),
      async () => {
        const result = await deleteTaskAction(id);
        if (result.ok) toast.success(`Deleted ${key}`);
        return result;
      },
    );
  }

  const memberById = new Map(members.map((member) => [member.id, member]));
  const cardProps = (task: Task) => ({
    task,
    href: taskHref(task.key),
    labels: labels.filter((label) => task.labelIds.includes(label.id)),
    assignee:
      task.assignee?.kind === "user"
        ? memberById.get(task.assignee.userId)
        : task.assignee?.kind === "agent"
          ? agentAvatar(props.agents, task.assignee.agentId)
          : undefined,
  });
  const activeTask = activeTaskId ? taskById.get(activeTaskId) : undefined;
  const defaultColumnId = (columns.find((column) => column.name === "Todo") ?? columns[0])?.id ?? "";

  return (
    <div data-slot="board" aria-busy={saving} className="flex min-h-0 flex-1 flex-col gap-4">
      <BoardHeader
        board={board}
        workspaceName={props.workspaceName}
        canManage={canManage}
        actions={
          props.copilot && (
            <CopilotButton
              boardId={board.id}
              access={props.copilot}
              taskTitles={Object.fromEntries(tasks.map((task) => [task.key, task.title]))}
            />
          )
        }
      />
      <BoardToolbar
        filters={filters}
        onChange={setFilters}
        members={members}
        labels={labels}
        onNewTask={() => setCreateOpen(true)}
        saving={saving}
      />

      <DndContext
        id="board-dnd"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setDragItems(null);
          setActiveTaskId(null);
        }}
      >
        <SortableContext items={columns.map((column) => column.id)} strategy={horizontalListSortingStrategy}>
          {/* -ml-4/pl-4: room inside the scroll area for the first column's hover grip. */}
          <div className="-ml-4 flex min-h-0 flex-1 items-start gap-3 overflow-x-auto pb-2 pl-4">
            {columns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                taskIds={items[column.id] ?? []}
                taskCount={counts[column.id]?.length ?? 0}
                filtered={isFiltered(filters)}
                canManage={canManage}
                renderTask={(taskId) => {
                  const task = taskById.get(taskId);
                  return task ? <SortableTaskCard key={task.id} {...cardProps(task)} /> : null;
                }}
                onQuickAdd={(title) => quickAdd(column.id, title)}
                onRename={(name) =>
                  mutate(
                    () => applyColumn({ type: "rename", id: column.id, name }),
                    () => renameColumnAction(column.id, name),
                  )
                }
                onDelete={() =>
                  mutate(() => applyColumn({ type: "delete", id: column.id }), () => deleteColumnAction(column.id))
                }
              />
            ))}
            {canManage && <AddColumn onAdd={addColumn} />}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeTask ? <TaskCardView {...cardProps(activeTask)} className="rotate-2 shadow-lg" /> : null}
        </DragOverlay>
      </DndContext>

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        boardId={board.id}
        columns={columns}
        members={members}
        labels={labels}
        agents={props.canAssignAgents ? props.agents : []}
        defaultColumnId={defaultColumnId}
        aiEnabled={props.aiEnabled}
      />
      <TaskSheet
        task={openTask}
        subtasks={openTask ? tasks.filter((task) => task.parentId === openTask.id) : []}
        agents={props.agents}
        canAssignAgents={props.canAssignAgents}
        agentRuns={props.agentRuns}
        aiEnabled={props.aiEnabled}
        onOpenTask={(task) => replaceParams((params) => params.set("task", task.key))}
        columns={columns}
        members={members}
        labels={labels}
        comments={props.comments}
        currentUserId={currentUserId}
        canModerate={props.canModerate}
        onClose={closeTask}
        onUpdate={updateTask}
        onMove={moveTaskToColumn}
        onDelete={deleteTask}
      />
    </div>
  );
}

function agentAvatar(agents: AgentOption[], id: string) {
  const agent = agents.find((a) => a.id === id);
  return { name: agent ? `${agent.name} (AI)` : "AI teammate (removed)", agent: true };
}
