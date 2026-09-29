import { describe, expect, it } from "vitest";
import { MAX_COPILOT_BODY, parseCopilotRequest } from "./request";

const user = (text: string) => ({ id: "m", role: "user", parts: [{ type: "text", text }] });

describe("parseCopilotRequest", () => {
  it("accepts a normal chat", () => {
    const result = parseCopilotRequest(JSON.stringify({ boardId: "b", messages: [user("hi")] }));
    expect(result).toMatchObject({ ok: true, boardId: "b" });
  });

  it("rejects oversized bodies, long chats, long messages and system messages with a reason", () => {
    expect(parseCopilotRequest("x".repeat(MAX_COPILOT_BODY + 1))).toEqual({ ok: false, status: 413, error: "This chat is too long. Start a new one." });
    expect(parseCopilotRequest(JSON.stringify({ boardId: "b", messages: Array(61).fill(user("hi")) }))).toMatchObject({
      ok: false,
      error: "This chat is too long. Start a new one.",
    });
    expect(parseCopilotRequest(JSON.stringify({ boardId: "b", messages: [user("x".repeat(2001))] }))).toMatchObject({
      ok: false,
      error: "Messages can be up to 2000 characters.",
    });
    expect(
      parseCopilotRequest(JSON.stringify({ boardId: "b", messages: [{ id: "s", role: "system", parts: [] }] })),
    ).toMatchObject({ ok: false, status: 400 });
    expect(parseCopilotRequest("not json")).toMatchObject({ ok: false, status: 400 });
  });
});
