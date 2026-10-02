import { describe, expect, it } from "vitest";
import { resolveDataBackend } from "./backend";

describe("resolveDataBackend", () => {
  it("defaults to mock when unset or empty", () => {
    expect(resolveDataBackend(undefined)).toBe("mock");
    expect(resolveDataBackend("")).toBe("mock");
  });

  it("accepts known backends", () => {
    expect(resolveDataBackend("mock")).toBe("mock");
    expect(resolveDataBackend("supabase")).toBe("supabase");
  });

  it("throws on anything else", () => {
    expect(() => resolveDataBackend("postgres")).toThrow(/Unknown DATA_BACKEND "postgres"/);
  });

  it("refuses the mock backend on Vercel (read-only disk, development session key)", () => {
    expect(() => resolveDataBackend(undefined, true)).toThrow(/DATA_BACKEND=supabase/);
    expect(() => resolveDataBackend("mock", true)).toThrow(/DATA_BACKEND=supabase/);
    expect(resolveDataBackend("supabase", true)).toBe("supabase");
  });
});
