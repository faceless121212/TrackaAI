"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type InferUITools,
  type UIMessage,
} from "ai";
import { Check, Sparkles, Square, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { parseAiError } from "@/components/ai/ai-error";
import { Markdown } from "@/components/tasks/markdown";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { createCopilotTools } from "@/server/ai/copilot/tools";
import { describeChange } from "./copilot-changes";

type CopilotMessage = UIMessage<unknown, never, InferUITools<ReturnType<typeof createCopilotTools>>>;
type Part = CopilotMessage["parts"][number];
type ToolPart = Extract<Part, { toolCallId: string }>;

const MUTATIONS = new Set(["create_task", "update_task", "move_task", "assign_task"]);
const SUGGESTIONS = ["Summarize this board", "What's overdue?", "What's assigned to me?"];

export type CopilotAccess = { status: "on" } | { status: "upgrade"; message: string; upgradeHref?: string };

type CopilotProps = { boardId: string; access: CopilotAccess; taskTitles: Record<string, string> };

export function CopilotButton({ access, ...props }: CopilotProps) {
  return access.status === "on" ? (
    <CopilotWithChat {...props} />
  ) : (
    <CopilotShell>
      <div className="space-y-3 p-4 text-sm">
        <p>{access.message}</p>
        {access.upgradeHref && (
          <Button asChild size="sm">
            <Link href={access.upgradeHref}>See plans</Link>
          </Button>
        )}
      </div>
    </CopilotShell>
  );
}

function CopilotShell({ children, headerAction }: { children: ReactNode; headerAction?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles aria-hidden />
        Copilot
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
          <SheetHeader className="border-b pr-12">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle>Copilot</SheetTitle>
              {headerAction}
            </div>
            <SheetDescription>Ask about this board or have it make changes. You approve every change.</SheetDescription>
          </SheetHeader>
          {children}
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Keeps the conversation (and any unanswered cards) while the panel is closed. */
function CopilotWithChat({ boardId, taskTitles }: Omit<CopilotProps, "access">) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const chat = useChat<CopilotMessage>({
    transport: new DefaultChatTransport({ api: "/api/ai/copilot", body: { boardId } }),
    // After Approve/Deny on every card of a step, send the decisions back.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: ({ message }) => {
      const parts = message.parts.filter(isToolUIPart);
      if (parts.some((p) => MUTATIONS.has(getToolName(p)) && p.state === "output-available")) router.refresh();
      setAnnouncement(parts.some((p) => p.state === "approval-requested") ? "The copilot proposed changes." : "The copilot replied.");
    },
  });
  const { messages, sendMessage, addToolApprovalResponse, status, stop, error, setMessages } = chat;
  const busy = status === "submitted" || status === "streaming";
  const waiting = messages.at(-1)?.parts.some((p) => isToolUIPart(p) && p.state === "approval-requested") ?? false;
  const send = (text: string) => {
    if (!text.trim() || busy || waiting) return;
    void sendMessage({ text });
    setInput("");
  };
  const errorInfo = parseAiError(error);

  return (
    <CopilotShell
      headerAction={
        messages.length > 0 && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setMessages([])}>
            New chat
          </Button>
        )
      }
    >
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <div role="log" aria-label="Copilot conversation" aria-busy={busy} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Try:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <Button key={suggestion} variant="secondary" size="sm" onClick={() => send(suggestion)}>
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="bg-muted ml-8 rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
              {message.parts.map((part, i) => (part.type === "text" ? <span key={i}>{part.text}</span> : null))}
            </div>
          ) : (
            <div key={message.id} className="space-y-2">
              {message.parts.map((part, i) => {
                if (part.type === "text") return part.text ? <Markdown key={i} untrusted>{part.text}</Markdown> : null;
                if (!isToolUIPart(part)) return null;
                const pendingSiblings = message.parts.some(
                  (other) => other !== part && isToolUIPart(other) && other.state === "approval-requested",
                );
                return (
                  <ToolStep
                    key={part.toolCallId}
                    part={part as ToolPart}
                    taskTitles={taskTitles}
                    waitingForOthers={pendingSiblings}
                    onRespond={(approved) =>
                      part.state === "approval-requested" && addToolApprovalResponse({ id: part.approval.id, approved })
                    }
                  />
                );
              })}
            </div>
          ),
        )}
        {status === "submitted" && <p className="text-muted-foreground text-sm">Thinking…</p>}
        {errorInfo && (
          <p role="alert" className="text-muted-foreground text-sm">
            {errorInfo.message}{" "}
            {errorInfo.upgradeHref && (
              <Link href={errorInfo.upgradeHref} className="text-foreground font-medium underline underline-offset-4">
                See plans
              </Link>
            )}
          </p>
        )}
      </div>
      <form
        className="space-y-2 border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        {waiting && <p className="text-muted-foreground text-xs">Approve or deny the changes above first.</p>}
        <div className="flex items-end gap-2">
          <Textarea
            aria-label="Message the copilot"
            placeholder="Ask or tell the copilot…"
            rows={2}
            className="min-h-0 resize-none"
            value={input}
            maxLength={2000}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send(input);
              }
            }}
          />
          {busy ? (
            <Button type="button" variant="outline" size="icon" aria-label="Stop" onClick={() => void stop()}>
              <Square />
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim() || waiting}>
              Send
            </Button>
          )}
        </div>
      </form>
    </CopilotShell>
  );
}

const READ_LABELS: Record<string, [running: string, done: string]> = {
  search_tasks: ["Searching the board…", "Searched the board"],
  summarize_board: ["Reading the board…", "Read the board"],
};

function ToolStep({
  part,
  taskTitles,
  waitingForOthers,
  onRespond,
}: {
  part: ToolPart;
  taskTitles: Record<string, string>;
  waitingForOthers: boolean;
  onRespond: (approved: boolean) => void;
}) {
  const name = getToolName(part);
  const read = READ_LABELS[name];
  if (read) {
    return (
      <p className="text-muted-foreground text-xs">
        {part.state === "output-available" ? read[1] : part.state === "output-error" ? `${read[1]} (failed)` : read[0]}
      </p>
    );
  }

  const change = describeChange(name, part.input as Record<string, unknown> | undefined);
  const currentTitle = change.key ? taskTitles[change.key.toUpperCase()] : undefined;
  let status: string | null = null;
  if (part.state === "input-streaming" || part.state === "input-available") status = "Preparing…";
  else if (part.state === "approval-responded") {
    status = !part.approval.approved ? "Denied" : waitingForOthers ? "Approved, waiting for your other decisions" : "Applying…";
  }

  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm" role="group" aria-label={`Proposed change: ${change.title}`}>
      <div>
        <p className="font-medium">{change.title}</p>
        {currentTitle && <p className="text-muted-foreground text-xs">{currentTitle}</p>}
      </div>
      {change.details.length > 0 && (
        <ul className="text-muted-foreground space-y-0.5 text-xs">
          {change.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
      {change.text && (
        <details open className="text-xs">
          <summary className="text-muted-foreground cursor-pointer">{change.text.label}</summary>
          {/* Plain text on purpose: this is exactly what would be saved, links and all. */}
          <p className="bg-muted mt-1 max-h-40 overflow-y-auto rounded p-2 font-mono break-words whitespace-pre-wrap">
            {change.text.value}
          </p>
        </details>
      )}
      {part.state === "approval-requested" && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onRespond(true)}>
            <Check aria-hidden />
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => onRespond(false)}>
            <X aria-hidden />
            Deny
          </Button>
        </div>
      )}
      {status && <p className="text-muted-foreground text-xs">{status}</p>}
      {part.state === "output-available" && <p className="text-xs font-medium">Done</p>}
      {part.state === "output-denied" && <p className="text-muted-foreground text-xs">Denied, nothing changed</p>}
      {part.state === "output-error" && <p className="text-destructive text-xs">Couldn&apos;t apply: {part.errorText}</p>}
    </div>
  );
}
