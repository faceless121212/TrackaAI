import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { KeyboardCoordinateGetter } from "@dnd-kit/core";

const HEADER = 40; // px: lands the card just under the column header, i.e. at its top

/**
 * Keyboard moves on the board: ArrowLeft/Right carry a card to the neighbouring
 * column (dnd-kit's sortable default never leaves the column); everything else,
 * including moving columns, uses the default.
 */
export function boardKeyboardCoordinates(columnIds: () => string[]): KeyboardCoordinateGetter {
  return (event, args) => {
    const { active, collisionRect, droppableRects } = args.context;
    const step = event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : 0;
    if (!step || active?.data.current?.type !== "task" || !collisionRect) {
      return sortableKeyboardCoordinates(event, args);
    }
    event.preventDefault();
    const ids = columnIds();
    const centerX = collisionRect.left + collisionRect.width / 2;
    const current = ids.findIndex((id) => {
      const rect = droppableRects.get(id);
      return rect && centerX >= rect.left && centerX < rect.right;
    });
    const target = current === -1 ? undefined : droppableRects.get(ids[current + step] ?? "");
    return target ? { x: target.left, y: target.top + HEADER } : undefined;
  };
}
