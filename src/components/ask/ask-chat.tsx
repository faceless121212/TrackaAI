"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type InferUITools, type UIMessage } from "ai";
import { Square } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { parseAiError } from "@/components/ai/ai-error";
import { Markdown } from "@/components/tasks/markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { createAskTools } from "@/server/ai/ask/tools";

type AskMessage = UIMessage<unknown, never, InferUITools<ReturnType<typeof createAskTools>>>;

const SUGGESTIONS = ["What's urgent?", "What's overdue?", "Who has which issues?", "What's stuck in review?"];
const TOOL_LABELS: Record<string, [running: string, done: string]> = {
  search_issues: ["Searching issues…", "Searched issues"],
  get_issue: ["Reading an issue…", "Read an issue"],
  team_overview: ["Counting issues…", "Counted issues"],
};

/** "Ask AI": a read-only chat about the team's issues. The conversation lives in this tab only. */
export function AskChat({ teamSlug }: { teamSlug: string }) {
  const [input, setInput] = useState("");
  // The suggestion and "New chat" buttons vanish when used; keep focus in the input.
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, sendMessage, status, stop, error, setMessages } = useChat<AskMessage>({
    transport: new DefaultChatTransport({ api: "/api/ai/ask", body: { teamSlug } }),
  });
  const busy = status === "submitted" || status === "streaming";
  const send = (text: string) => {
    if (!text.trim() || busy) return;
    void sendMessage({ text });
    setInput("");
    inputRef.current?.focus();
  };
  const errorInfo = parseAiError(error);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
      <div className="flex items-start justify-between gap-4 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Ask AI</h1>
          <p className="text-muted-foreground text-sm">
            Ask about any issue in this team: what&apos;s urgent, what&apos;s overdue, who&apos;s working on what. It can
            read, not change.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => {
              setMessages([]);
              inputRef.current?.focus();
            }}>
            New chat
          </Button>
        )}
      </div>

      {/* role="log" is a polite live region: replies are announced as they arrive. */}
      <div role="log" aria-label="Ask AI conversation" aria-busy={busy} className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <Button key={suggestion} variant="secondary" size="sm" onClick={() => send(suggestion)}>
                {suggestion}
              </Button>
            ))}
          </div>
        )}
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="bg-muted ml-auto w-fit max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
              {message.parts.map((part, i) => (part.type === "text" ? <span key={i}>{part.text}</span> : null))}
            </div>
          ) : (
            <div key={message.id} className="space-y-2">
              {message.parts.map((part, i) => {
                if (part.type === "text") return part.text ? <Markdown key={i} untrusted>{part.text}</Markdown> : null;
                if (!isToolUIPart(part)) return null;
                const labels = TOOL_LABELS[getToolName(part)] ?? ["Looking things up…", "Looked things up"];
                const label =
                  part.state === "output-available" ? labels[1] : part.state === "output-error" ? `${labels[1]} (failed)` : labels[0];
                return (
                  <p key={part.toolCallId} className="text-muted-foreground text-xs">
                    {label}
                  </p>
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
        className="flex items-end gap-2 border-t pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <Textarea
          ref={inputRef}
          aria-label="Ask about your issues"
          placeholder="e.g. What should I work on next?"
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
    </div>
  );
}
