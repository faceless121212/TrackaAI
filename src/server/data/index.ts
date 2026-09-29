import "server-only";
import path from "node:path";
import { resolveDataBackend } from "./backend";
import { createMockRepositories } from "./mock/repositories";
import { seedDb } from "./mock/seed";
import { createFileStore } from "./mock/store";
import type { Repositories } from "./types";

// One instance per server process (survives dev hot reloads), so every request
// shares the mock store's write queue.
const globalForRepos = globalThis as typeof globalThis & { __trackaRepos?: Repositories };

export function getRepositories(): Repositories {
  if (!globalForRepos.__trackaRepos) {
    const backend = resolveDataBackend(process.env.DATA_BACKEND);
    if (backend === "supabase") {
      throw new Error('The Supabase backend arrives in M4. Set DATA_BACKEND="mock" for now.');
    }
    // turbopackIgnore: the db file is local runtime state, not something to bundle or trace.
    const file = path.resolve(
      /* turbopackIgnore: true */ process.cwd(),
      process.env.MOCK_DB_PATH || ".data/mock-db.json",
    );
    globalForRepos.__trackaRepos = createMockRepositories(createFileStore(file, seedDb));
  }
  return globalForRepos.__trackaRepos;
}

export type * from "./types";
export { ConflictError, NotFoundError } from "./errors";
