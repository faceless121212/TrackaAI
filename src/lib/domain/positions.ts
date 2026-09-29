import { generateKeyBetween } from "fractional-indexing";

// Fractional-index keys compare by code unit, never by locale.
export function byPosition(a: { position: string }, b: { position: string }): number {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}

/** A key that sorts at `index` within `sortedPositions` (clamped to the list). */
export function positionAt(sortedPositions: readonly string[], index: number): string {
  const i = Math.max(0, Math.min(index, sortedPositions.length));
  return generateKeyBetween(sortedPositions[i - 1] ?? null, sortedPositions[i] ?? null);
}

/**
 * Where a dropped item lands in the full, unfiltered column (`fullIds`, moved
 * item excluded), given the visible list after the drop (`visibleIds`, moved
 * item included). Anchors on the visible neighbour before the drop point, else
 * the one after, else appends.
 */
export function indexInFullList(fullIds: readonly string[], visibleIds: readonly string[], movedId: string): number {
  const at = visibleIds.indexOf(movedId);
  const before = visibleIds.slice(0, at).reverse().find((id) => fullIds.includes(id));
  if (before) return fullIds.indexOf(before) + 1;
  const after = visibleIds.slice(at + 1).find((id) => fullIds.includes(id));
  if (after) return fullIds.indexOf(after);
  return fullIds.length;
}
