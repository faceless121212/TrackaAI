// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { agentWorkerToken } from "./supabase/worker-token";

vi.mock("server-only", () => ({}));

afterEach(() => vi.unstubAllEnvs());

describe("agentWorkerToken", () => {
  it("needs at least 32 characters", () => {
    vi.stubEnv("AGENT_WORKER_SECRET", "");
    expect(agentWorkerToken()).toBeNull();
    vi.stubEnv("AGENT_WORKER_SECRET", "x".repeat(31));
    expect(agentWorkerToken()).toBeNull();
    vi.stubEnv("AGENT_WORKER_SECRET", "x".repeat(32));
    expect(agentWorkerToken()).toBe("x".repeat(32));
  });
});

describe("agentWorkerConfigured", () => {
  const load = async () => (await import("./index")).agentWorkerConfigured;

  it("is always true on the mock backend, which has no worker check", async () => {
    vi.stubEnv("DATA_BACKEND", "mock");
    vi.stubEnv("AGENT_WORKER_SECRET", "");
    expect((await load())()).toBe(true);
  });

  it("needs the token on the Supabase backend", async () => {
    vi.stubEnv("DATA_BACKEND", "supabase");
    vi.stubEnv("AGENT_WORKER_SECRET", "");
    expect((await load())()).toBe(false);
    vi.stubEnv("AGENT_WORKER_SECRET", "y".repeat(64));
    expect((await load())()).toBe(true);
  });
});
