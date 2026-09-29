"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  getToolName,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type InferUITools,
  type UIMessage,
} from "ai";
import { Check, Sparkles, Square, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseAiError } from "@/components/ai/ai-error";
import { Markdown } from "@/components/tasks/markdown";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { createCopilotTools } from "@/server/ai/copilot/tools";
import { describeChange } from "./copilot-changes";

type CopilotMessage = UIMessage<unknown, never, InferUITools<ReturnType<typeof createCopilotTools>>>;
type ToolPart = Extract<CopilotMessage["parts"][number], { toolCallId: string }>;

const MUTATIONS = new Set(["create_task", "update_task", "move_task", "assign_task"]);
const SUGGESTIONS = ["Summarize this board", "What's overdue?", "What's assigned to me?"];

export type CopilotAccess = { status: "on" } | { status: "upgrade"; message: string; upgradeHref?: string };

export function CopilotButton({ boardId, access }: { boardId: string; access: CopilotAccess }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles aria-hidden />
        Copilot
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>Copilot</SheetTitle>
            <SheetDescription>Ask about this board or have it make changes. You approve every change.</SheetDescription>
          </SheetHeader>
          {access.status === "on" ? (
            <CopilotChat boardId={boardId} />
          ) : (
            <div className="space-y-3 p-4 text-sm">
              <p>{access.message}</p>
              {access.upgradeHref && (
                <Button asChild size="sm">
                  <Link href={access.upgradeHref}>See plans</Link>
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function CopilotChat({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const { messages, sendMessage, addToolApprovalResponse, status, stop, error } = useChat<CopilotMessage>({
    transport: new DefaultChatTransport({ api: "/api/ai/copilot", body: { boardId } }),
    // After Approve/Deny, send the decision back so the change runs (or doesn't).
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: ({ message }) => {
      const changed = message.parts.some(
        (part) => isToolUIPart(part) && MUTATIONS.has(getToolName(part)) && part.state === "output-available",
      );
      if (changed) router.refresh();
    },
  });
  const busy = status === "submitted" || status === "streaming";
  const send = (text: string) => {
    if (!text.trim() || busy) return;
    void sendMessage({ text });
    setInput("");
  };
  const errorInfo = parseAiError(error);

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite" aria-busy={busy}>
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
            <div key={message.id} className="bg-muted ml-8 rounded-lg px-3 py-2 text-sm">
              {message.parts.map((part, i) => (part.type === "text" ? <span key={i}>{part.text}</span> : null))}
            </div>
          ) : (
            <div key={message.id} className="space-y-2">
              {message.parts.map((part, i) => {
                if (part.type === "text") return part.text ? <Markdown key={i}>{part.text}</Markdown> : null;
                if (isToolUIPart(part)) {
                  return (
                    <ToolStep
                      key={part.toolCallId}
                      part={part as ToolPart}
                      onRespond={(approved) =>
                        part.state === "approval-requested" &&
                        addToolApprovalResponse({ id: part.approval.id, approved })
                      }
                    />
                  );
                }
                return null;
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
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
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
          <Button type="submit" disabled={!input.trim()}>
            Send
          </Button>
        )}
      </form>
    </>
  );
}

const READ_LABELS: Record<string, [running: string, done: string]> = {
  search_tasks: ["Searching the board…", "Searched the board"],
  summarize_board: ["Reading the board…", "Read the board"],
};

function ToolStep({ part, onRespond }: { part: ToolPart; onRespond: (approved: boolean) => void }) {
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
  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm" role="group" aria-label={`Proposed change: ${change.title}`}>
      <p className="font-medium">{change.title}</p>
      {change.details.length > 0 && (
        <ul className="text-muted-foreground space-y-0.5 text-xs">
          {change.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
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
      {(part.state === "approval-responded" || part.state === "input-available") && (
        <p className="text-muted-foreground text-xs">{part.approval?.approved === false ? "Denied" : "Applying…"}</p>
      )}
      {part.state === "output-available" && <p className="text-xs font-medium">Done</p>}
      {part.state === "output-denied" && <p className="text-muted-foreground text-xs">Denied, nothing changed</p>}
      {part.state === "output-error" && <p className="text-destructive text-xs">Couldn&apos;t apply: {part.errorText}</p>}
    </div>
  );
}
