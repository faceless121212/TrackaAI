"use client";

import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { LabelChip, LabelDot } from "@/components/tasks/label-chip";
import { Markdown } from "@/components/tasks/markdown";
import { MemberAvatar, type MemberOption } from "@/components/tasks/member-avatar";
import { PRIORITY_META, PriorityIcon } from "@/components/tasks/priority";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES, type Column, type Comment, type Label, type Task, type UpdateTaskInput } from "@/lib/domain";
import { addCommentAction, deleteCommentAction } from "@/server/actions/comments";
import { BreakdownButton } from "./breakdown-dialog";

type TaskSheetProps = {
  task: Task | undefined;
  /** The open task's sub-tasks, in board order. */
  subtasks: Task[];
  aiEnabled: boolean;
  onOpenTask: (task: Task) => void;
  columns: Column[];
  members: MemberOption[];
  labels: Label[];
  comments: Comment[];
  currentUserId: string;
  canModerate: boolean;
  onClose: () => void;
  onUpdate: (patch: UpdateTaskInput) => void;
  onMove: (columnId: string) => void;
  onDelete: () => void;
};

export function TaskSheet({ task, onClose, ...props }: TaskSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <Sheet open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        ref={contentRef}
        tabIndex={-1}
        // Radix would focus (and select) the title input; start on the panel instead.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
        className="w-full gap-0 overflow-y-auto outline-none sm:max-w-xl"
      >
        {/* Keyed so local drafts (title, description) reset when switching tasks. */}
        {task && <TaskSheetBody key={task.id} task={task} {...props} />}
      </SheetContent>
    </Sheet>
  );
}

function TaskSheetBody({
  task,
  subtasks,
  aiEnabled,
  onOpenTask,
  columns,
  members,
  labels,
  comments,
  currentUserId,
  canModerate,
  onUpdate,
  onMove,
  onDelete,
}: Omit<TaskSheetProps, "task" | "onClose"> & { task: Task }) {
  const assigneeId = task.assignee?.kind === "user" ? task.assignee.userId : "none";

  return (
    <>
      <SheetHeader className="border-b pr-12">
        <SheetDescription className="font-mono">{task.key}</SheetDescription>
        <SheetTitle className="sr-only">{task.title}</SheetTitle>
        <TitleField title={task.title} onSave={(title) => onUpdate({ title })} />
      </SheetHeader>

      <div className="space-y-8 p-4">
        <dl className="grid grid-cols-[6rem_1fr] items-center gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <Select value={task.columnId} onValueChange={onMove}>
              <SelectTrigger size="sm" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </dd>

          <dt className="text-muted-foreground">Priority</dt>
          <dd>
            <Select value={task.priority} onValueChange={(priority) => onUpdate({ priority: priority as Task["priority"] })}>
              <SelectTrigger size="sm" aria-label="Priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    <PriorityIcon priority={priority} />
                    {PRIORITY_META[priority].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </dd>

          <dt className="text-muted-foreground">Assignee</dt>
          <dd>
            <Select
              value={assigneeId}
              onValueChange={(value) =>
                onUpdate({ assignee: value === "none" ? null : { kind: "user", userId: value } })
              }
            >
              <SelectTrigger size="sm" aria-label="Assignee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <MemberAvatar member={member} className="size-5" />
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </dd>

          <dt className="text-muted-foreground">Labels</dt>
          <dd>
            <LabelsPicker labels={labels} selected={task.labelIds} onChange={(labelIds) => onUpdate({ labelIds })} />
          </dd>

          <dt className="text-muted-foreground">Due date</dt>
          <dd>
            <Input
              type="date"
              aria-label="Due date"
              className="h-8 w-44"
              value={task.dueDate ?? ""}
              onChange={(event) => onUpdate({ dueDate: event.target.value || null })}
            />
          </dd>
        </dl>

        <DescriptionField description={task.description} onSave={(description) => onUpdate({ description })} />

        <section aria-labelledby="subtasks-heading" className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 id="subtasks-heading" className="text-sm font-medium">
              Sub-tasks{subtasks.length > 0 && <span className="text-muted-foreground"> · {subtasks.length}</span>}
            </h3>
            {aiEnabled && <BreakdownButton task={task} />}
          </div>
          {subtasks.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {subtasks.map((subtask) => (
                <li key={subtask.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTask(subtask)}
                    className="hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                  >
                    <span className="text-muted-foreground font-mono text-xs">{subtask.key}</span>
                    <span className="truncate">{subtask.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No sub-tasks yet.</p>
          )}
        </section>

        <CommentsSection
          taskId={task.id}
          comments={comments}
          members={members}
          currentUserId={currentUserId}
          canModerate={canModerate}
        />

        <DeleteTaskButton taskKey={task.key} onConfirm={onDelete} />
      </div>
    </>
  );
}

function TitleField({ title, onSave }: { title: string; onSave: (title: string) => void }) {
  const [draft, setDraft] = useState(title);
  return (
    <Input
      aria-label="Title"
      className="-mx-2 h-auto border-transparent px-2 text-lg font-semibold shadow-none"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
      onBlur={() => {
        const next = draft.trim();
        if (!next) setDraft(title);
        else if (next !== title) onSave(next);
      }}
    />
  );
}

function LabelsPicker({
  labels,
  selected,
  onChange,
}: {
  labels: Label[];
  selected: string[];
  onChange: (labelIds: string[]) => void;
}) {
  const chosen = labels.filter((label) => selected.includes(label.id));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Labels" className="h-auto min-h-8 flex-wrap justify-start">
          {chosen.length ? chosen.map((label) => <LabelChip key={label.id} label={label} />) : "Add labels"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {labels.map((label) => (
          <DropdownMenuCheckboxItem
            key={label.id}
            checked={selected.includes(label.id)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selected, label.id] : selected.filter((id) => id !== label.id))
            }
          >
            <LabelDot color={label.color} />
            {label.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DescriptionField({ description, onSave }: { description: string; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(description);
  const [tab, setTab] = useState(description ? "preview" : "write");
  const dirty = draft !== description;

  return (
    <section className="space-y-2">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Description</h3>
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="write">
          <Textarea
            aria-label="Description"
            rows={6}
            placeholder="Add details. Markdown supported."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </TabsContent>
        <TabsContent value="preview" className="min-h-10">
          {draft ? <Markdown>{draft}</Markdown> : <p className="text-muted-foreground text-sm">No description.</p>}
        </TabsContent>
      </Tabs>
      {dirty && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              onSave(draft);
              setTab("preview");
            }}
          >
            Save description
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(description)}>
            Discard
          </Button>
        </div>
      )}
    </section>
  );
}

function CommentsSection({
  taskId,
  comments,
  members,
  currentUserId,
  canModerate,
}: {
  taskId: string;
  comments: Comment[];
  members: MemberOption[];
  currentUserId: string;
  canModerate: boolean;
}) {
  const [state, action, pending] = useFormAction(addCommentAction);
  const memberName = (userId: string) => members.find((m) => m.id === userId)?.name ?? "Former member";

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Comments</h3>
      {comments.length > 0 && (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const name = comment.author.kind === "user" ? memberName(comment.author.userId) : "AI teammate";
            const isAuthor = comment.author.kind === "user" && comment.author.userId === currentUserId;
            return (
              <li key={comment.id} className="rounded-md border p-3">
                <div className="flex items-center gap-2 text-xs">
                  <MemberAvatar member={{ name }} className="size-5" />
                  <span className="font-medium">{name}</span>
                  <time dateTime={comment.createdAt} className="text-muted-foreground" suppressHydrationWarning>
                    {new Date(comment.createdAt).toLocaleString()}
                  </time>
                  {(isAuthor || canModerate) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto size-6"
                      aria-label="Delete comment"
                      onClick={async () => {
                        const result = await deleteCommentAction(comment.id);
                        if (!result.ok) toast.error(result.error);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                <Markdown>{comment.body}</Markdown>
              </li>
            );
          })}
        </ul>
      )}
      <form action={action} className="space-y-2">
        <input type="hidden" name="taskId" value={taskId} />
        <Textarea
          name="body"
          aria-label="Comment"
          rows={3}
          placeholder="Leave a comment. Markdown supported."
          defaultValue={state.values?.body}
        />
        <FormError message={state.fieldErrors?.body?.[0]} />
        <Button type="submit" size="sm" disabled={pending}>
          Comment
        </Button>
      </form>
    </section>
  );
}

function DeleteTaskButton({ taskKey, onConfirm }: { taskKey: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          <Trash2 />
          Delete task
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {taskKey}?</AlertDialogTitle>
          <AlertDialogDescription>This also deletes its comments. It can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
