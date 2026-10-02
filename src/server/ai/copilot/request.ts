import { z } from "zod";
import { idSchema } from "@/lib/domain";

/** The client resends the whole chat each turn; these bound what one request can cost. */
export const MAX_COPILOT_BODY = 200_000; // bytes of JSON
export const MAX_COPILOT_MESSAGES = 60;
export const MAX_USER_MESSAGE = 2000; // characters, as in the panel's input

const TOO_LONG = "This chat is too long. Start a new one.";

const messageSchema = z
  .object({
    role: z.enum(["user", "assistant"]), // never "system": the instructions are the server's
    parts: z.array(z.looseObject({ type: z.string() })),
  })
  .loose();

export type ChatRequest<Scope> =
  | ({ ok: true; messages: unknown[] } & Scope)
  | { ok: false; status: number; error: string };

/** The copilot's request: one board's chat. */
export function parseCopilotRequest(body: string): ChatRequest<{ boardId: string }> {
  return parseChatRequest(body, z.object({ boardId: idSchema }));
}

/**
 * A chat request (the AI SDK resends the whole conversation each turn) plus
 * `scope`, the fields saying what the chat is about. Bounds size and length.
 */
export function parseChatRequest<S extends z.ZodObject>(body: string, scope: S): ChatRequest<z.infer<S>> {
  const requestSchema = scope.extend({ messages: z.array(messageSchema).min(1) });
  if (body.length > MAX_COPILOT_BODY) return { ok: false, status: 413, error: TOO_LONG };
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return { ok: false, status: 400, error: "Invalid request" };
  }
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) return { ok: false, status: 400, error: "Invalid request" };
  const { messages, ...rest } = parsed.data as { messages: z.infer<typeof messageSchema>[] } & z.infer<S>;
  if (messages.length > MAX_COPILOT_MESSAGES) return { ok: false, status: 400, error: TOO_LONG };
  const tooLong = messages.some(
    (m) =>
      m.role === "user" &&
      m.parts.some((p) => p.type === "text" && typeof p.text === "string" && p.text.length > MAX_USER_MESSAGE),
  );
  if (tooLong) return { ok: false, status: 400, error: `Messages can be up to ${MAX_USER_MESSAGE} characters.` };
  return { ok: true, ...(rest as z.infer<S>), messages };
}
