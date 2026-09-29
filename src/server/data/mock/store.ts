import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { MockDb } from "./db";

/**
 * All mock-backend access goes through `read` / `write`. A `write` callback
 * mutates the db in place; if it throws, nothing is persisted.
 */
export type MockStore = {
  read<T>(fn: (db: MockDb) => T): Promise<T>;
  write<T>(fn: (db: MockDb) => T): Promise<T>;
};

export function createMemoryStore(initial: MockDb): MockStore & { snapshot(): MockDb } {
  let current = structuredClone(initial);
  return {
    async read(fn) {
      return fn(structuredClone(current));
    },
    async write(fn) {
      const draft = structuredClone(current);
      const result = fn(draft);
      current = draft;
      // Detach the result so callers can't mutate stored state by reference.
      return structuredClone(result);
    },
    snapshot: () => structuredClone(current),
  };
}

export function createFileStore(filePath: string, seed: () => MockDb | Promise<MockDb>): MockStore {
  // One queue per store: operations run strictly one after another, so
  // read-modify-write cycles never interleave.
  let queue: Promise<unknown> = Promise.resolve();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  }

  async function save(db: MockDb) {
    await mkdir(dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(db, null, 2));
    await rename(tmp, filePath);
  }

  async function load(): Promise<MockDb> {
    try {
      return JSON.parse(await readFile(filePath, "utf8")) as MockDb;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const db = await seed();
      await save(db);
      return db;
    }
  }

  return {
    read: (fn) => enqueue(async () => fn(await load())),
    write: (fn) =>
      enqueue(async () => {
        const db = await load();
        const result = fn(db);
        await save(db);
        return result;
      }),
  };
}
