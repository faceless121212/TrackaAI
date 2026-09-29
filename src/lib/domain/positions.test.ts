import { describe, expect, it } from "vitest";
import { byPosition, indexInFullList, positionAt } from "./positions";

describe("positionAt", () => {
  const sorted = ["a0", "a1", "a2"];

  it("places items at the start, between neighbours and at the end", () => {
    expect(positionAt(sorted, 0) < "a0").toBe(true);
    const middle = positionAt(sorted, 1);
    expect(middle > "a0" && middle < "a1").toBe(true);
    expect(positionAt(sorted, 3) > "a2").toBe(true);
  });

  it("clamps out-of-range indexes and handles an empty list", () => {
    expect(positionAt(sorted, -5) < "a0").toBe(true);
    expect(positionAt(sorted, 99) > "a2").toBe(true);
    expect(typeof positionAt([], 0)).toBe("string");
  });
});

describe("byPosition", () => {
  it("sorts by code unit, not locale", () => {
    const items = [{ position: "a" }, { position: "Zz" }, { position: "a0" }];
    expect([...items].sort(byPosition).map((i) => i.position)).toEqual(["Zz", "a", "a0"]);
  });
});

describe("indexInFullList", () => {
  const full = ["t1", "t2", "t3", "t4"]; // column order, moved item excluded

  it("uses the visible neighbour before the drop point", () => {
    // Visible (filtered) list after the drop: t1, X, t4 → X goes right after t1.
    expect(indexInFullList(full, ["t1", "X", "t4"], "X")).toBe(1);
  });

  it("uses the neighbour after when dropped first", () => {
    expect(indexInFullList(full, ["X", "t3"], "X")).toBe(2);
  });

  it("appends when the visible list has no other items", () => {
    expect(indexInFullList(full, ["X"], "X")).toBe(4);
    expect(indexInFullList([], ["X"], "X")).toBe(0);
  });

  it("matches the visible index when nothing is filtered", () => {
    expect(indexInFullList(full, ["t1", "t2", "X", "t3", "t4"], "X")).toBe(2);
  });
});
