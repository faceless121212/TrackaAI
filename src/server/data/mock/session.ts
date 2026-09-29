/** Where the mock backend keeps "who is signed in". Supabase Auth manages this itself. */
export type SessionStore = {
  get(): Promise<string | null>;
  set(userId: string): Promise<void>;
  clear(): Promise<void>;
};

/** Process-local session for unit tests and seeding. */
export function createMemorySession(): SessionStore {
  let userId: string | null = null;
  return {
    get: async () => userId,
    set: async (id) => {
      userId = id;
    },
    clear: async () => {
      userId = null;
    },
  };
}
