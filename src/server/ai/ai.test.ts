// @vitest-environment node
import { describe, expect, it } from "vitest";
import { taskDraftSchema } from "@/lib/domain";
import { jsonStreamModel } from "./mock-model";
import { breakdownPrompt, taskWriterPrompt } from "./prompts";
import { finalUsage, streamStructured } from "./stream";

describe("prompts", () => {
  it("lists the team's labels and fences the user's request", () => {
    const prompt = taskWriterPrompt({ request: "export csv", boardName: "Eng", labels: [{ name: "Bug" }, { name: "Feature" }] });
    expect(prompt).toContain("Available labels: Bug, Feature");
    expect(prompt).toContain("<request>\nexport csv\n</request>");
    expect(taskWriterPrompt({ request: "x", boardName: "Eng", labels: [] })).toContain("Available labels: (none)");
  });

  it("fences the parent task for a breakdown", () => {
    expect(breakdownPrompt({ key: "ENG-4", title: "Build the board", description: "" })).toBe(
      "<task>\nENG-4: Build the board\n\n(no description)\n</task>",
    );
  });
});

describe("streamStructured", () => {
  it("streams partial objects, returns the validated object and reports token usage", async () => {
    const draft = { title: "Add CSV export", description: "Export.", priority: "medium", labels: ["Feature"] };
    const result = streamStructured({
      model: jsonStreamModel(JSON.stringify(draft), { input: 120, output: 45 }),
      schema: taskDraftSchema,
      instructions: "x",
      prompt: "y",
    });
    const partials = [];
    for await (const partial of result.partialOutputStream) partials.push(partial);
    expect(partials.length).toBeGreaterThan(0);
    expect(await result.output).toEqual(draft);
    expect(await finalUsage(result)).toEqual({ inputTokens: 120, outputTokens: 45 });
  });
});
