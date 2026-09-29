import { describe, expect, it } from "vitest";
import { formatTaskKey, parseTaskKey } from "./task-key";

describe("formatTaskKey", () => {
  it("joins prefix and number", () => {
    expect(formatTaskKey("ENG", 12)).toBe("ENG-12");
  });

  it("rejects non-positive or fractional numbers", () => {
    expect(() => formatTaskKey("ENG", 0)).toThrow(RangeError);
    expect(() => formatTaskKey("ENG", 1.5)).toThrow(RangeError);
  });
});

describe("parseTaskKey", () => {
  it("parses a valid key", () => {
    expect(parseTaskKey("ENG-12")).toEqual({ prefix: "ENG", number: 12 });
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(parseTaskKey(" eng-7 ")).toEqual({ prefix: "ENG", number: 7 });
  });

  it.each(["ENG", "ENG-", "ENG-0", "ENG-01", "E-1", "TOOLONG-1", "1NG-1"])("rejects %s", (key) => {
    expect(parseTaskKey(key)).toBeNull();
  });
});
