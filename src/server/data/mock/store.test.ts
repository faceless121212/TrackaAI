import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emptyDb } from "./db";
import { createFileStore, createMemoryStore } from "./store";

const user = (id: string) => ({
  id,
  email: `${id}@example.test`,
  name: id,
  avatarUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("createMemoryStore", () => {
  it("keeps writes and discards them when the writer throws", async () => {
    const store = createMemoryStore(emptyDb());
    await store.write((db) => db.users.push(user("u1")));
    await expect(
      store.write((db) => {
        db.users.push(user("u2"));
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await store.read((db) => db.users.map((u) => u.id))).toEqual(["u1"]);
  });
});

describe("createFileStore", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "tracka-store-"));
    file = join(dir, "nested", "db.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("seeds a missing file and persists it", async () => {
    const store = createFileStore(file, () => ({ ...emptyDb(), users: [user("seed")] }));
    expect(await store.read((db) => db.users.length)).toBe(1);
    const onDisk = JSON.parse(await readFile(file, "utf8"));
    expect(onDisk.users[0].id).toBe("seed");
  });

  it("serialises concurrent writes so none are lost", async () => {
    const store = createFileStore(file, emptyDb);
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => store.write((db) => db.users.push(user(`u${i}`)))),
    );
    const reopened = createFileStore(file, emptyDb);
    expect(await reopened.read((db) => db.users.length)).toBe(20);
  });
});
