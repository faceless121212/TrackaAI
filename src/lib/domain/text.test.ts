import { describe, expect, it } from "vitest";
import { parseEmailList, slugify, suggestKeyPrefix } from "./text";

describe("slugify", () => {
  it.each([
    ["Acme Inc.", "acme-inc"],
    ["  Crème Brûlée  ", "creme-brulee"],
    ["Team 42!!", "team-42"],
    ["---", ""],
  ])("turns %j into %j", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it("caps the length at 40 without a trailing dash", () => {
    const slug = slugify(`${"a".repeat(39)} b`);
    expect(slug).toBe("a".repeat(39));
  });
});

describe("suggestKeyPrefix", () => {
  it.each([
    ["Engineering", "ENG"],
    ["Mobile App", "MA"],
    ["Design & Research", "DR"],
    ["Q3 launch plan", "QLP"],
    ["x", ""],
    ["", ""],
  ])("suggests %j → %j", (name, prefix) => {
    expect(suggestKeyPrefix(name)).toBe(prefix);
  });
});

describe("parseEmailList", () => {
  it("splits on commas, semicolons and whitespace, lowercases and dedupes", () => {
    expect(parseEmailList("Ann@Example.test, bob@example.test;\nann@example.test  ")).toEqual([
      "ann@example.test",
      "bob@example.test",
    ]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseEmailList("  \n ")).toEqual([]);
  });
});
