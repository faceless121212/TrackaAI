import "server-only";
import path from "node:path";
import { cookieSession } from "@/server/auth/cookie-session";
import { resolveDataBackend } from "./backend";
import { createMockRepositories } from "./mock/repositories";
import { seedDb } from "./mock/seed";
import { createFileStore } from "./mock/store";
import { createSupabaseRepositories } from "./supabase/repositories";
import { createSupabaseServerClient } from "./supabase/server-client";
import { createAccessTokenClient } from "./supabase/token-client";
import { agentWorkerToken } from "./supabase/worker-token";
import type { Repositories } from "./types";

// One instance per server process (survives dev hot reloads). The mock needs
// it so every request shares the store's write queue; the Supabase instance is
// stateless and builds a session-bound client per call.
const globalForRepos = globalThis as typeof globalThis & { __trackaRepos?: Repositories };

function createRepositories(): Repositories {
  if (resolveDataBackend(process.env.DATA_BACKEND) === "supabase") {
    return createSupabaseRepositories(createSupabaseServerClient);
  }
  // turbopackIgnore: the db file is local runtime state, not something to bundle or trace.
  const file = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.MOCK_DB_PATH || ".data/mock-db.json",
  );
  return createMockRepositories(createFileStore(file, seedDb), cookieSession);
}

export function getRepositories(): Repositories {
  globalForRepos.__trackaRepos ??= createRepositories();
  return globalForRepos.__trackaRepos;
}

/**
 * Repositories for background work after the response (see
 * createAccessTokenClient). Call while the request is still open.
 */
export async function getBackgroundRepositories(): Promise<Repositories> {
  if (resolveDataBackend(process.env.DATA_BACKEND) !== "supabase") return getRepositories();
  const client = await createAccessTokenClient();
  return createSupabaseRepositories(async () => client);
}

/** Whether AI teammate runs can complete on this server (the Supabase backend needs a worker token). */
export function agentWorkerConfigured(): boolean {
  return resolveDataBackend(process.env.DATA_BACKEND) !== "supabase" || agentWorkerToken() !== null;
}

export type * from "./types";
export { AGENT_WORKER_MISSING, ConflictError, NotFoundError, PlanLimitError, RateLimitError } from "./errors";
